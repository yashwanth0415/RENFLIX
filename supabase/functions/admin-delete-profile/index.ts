import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!url || !anonKey || !serviceRoleKey) {
      return json(
        { error: "Supabase Edge Function environment is incomplete." },
        500,
      );
    }

    if (!authHeader) {
      return json({ error: "Authorization header is missing." }, 401);
    }

    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } =
      await callerClient.auth.getUser();

    if (callerError || !caller) {
      return json(
        { error: callerError?.message || "Unauthorized." },
        401,
      );
    }

    const admin = createClient(url, serviceRoleKey);

    const { data: callerProfile, error: callerProfileError } = await admin
      .from("profiles")
      .select("id,role")
      .eq("id", caller.id)
      .maybeSingle();

    if (callerProfileError) {
      return json({ error: callerProfileError.message }, 500);
    }

    if (callerProfile?.role !== "ADMIN") {
      return json({ error: "Admin access required." }, 403);
    }

    const body = await req.json().catch(() => null);
    const requestedIds = Array.isArray(body?.profileIds)
      ? body.profileIds.map((id: unknown) => String(id).trim()).filter(Boolean)
      : body?.profileId
        ? [String(body.profileId).trim()]
        : [];

    const profileIds = Array.from(new Set(requestedIds));

    if (!profileIds.length) {
      return json({ error: "At least one profile ID is required." }, 400);
    }

    if (profileIds.includes(caller.id)) {
      return json(
        { error: "The currently signed-in admin profile cannot be deleted." },
        400,
      );
    }

    let deletedCount = 0;

    for (const profileId of profileIds) {
      const { data: target, error: targetError } = await admin
        .from("profiles")
        .select("id,email,full_name,role,organization_id")
        .eq("id", profileId)
        .maybeSingle();

      if (targetError) {
        return json({ error: targetError.message }, 500);
      }

      if (!target) {
        return json(
          { error: `Profile not found: ${profileId}` },
          404,
        );
      }

      /*
       * OWNER:
       * Delete organizations owned by the Auth user first.
       * organizations.owner_id -> auth.users(id) is ON DELETE CASCADE,
       * and organization-owned tables cascade from organizations.
       * This also removes properties, units, tenants, leases, payments,
       * maintenance, conversations/messages, notifications and public
       * property records before the Auth user is removed.
       */
      if (target.role === "OWNER") {
        const { data: ownedOrganizations, error: orgError } = await admin
          .from("organizations")
          .select("id")
          .eq("owner_id", profileId);

        if (orgError) {
          return json(
            { error: orgError.message, step: "owner_organizations" },
            500,
          );
        }

        for (const org of ownedOrganizations || []) {
          const { error: deleteOrgError } = await admin
            .from("organizations")
            .delete()
            .eq("id", org.id);

          if (deleteOrgError) {
            return json(
              {
                error: deleteOrgError.message,
                step: "owner_organization_delete",
                profileId,
              },
              500,
            );
          }
        }
      }

      /*
       * TENANT:
       * tenants.profile_id is ON DELETE SET NULL, but deleting the Auth
       * user should also remove the RENFLIX tenant record belonging to
       * that profile.
       */
      if (target.role === "TENANT") {
        const { error: tenantDeleteError } = await admin
          .from("tenants")
          .delete()
          .eq("profile_id", profileId);

        if (tenantDeleteError) {
          return json(
            { error: tenantDeleteError.message, step: "tenant_delete" },
            500,
          );
        }
      }

      /*
       * properties.created_by is NOT NULL and historically references
       * auth.users without ON DELETE CASCADE. For non-owner staff users,
       * transfer any properties they created to the organization owner so
       * the Auth user can be deleted safely without orphaning properties.
       */
      const { data: createdProperties, error: createdPropertiesError } =
        await admin
          .from("properties")
          .select("id,organization_id")
          .eq("created_by", profileId);

      if (createdPropertiesError) {
        return json(
          {
            error: createdPropertiesError.message,
            step: "property_creator_lookup",
            profileId,
          },
          500,
        );
      }

      for (const property of createdProperties || []) {
        const { data: organization, error: ownerLookupError } = await admin
          .from("organizations")
          .select("owner_id")
          .eq("id", property.organization_id)
          .maybeSingle();

        if (ownerLookupError) {
          return json(
            {
              error: ownerLookupError.message,
              step: "property_owner_lookup",
              profileId,
            },
            500,
          );
        }

        if (!organization?.owner_id || organization.owner_id === profileId) {
          /* Owner properties were already handled by organization deletion. */
          continue;
        }

        const { error: transferError } = await admin
          .from("properties")
          .update({ created_by: organization.owner_id })
          .eq("id", property.id);

        if (transferError) {
          return json(
            {
              error: transferError.message,
              step: "property_creator_transfer",
              profileId,
            },
            500,
          );
        }
      }

      /*
       * Finally permanently delete the Auth user. profiles.id cascades from
       * auth.users, client_accounts.profile_id cascades, memberships/messages
       * cascade, push subscriptions cascade, etc.
       */
      const { error: authDeleteError } = await admin.auth.admin.deleteUser(
        profileId,
        false,
      );

      if (authDeleteError) {
        return json(
          {
            error: authDeleteError.message,
            step: "auth_user_delete",
            profileId,
          },
          500,
        );
      }

      deletedCount += 1;
    }

    return json({
      success: true,
      deletedCount,
    });
  } catch (error) {
    console.error("admin-delete-profile failed:", error);

    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete profile.",
      },
      500,
    );
  }
});
