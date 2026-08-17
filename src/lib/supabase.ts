import { createClient } from "@supabase/supabase-js";

import {
  projectId,
  publicAnonKey,
} from "../../utils/supabase/info";

/**
 * RENFLIX Supabase client.
 *
 * Authentication is handled by Supabase Auth using:
 *
 *   Email + Password
 *        OR
 *   Phone + Password
 *
 * OTP/verification is intentionally NOT initiated from the
 * frontend authentication flow.
 */

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      /**
       * Keep the authenticated session in browser storage.
       */
      persistSession: true,

      /**
       * Automatically refresh the Supabase access token.
       */
      autoRefreshToken: true,

      /**
       * Detect sessions from OAuth redirects.
       */
      detectSessionInUrl: true,
    },
  }
);

export type SupabaseClient =
  typeof supabase;