import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing sign in…");

  useEffect(() => {
    let isMounted = true;

    const handleAuth = async () => {
      try {
        setMessage("Checking your Google account…");

        // Give Supabase a moment to process the OAuth URL.
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error("No authenticated session found.");
        }

        const userId = session.user.id;

        console.log("Authenticated user:", session.user.email);
        console.log("User ID:", userId);

        setMessage("Checking your RENFLIX profile…");

        // Check if this user already has a profile.
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

        if (!isMounted) return;

        // Existing user
        if (profile) {
          console.log("Existing user → Dashboard");

          navigate("/dashboard", {
            replace: true,
          });

          return;
        }

        // New user
        console.log("New user → Onboarding");

        navigate("/onboarding", {
          replace: true,
        });
      } catch (error) {
        console.error("Auth callback error:", error);

        if (!isMounted) return;

        setMessage("Sign in failed. Redirecting to login…");

        setTimeout(() => {
          if (isMounted) {
            navigate("/login", {
              replace: true,
            });
          }
        }, 1500);
      }
    };

    handleAuth();

    return () => {
      isMounted = false;
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