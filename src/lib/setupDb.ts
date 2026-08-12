import { projectId } from "../../utils/supabase/info";
import { supabase } from "./supabase";

const SERVER_BASE = `https://${projectId}.supabase.co/functions/v1/server`;
const SETUP_KEY = "renflix_db_ready_v3";

/** Returns true if the profiles table exists and is accessible */
async function checkTablesExist(): Promise<boolean> {
  const { error } = await supabase.from("profiles").select("id").limit(1);
  // PGRST205 = table not found, 42P01 = table doesn't exist
  if (error?.code === "PGRST205" || error?.message?.includes("does not exist")) return false;
  return true;
}

/** Call server to run migration SQL via service role */
async function runMigration(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${SERVER_BASE}/setup-db`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) return { ok: false, message: `Server error: ${res.status}` };
    const data = await res.json();
    return { ok: !!data.success, message: data.message || "Unknown" };
  } catch (err: any) {
    return { ok: false, message: `Cannot reach server: ${err.message}` };
  }
}

export async function ensureDbReady(): Promise<{ ok: boolean; message: string; needsRedeploy?: boolean }> {
  // Already verified this session
  if (sessionStorage.getItem(SETUP_KEY) === "1") return { ok: true, message: "Ready" };

  // First check if tables already exist
  const exists = await checkTablesExist();
  if (exists) {
    sessionStorage.setItem(SETUP_KEY, "1");
    return { ok: true, message: "Database ready" };
  }

  // Tables missing — try migration via server
  const result = await runMigration();

  if (result.ok) {
    // Verify again
    const verified = await checkTablesExist();
    if (verified) {
      sessionStorage.setItem(SETUP_KEY, "1");
      return { ok: true, message: "Database initialized ✓" };
    }
  }

  // Migration failed — likely server not redeployed yet
  return {
    ok: false,
    message: result.message,
    needsRedeploy: result.message.includes("Cannot reach") || result.message.includes("not found"),
  };
}
