import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Home, Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button, Input } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (err) {
      setError(err.message);
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-blue-950 via-navy-900 to-navy-950">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at center, rgba(59,130,246,0.6) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <Home size={20} className="text-white" />
            </div>
            <div>
              <div className="font-display text-2xl font-extrabold gradient-text">RENFLIX</div>
              <div className="text-[10px] text-navy-500 font-mono uppercase tracking-widest">Property OS</div>
            </div>
          </div>
          <h1 className="font-display text-4xl font-extrabold text-white leading-tight mb-4">
            Every Property.<br />One Powerful<br />Platform.
          </h1>
          <p className="text-navy-400 text-lg max-w-sm leading-relaxed">
            Manage. Rent. Maintain. Grow. The complete property operating system for modern landlords.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-4 max-w-sm">
            {[
              { label: "Properties managed", value: "10K+" },
              { label: "Rent collected", value: "₹50Cr+" },
              { label: "Happy tenants", value: "25K+" },
              { label: "Cities", value: "50+" },
            ].map((s) => (
              <div key={s.label} className="bg-navy-800/50 border border-navy-700 rounded-xl p-4">
                <div className="font-display text-xl font-bold text-blue-400">{s.value}</div>
                <div className="text-xs text-navy-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 lg:max-w-md flex flex-col justify-center px-8 py-12">
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Home size={16} className="text-white" />
          </div>
          <div className="font-display text-xl font-extrabold gradient-text">RENFLIX</div>
        </div>

        <div className="mb-8">
          <h2 className="font-display text-2xl font-bold text-white mb-1">Welcome back</h2>
          <p className="text-navy-400 text-sm">Sign in to your property dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <div className="relative">
            <Input
              label="Password"
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-[30px] text-navy-400 hover:text-navy-200"
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <Button type="submit" size="lg" loading={submitting} className="mt-2">
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-navy-500 mt-6">
          {"Don't have an account? "}
          <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-semibold">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
