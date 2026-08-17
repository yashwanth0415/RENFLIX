import { supabase } from "./supabase";

const DB_READY_KEY = "renflix_db_ready_v4";

/**
 * Check whether the RENFLIX profiles table is available.
 *
 * Database schema should be created through Supabase migrations.
 * This helper only verifies that the application can access it.
 */
async function checkTablesExist(): Promise<{
  exists: boolean;
  errorCode?: string;
  message?: string;
}> {
  try {
    const { error } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (!error) {
      return {
        exists: true,
      };
    }

    if (
      error.code === "PGRST205" ||
      error.code === "42P01" ||
      error.message
        ?.toLowerCase()
        .includes("does not exist")
    ) {
      return {
        exists: false,
        errorCode: error.code,
        message: error.message,
      };
    }

    /*
     * An RLS/permission error does not mean that the table
     * is missing.
     *
     * The application should not try to create the database
     * in response to such an error.
     */
    return {
      exists: true,
      errorCode: error.code,
      message: error.message,
    };
  } catch (error) {
    return {
      exists: false,
      message:
        error instanceof Error
          ? error.message
          : "Unable to verify database.",
    };
  }
}

/**
 * Verify that the required RENFLIX database schema exists.
 *
 * IMPORTANT:
 * This function no longer calls the application's
 * /setup-db Edge Function.
 *
 * Database creation/update must happen through:
 *
 * supabase/migrations/*.sql
 */
export async function ensureDbReady(): Promise<{
  ok: boolean;
  message: string;
  needsRedeploy?: boolean;
}> {
  // ------------------------------------------------------------
  // Avoid repeatedly checking the database in the same session.
  // ------------------------------------------------------------

  if (
    sessionStorage.getItem(DB_READY_KEY) === "1"
  ) {
    return {
      ok: true,
      message: "Database ready",
    };
  }

  // ------------------------------------------------------------
  // Verify database access.
  // ------------------------------------------------------------

  const result =
    await checkTablesExist();

  // ------------------------------------------------------------
  // Database exists and can be accessed.
  // ------------------------------------------------------------

  if (result.exists) {
    sessionStorage.setItem(
      DB_READY_KEY,
      "1"
    );

    return {
      ok: true,
      message: "Database ready",
    };
  }

  // ------------------------------------------------------------
  // Database schema is missing.
  //
  // DO NOT attempt to create it from the browser.
  // ------------------------------------------------------------

  console.error(
    "RENFLIX database schema is not available.",
    result
  );

  return {
    ok: false,
    message:
      "RENFLIX database is not initialized. Apply the Supabase migrations before using the application.",
    needsRedeploy: false,
  };
}

/**
 * Clear the local database-ready cache.
 *
 * Useful during development after applying new migrations.
 */
export function clearDbReadyCache(): void {
  sessionStorage.removeItem(
    DB_READY_KEY
  );
}