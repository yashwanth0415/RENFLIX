import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service) return json({ error: "Supabase environment variables are not configured." }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await caller.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(url, service);
    const { data: owner, error: ownerError } = await admin
      .from("profiles")
      .select("id,role,organization_id")
      .eq("id", user.id)
      .maybeSingle();
    if (ownerError) throw ownerError;

    const allowed = ["OWNER", "PROPERTY_MANAGER", "HOSTEL_MANAGER", "ADMIN"];
    if (!owner || !allowed.includes(owner.role)) return json({ error: "Only property staff can remove tenants." }, 403);
    if (!owner.organization_id && owner.role !== "ADMIN") return json({ error: "No organization found." }, 400);

    const body = await req.json();
    const ids = Array.isArray(body?.tenant_ids) ? body.tenant_ids.filter((x: unknown) => typeof x === "string") : [];
    if (!ids.length) return json({ error: "No tenants selected." }, 400);

    let query = admin.from("tenants").select("id,profile_id,unit_id,organization_id").in("id", ids);
    if (owner.role !== "ADMIN") query = query.eq("organization_id", owner.organization_id!);
    const { data: tenants, error: tenantError } = await query;
    if (tenantError) throw tenantError;
    if (!tenants?.length) return json({ error: "No matching tenants found." }, 404);

    let deletedCount = 0;

    for (const tenant of tenants) {
      if (tenant.unit_id) {
        const { error: unitError } = await admin.from("units")
          .update({ status: "AVAILABLE", updated_at: new Date().toISOString() })
          .eq("id", tenant.unit_id);
        if (unitError) console.error("Unit release failed", tenant.unit_id, unitError);
      }

      // Remove the tenancy record first. Historical payments remain intact.
      const { error: deleteTenantError } = await admin.from("tenants").delete().eq("id", tenant.id);
      if (deleteTenantError) throw deleteTenantError;

      // auth.users -> profiles has ON DELETE CASCADE in the RENFLIX schema.
      // Deleting the Auth user therefore clears its profile as well.
      if (tenant.profile_id) {
        const { error: authDeleteError } = await admin.auth.admin.deleteUser(tenant.profile_id);
        if (authDeleteError) {
          // Continue to explicit profile cleanup even if the Auth user is already gone.
          console.error("Auth user deletion failed", tenant.profile_id, authDeleteError);
        }

        const { error: profileDeleteError } = await admin
          .from("profiles")
          .delete()
          .eq("id", tenant.profile_id);
        if (profileDeleteError) {
          throw profileDeleteError;
        }
      }

      deletedCount++;
    }

    return json({
      success: true,
      deleted_count: deletedCount,
      message: "Tenant accounts and profiles removed. Historical payment records were retained.",
    });
  } catch (e) {
    console.error("Tenant deletion error:", e);
    return json({ error: e instanceof Error ? e.message : "Tenant deletion failed." }, 500);
  }
});
