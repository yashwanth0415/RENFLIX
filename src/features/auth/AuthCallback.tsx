import { useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        navigate("/login", { replace: true });
        return;
      }

      // Check if the user already has a profile
      supabase
        .from("profiles")
        .select("id")
        .eq("id", session.user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (profile) {
            // Existing user – go to dashboard
            navigate("/dashboard", { replace: true });
          } else {
            // New user – go to onboarding
            navigate("/onboarding", { replace: true });
          }
        });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-navy-400 text-sm">Completing sign in…</p>
      </div>
    </div>
  );
}