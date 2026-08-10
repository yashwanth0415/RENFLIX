import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
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

  if (!loading && user) return <Navigate to="/dashboard" replace />;

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

      {/* Centered split container – like login page */}
      <div className="w-full max-w-5xl flex flex-col lg:flex-row rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-fade-in">
        {/* Left – hero (hidden on mobile) */}
        <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-blue-950 via-navy-900 to-navy-950 p-12">
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at center, rgba(59,130,246,0.8) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* Glow orbs */}
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

        {/* Right – signup form (centered on mobile) */}
        <div className="flex-1 lg:max-w-[440px] bg-navy-950 flex flex-col justify-center px-8 py-12">
          {/* Mobile logo (visible only on small screens) */}
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