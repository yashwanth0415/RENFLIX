import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  const [message, setMessage] = useState("Completing sign in…");

  const handledRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const goToNextPage = async () => {
      // Prevent the callback from running twice
      if (handledRef.current) return;

      handledRef.current = true;

      try {
        setMessage("Checking your account…");

        /*
         * Supabase automatically processes the OAuth tokens
         * from the URL hash and creates the browser session.
         */
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error("No Supabase session found.");
        }

        const userId = session.user.id;

        console.log("Authenticated Google user:", session.user.email);
        console.log("Supabase user ID:", userId);

        setMessage("Checking your RENFLIX account…");

        /*
         * Check whether this authenticated user already
         * has a profile in the profiles table.
         */
        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", userId)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!mounted) return;

        /*
         * EXISTING USER
         *
         * profiles.id exists and matches auth.users.id
         */
        if (profile) {
          console.log("Existing RENFLIX user → Dashboard");

          navigate("/dashboard", {
            replace: true,
          });

          return;
        }

        /*
         * NEW USER
         *
         * Google authentication succeeded, but
         * there is no profile yet.
         */
        console.log("New RENFLIX user → Onboarding");

        navigate("/onboarding", {
          replace: true,
        });
      } catch (error) {
        console.error("RENFLIX authentication error:", error);

        if (!mounted) return;

        handledRef.current = false;

        setMessage("Sign in could not be completed.");

        setTimeout(() => {
          if (mounted) {
            navigate("/login", {
              replace: true,
            });
          }
        }, 1500);
      }
    };

    /*
     * Listen for the Supabase authentication event.
     *
     * This is useful for OAuth because the session may be
     * established while the callback page is loading.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Supabase auth event:", event);

      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        session
      ) {
        goToNextPage();
      }
    });

    /*
     * Also check the current session immediately.
     *
     * This handles cases where Supabase has already processed
     * the OAuth hash before the listener is attached.
     */
    goToNextPage();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-4" />

        <p className="text-navy-400 text-sm">
          {message}
        </p>
      </div>
    </div>
  );
}