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

const toAuthEmail = (username: string) =>
  `${username.toLowerCase()}@clients.renflix.app`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  let step = "starting";

  try {
    step = "reading environment";

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url) {
      return json({
        success: false,
        error: "SUPABASE_URL is missing.",
        step,
      });
    }

    if (!anonKey) {
      return json({
        success: false,
        error: "SUPABASE_ANON_KEY is missing.",
        step,
      });
    }

    if (!serviceKey) {
      return json({
        success: false,
        error: "SUPABASE_SERVICE_ROLE_KEY is missing.",
        step,
      });
    }

    step = "checking authorization";

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return json({
        success: false,
        error: "Authorization header is missing.",
        step,
      });
    }

    const admin = createClient(url, serviceKey);

    const callerClient = createClient(url, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user: caller },
      error: callerError,
    } = await callerClient.auth.getUser();

    if (callerError) {
      return json({
        success: false,
        error: callerError.message,
        step: "getting authenticated user",
      });
    }

    if (!caller) {
      return json({
        success: false,
        error: "Authenticated user not found.",
        step,
      });
    }

    step = "checking admin profile";

    const {
      data: callerProfile,
      error: callerProfileError,
    } = await admin
      .from("profiles")
      .select("id,email,role")
      .eq("id", caller.id)
      .maybeSingle();

    if (callerProfileError) {
      return json({
        success: false,
        error: callerProfileError.message,
        step,
        details: callerProfileError.details,
        hint: callerProfileError.hint,
      });
    }

    if (!callerProfile) {
      return json({
        success: false,
        error: "Your authenticated user has no profile row.",
        step,
        userId: caller.id,
      });
    }

    if (callerProfile.role !== "ADMIN") {
      return json({
        success: false,
        error: `Admin access required. Current role: ${callerProfile.role}`,
        step,
      });
    }

    step = "reading request body";

    let body: any;

    try {
      body = await req.json();
    } catch {
      return json({
        success: false,
        error: "Invalid JSON request body.",
        step,
      });
    }

    const username = String(body.username || "")
      .trim()
      .toLowerCase();

    const password = String(body.password || "");

    const propertyDisplayIds = Array.isArray(
      body.propertyDisplayIds
    )
      ? body.propertyDisplayIds
          .map((v: unknown) => String(v).trim())
          .filter(Boolean)
      : [];

    const displayName = String(
      body.displayName || username
    ).trim();

    if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
      return json({
        success: false,
        error:
          "Username must be 3–40 characters using letters, numbers, dot, dash or underscore.",
        step,
      });
    }

    if (password.length < 8) {
      return json({
        success: false,
        error: "Password must be at least 8 characters.",
        step,
      });
    }

    if (!propertyDisplayIds.length) {
      return json({
        success: false,
        error: "Add at least one property ID.",
        step,
      });
    }

    if (!displayName) {
      return json({
        success: false,
        error: "Display name is required.",
        step,
      });
    }

    step = "checking existing client username";

    const {
      data: existing,
      error: existingError,
    } = await admin
      .from("client_accounts")
      .select("id,username")
      .eq("username", username)
      .maybeSingle();

    if (existingError) {
      return json({
        success: false,
        error: existingError.message,
        step,
        details: existingError.details,
        hint: existingError.hint,
      });
    }

    if (existing) {
      return json({
        success: false,
        error: "That username already exists.",
        step,
      });
    }

    step = "checking property IDs";

    const {
      data: properties,
      error: propError,
    } = await admin
      .from("properties")
      .select("id,property_display_id,name,status")
      .in("property_display_id", propertyDisplayIds);

    if (propError) {
      return json({
        success: false,
        error: propError.message,
        step,
        details: propError.details,
        hint: propError.hint,
      });
    }

    const found = new Set(
      (properties || []).map(
        (p: any) => p.property_display_id
      )
    );

    const missing = propertyDisplayIds.filter(
      (id: string) => !found.has(id)
    );

    if (missing.length) {
      return json({
        success: false,
        error: `Property ID not found: ${missing.join(", ")}`,
        step,
      });
    }

    const inactive = (properties || [])
      .filter((p: any) => p.status !== "ACTIVE")
      .map((p: any) => p.property_display_id);

    if (inactive.length) {
      return json({
        success: false,
        error: `These properties must be ACTIVE before they can be hosted publicly: ${inactive.join(", ")}`,
        step,
      });
    }

    const ids = (properties || []).map(
      (p: any) => p.id
    );

    step = "checking property assignments";

    const {
      data: conflicts,
      error: conflictError,
    } = await admin
      .from("client_properties")
      .select(
        "property_id,client_id,properties(property_display_id)"
      )
      .in("property_id", ids);

    if (conflictError) {
      return json({
        success: false,
        error: conflictError.message,
        step,
        details: conflictError.details,
        hint: conflictError.hint,
      });
    }

    if (conflicts?.length) {
      const conflictIds = conflicts
        .map(
          (r: any) =>
            r.properties?.property_display_id
        )
        .filter(Boolean);

      return json({
        success: false,
        error: `These properties are already assigned to another client: ${conflictIds.join(", ")}`,
        step,
      });
    }

    step = "creating Supabase authentication user";

    const authEmail = toAuthEmail(username);

    const {
      data: authResult,
      error: authError,
    } = await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        client: true,
        display_name: displayName,
      },
    });

    if (authError) {
      return json({
        success: false,
        error: authError.message,
        step,
        details: authError.status
          ? `Auth status: ${authError.status}`
          : undefined,
      });
    }

    if (!authResult.user) {
      return json({
        success: false,
        error: "Supabase created no authentication user.",
        step,
      });
    }

    const userId = authResult.user.id;

    try {
      step = "creating client profile";

      const {
        error: profileError,
      } = await admin
        .from("profiles")
        .upsert(
          {
            id: userId,
            email: authEmail,
            full_name: displayName,
            role: "CLIENT",
          },
          {
            onConflict: "id",
          }
        );

      if (profileError) {
        throw new Error(
          `Profile creation failed: ${profileError.message}${
            profileError.details
              ? ` | ${profileError.details}`
              : ""
          }`
        );
      }

      step = "creating client account";

      const {
        data: account,
        error: accountError,
      } = await admin
        .from("client_accounts")
        .insert({
          profile_id: userId,
          username,
          display_name: displayName,
          created_by: caller.id,
        })
        .select("id")
        .single();

      if (accountError) {
        throw new Error(
          `Client account creation failed: ${accountError.message}${
            accountError.details
              ? ` | ${accountError.details}`
              : ""
          }`
        );
      }

      if (!account) {
        throw new Error(
          "Client account was not created."
        );
      }

      step = "assigning properties";

      const {
        error: assignmentError,
      } = await admin
        .from("client_properties")
        .insert(
          ids.map((propertyId: string) => ({
            client_id: account.id,
            property_id: propertyId,
          }))
        );

      if (assignmentError) {
        throw new Error(
          `Property assignment failed: ${assignmentError.message}${
            assignmentError.details
              ? ` | ${assignmentError.details}`
              : ""
          }`
        );
      }

      step = "publishing properties";

      for (const propertyId of ids) {
        const {
          error: publicConfigError,
        } = await admin
          .from("public_property_configs")
          .upsert(
            {
              property_id: propertyId,
              is_public: true,
              updated_at:
                new Date().toISOString(),
            },
            {
              onConflict: "property_id",
            }
          );

        if (publicConfigError) {
          throw new Error(
            `Public property configuration failed for ${propertyId}: ${publicConfigError.message}${
              publicConfigError.details
                ? ` | ${publicConfigError.details}`
                : ""
            }`
          );
        }
      }

      return json({
        success: true,
        clientId: account.id,
        username,
        propertyDisplayIds,
      });
    } catch (error) {
      step = "rolling back client authentication";

      await admin.auth.admin.deleteUser(userId);

      throw error;
    }
  } catch (error) {
    console.error("admin-create-client failed:", {
      step,
      error,
    });

    return json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to create client.",
      step,
    });
  }
});