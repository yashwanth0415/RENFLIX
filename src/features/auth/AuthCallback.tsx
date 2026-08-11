import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Completing sign in…");

  useEffect(() => {
    let active = true;

    const handleCallback = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          throw new Error("No authentication session found.");
        }

        const userId = session.user.id;

        console.log("Google user:", session.user.email);
        console.log("Supabase user ID:", userId);

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

        if (!active) return;

        if (profile) {
          console.log("Existing account → Dashboard");

          navigate("/dashboard", {
            replace: true,
          });
        } else {
          console.log("New account → Onboarding");

          navigate("/onboarding", {
            replace: true,
          });
        }
      } catch (error) {
        console.error("OAuth callback error:", error);

        if (!active) return;

        setMessage("Sign in failed. Redirecting to login…");

        setTimeout(() => {
          if (active) {
            navigate("/login", {
              replace: true,
            });
          }
        }, 1500);
      }
    };

    handleCallback();

    return () => {
      active = false;
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