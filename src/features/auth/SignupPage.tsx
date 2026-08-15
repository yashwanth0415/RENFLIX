import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { Home, Eye, EyeOff, ArrowRight, Check, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { ensureDbReady } from "../../lib/setupDb";

export default function SignupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Replace history entry if already authenticated - prevents back button to signup
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const passwordStrength = (() => {
    if (password.length === 0) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^a-zA-Z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = ["", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"][passwordStrength];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("All fields are required."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setError("");
    setSubmitting(true);

    await ensureDbReady();

    const { data, error: err } = await supabase.auth.signUp({ email, password });
    setSubmitting(false);

    if (err) {
      setError(err.message);
      return;
    }

    if (data.user) {
      setSuccess(true);
      setTimeout(() => navigate("/onboarding", { replace: true }), 1200);
    }
  }

  // Social OAuth signup – same as login, leads to onboarding if new
  async function signUpWithProvider(provider: "google" | "apple") {
    setError("");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        ...(provider === "google" && {
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        }),
      },
    });

    if (error) {
      setError(error.message);
    }
    // Redirect happens automatically
  }

  if (success) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="animate-scale-in text-center flex flex-col items-center gap-5">
          <div className="w-20 h-20 rounded-full bg-emerald-600/20 border-2 border-emerald-500 flex items-center justify-center">
            <Check size={36} className="text-emerald-400" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-xl font-bold text-white mb-1">Account created!</div>
            <div className="text-navy-400 text-sm">Setting up your profile…</div>
          </div>
          <div className="w-40 h-1 bg-navy-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full progress-bar-fill" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      {/* Back button */}
      <Link
        to="/"
        className="fixed top-6 left-6 z-50 flex items-center gap-2 text-sm text-navy-400 hover:text-white transition-colors bg-navy-900/80 backdrop-blur-sm rounded-full px-4 py-2 border border-white/10"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      {/* Centered split container */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-fade-in">
        {/* Left – hero (hidden on mobile) */}
        <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-blue-950 via-navy-900 to-navy-950 p-12">
          {/* ... same hero content as before ... */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, rgba(59,130,246,0.8) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-60 h-60 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-xl">
                <Home size={22} className="text-white" />
              </div>
              <div>
                <div className="font-display text-2xl font-extrabold gradient-text">
                  RENFLIX
                </div>
                <div className="text-[10px] text-navy-500 font-mono uppercase tracking-widest">
                  Property OS
                </div>
              </div>
            </div>

            <h1 className="font-display text-5xl font-extrabold text-white leading-[1.1] mb-5">
              Join the future of
              <br />
              <span className="gradient-text">property management</span>
            </h1>
            <p className="text-navy-400 text-lg max-w-sm leading-relaxed mb-12">
              Create your account and start managing properties smarter – no spreadsheets, no chaos.
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {[
                { label: "Properties managed", value: "10K+" },
                { label: "Rent collected", value: "₹50Cr+" },
                { label: "Happy tenants", value: "25K+" },
                { label: "Cities covered", value: "50+" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm"
                >
                  <div className="font-display text-xl font-bold text-blue-400">
                    {s.value}
                  </div>
                  <div className="text-xs text-navy-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right – signup form */}
        <div className="flex-1 lg:max-w-[440px] bg-navy-950 flex flex-col justify-center px-8 py-12">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Home size={18} className="text-white" />
            </div>
            <div className="font-display text-xl font-extrabold gradient-text">
              RENFLIX
            </div>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-white mb-1">
              Create your account
            </h2>
            <p className="text-navy-500 text-sm">
              Start managing properties in minutes
            </p>
          </div>

          {/* Social sign‑up buttons */}
          <div className="flex flex-col gap-3 mb-6">
            <button
              type="button"
              onClick={() => signUpWithProvider("google")}
              className="flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold py-3 rounded-xl text-sm hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </button>
            <button
              type="button"
              onClick={() => signUpWithProvider("apple")}
              className="flex items-center justify-center gap-3 bg-black text-white font-semibold py-3 rounded-xl text-sm hover:bg-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              Sign up with Apple
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-navy-600" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-navy-950 px-2 text-navy-500">or continue with email</span>
            </div>
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider">
                Email address
              </label>
              <input
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-navy-800/80 border border-navy-600 rounded-xl px-4 py-3 text-sm text-navy-100 placeholder-navy-600 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-navy-800/80 border border-navy-600 rounded-xl px-4 py-3 pr-11 text-sm text-navy-100 placeholder-navy-600 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy-500 hover:text-navy-300 transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="flex items-center gap-2 mt-1 animate-fade-in-fast">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          i <= passwordStrength ? strengthColor : "bg-navy-700"
                        }`}
                      />
                    ))}
                  </div>
                  <span
                    className={`text-[10px] font-mono font-semibold ${
                      ["", "text-red-400", "text-amber-400", "text-blue-400", "text-emerald-400"][
                        passwordStrength
                      ]
                    }`}
                  >
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-sm text-red-400 animate-fade-in-fast">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3.5 rounded-xl text-sm mt-1 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Creating account…
                </>
              ) : (
                <>
                  Create account <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-navy-600 mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}