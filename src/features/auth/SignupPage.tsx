import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Home } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button, Input, Select } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../lib/types";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "OWNER", label: "Property Owner" },
  { value: "PROPERTY_MANAGER", label: "Property Manager" },
  { value: "TENANT", label: "Tenant" },
  { value: "HOSTEL_MANAGER", label: "Hostel / PG Manager" },
  { value: "COMMUNITY_MANAGER", label: "Community Manager" },
  { value: "TECHNICIAN", label: "Technician / Maintenance" },
];

export default function SignupPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    role: "OWNER" as UserRole,
    orgName: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { data, error: signupErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } },
    });

    if (signupErr) {
      setError(signupErr.message);
      setSubmitting(false);
      return;
    }

    if (data.user) {
      // Create organization
      let orgId: string | null = null;
      if (form.orgName && (form.role === "OWNER" || form.role === "PROPERTY_MANAGER")) {
        const { data: orgData } = await supabase
          .from("organizations")
          .insert({ name: form.orgName, owner_id: data.user.id })
          .select()
          .single();
        orgId = orgData?.id || null;
      }

      // Upsert profile
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: form.fullName,
        phone: form.phone,
        role: form.role,
        organization_id: orgId,
      });

      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    }
    setSubmitting(false);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="font-display text-xl font-bold text-white mb-2">Account created!</h2>
          <p className="text-navy-400 text-sm">Taking you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Home size={16} className="text-white" />
          </div>
          <div className="font-display text-xl font-extrabold gradient-text">RENFLIX</div>
        </div>

        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-7 animate-fade-in">
          <h2 className="font-display text-xl font-bold text-white mb-1">Create your account</h2>
          <p className="text-navy-400 text-sm mb-5">Start managing properties in minutes</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Full name"
              placeholder="Rajan Sharma"
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
            />
            <Select
              label="I am a"
              value={form.role}
              onChange={(e) => set("role", e.target.value)}
              options={ROLES}
            />
            {(form.role === "OWNER" || form.role === "PROPERTY_MANAGER") && (
              <Input
                label="Organization / Company name"
                placeholder="e.g., Sharma Properties"
                value={form.orgName}
                onChange={(e) => set("orgName", e.target.value)}
              />
            )}
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-sm text-red-400">
                {error}
              </div>
            )}
            <Button type="submit" size="lg" loading={submitting} className="mt-1">
              Create account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-navy-500 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
