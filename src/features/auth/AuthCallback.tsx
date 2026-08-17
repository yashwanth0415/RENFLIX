import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function handleAuthCallback() {
      try {
        // ------------------------------------------------------
        // Get the session created by Supabase OAuth.
        // ------------------------------------------------------

        const {
          data: {
            session,
          },
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(
            sessionError.message
          );
        }

        if (!session?.user) {
          throw new Error(
            "No authenticated session was returned."
          );
        }

        const user = session.user;

        // ------------------------------------------------------
        // Load RENFLIX profile.
        //
        // A new OAuth account may not have a profile yet.
        // ------------------------------------------------------

        const {
          data: profile,
          error: profileError,
        } =
          await supabase
            .from("profiles")
            .select(
              "id,email,phone,full_name,role,organization_id"
            )
            .eq(
              "id",
              user.id
            )
            .maybeSingle();

        if (profileError) {
          throw new Error(
            profileError.message
          );
        }

        // ------------------------------------------------------
        // Determine the values available from Supabase Auth.
        // ------------------------------------------------------

        const email =
          (
            profile?.email ||
            user.email ||
            ""
          )
            .trim()
            .toLowerCase();

        const phone =
          profile?.phone ||
          user.phone ||
          "";

        const fullName =
          profile?.full_name ||
          "";

        // ------------------------------------------------------
        // RENFLIX considers the account complete only when all
        // required profile information exists.
        // ------------------------------------------------------

        const hasEmail =
          email.length > 0;

        const hasPhone =
          phone.length > 0;

        const hasFullName =
          fullName.trim().length >
          0;

        const isComplete =
          Boolean(
            profile &&
              hasEmail &&
              hasPhone &&
              hasFullName
          );

        // ------------------------------------------------------
        // Incomplete/new user
        //
        // Send to onboarding where the missing email/phone
        // information is collected.
        // ------------------------------------------------------

        if (!isComplete) {
          navigate(
            "/onboarding",
            {
              replace: true,
            }
          );

          return;
        }

        // ------------------------------------------------------
        // Fully configured account
        // ------------------------------------------------------

        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      } catch (err) {
        console.error(
          "RENFLIX auth callback error:",
          err
        );

        if (!mounted) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to complete authentication."
        );

        setTimeout(() => {
          if (mounted) {
            navigate(
              "/login",
              {
                replace: true,
              }
            );
          }
        }, 2000);
      }
    }

    handleAuthCallback();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  // ------------------------------------------------------------
  // Error
  // ------------------------------------------------------------

  if (error) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
            <span className="text-red-400 text-xl font-bold">
              !
            </span>
          </div>

          <h1 className="font-display text-xl font-bold text-white mb-2">
            Authentication failed
          </h1>

          <p className="text-sm text-navy-400">
            {error}
          </p>

          <p className="text-xs text-navy-600 mt-4">
            Returning to sign in…
          </p>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />

        <p className="text-sm text-navy-400">
          Completing sign in…
        </p>
      </div>
    </div>
  );
}