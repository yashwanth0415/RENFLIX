import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!; const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!; const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(url, serviceKey); const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await callerClient.auth.getUser(); if (!caller) return json({ error: "Unauthorized" }, 401);
    const { data: callerProfile } = await admin.from("profiles").select("role").eq("id", caller.id).maybeSingle(); if (callerProfile?.role !== "ADMIN") return json({ error: "Admin access required." }, 403);
    const body = await req.json(); const clientId = String(body.clientId || ""); const password = String(body.password || ""); const propertyDisplayIds = Array.isArray(body.propertyDisplayIds) ? body.propertyDisplayIds.map((v: unknown) => String(v).trim()).filter(Boolean) : []; const active = body.active !== false;
    if (!clientId) return json({ error: "Client is required." }, 400); if (!propertyDisplayIds.length) return json({ error: "Add at least one property ID." }, 400); if (password && password.length < 8) return json({ error: "Password must be at least 8 characters." }, 400);
    const { data: account } = await admin.from("client_accounts").select("id,profile_id").eq("id", clientId).maybeSingle(); if (!account) return json({ error: "Client not found." }, 404);
    const { data: properties, error: propError } = await admin.from("properties").select("id,property_display_id,status").in("property_display_id", propertyDisplayIds); if (propError) throw propError;
    const found = new Set((properties || []).map((p: any) => p.property_display_id)); const missing = propertyDisplayIds.filter((id: string) => !found.has(id)); if (missing.length) return json({ error: `Property ID not found: ${missing.join(", ")}` }, 400);
    const inactiveIds = (properties || []).filter((p: any) => p.status !== "ACTIVE").map((p: any) => p.property_display_id); if (inactiveIds.length) return json({ error: `These properties must be ACTIVE before they can be hosted publicly: ${inactiveIds.join(", ")}` }, 400);
    const ids = (properties || []).map((p: any) => p.id); const { data: conflicts } = await admin.from("client_properties").select("client_id,properties(property_display_id)").in("property_id", ids).neq("client_id", clientId); if (conflicts?.length) return json({ error: `These properties are already assigned to another client: ${conflicts.map((r: any) => r.properties?.property_display_id).filter(Boolean).join(", ")}` }, 409);
    const { data: oldAssignments } = await admin.from("client_properties").select("property_id").eq("client_id", clientId);
    await admin.from("client_properties").delete().eq("client_id", clientId); const { error: assignError } = await admin.from("client_properties").insert(ids.map((propertyId: string) => ({ client_id: clientId, property_id: propertyId }))); if (assignError) throw assignError;
    const { error: updateError } = await admin.from("client_accounts").update({ active, updated_at: new Date().toISOString() }).eq("id", clientId); if (updateError) throw updateError;
    const currentSet = new Set(ids);
    for (const old of oldAssignments || []) { if (!currentSet.has(old.property_id)) await admin.from("public_property_configs").update({ is_public: false, updated_at: new Date().toISOString() }).eq("property_id", old.property_id); }
    for (const propertyId of ids) await admin.from("public_property_configs").upsert({ property_id: propertyId, is_public: active, updated_at: new Date().toISOString() }, { onConflict: "property_id" });
    if (password) { const { error: passwordError } = await admin.auth.admin.updateUserById(account.profile_id, { password }); if (passwordError) throw passwordError; }
    return json({ success: true });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Unable to update client." }, 500); }
});
