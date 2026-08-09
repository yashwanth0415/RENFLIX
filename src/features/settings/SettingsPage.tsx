import { useState, useEffect } from "react";
import { Settings, User, Building2, Shield } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Button, Input, Select, Card, PageHeader, Toast } from "../../components/ui";
import type { UserRole } from "../../lib/types";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "OWNER", label: "Property Owner" },
  { value: "PROPERTY_MANAGER", label: "Property Manager" },
  { value: "TENANT", label: "Tenant" },
  { value: "HOSTEL_MANAGER", label: "Hostel / PG Manager" },
  { value: "COMMUNITY_MANAGER", label: "Community Manager" },
  { value: "TECHNICIAN", label: "Technician" },
];

export default function SettingsPage() {
  const { profile, user } = useAuth();
  const [tab, setTab] = useState<"profile" | "org" | "security">("profile");
  const [profileForm, setProfileForm] = useState({ full_name: "", phone: "" });
  const [orgForm, setOrgForm] = useState({ name: "" });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (profile) {
      setProfileForm({ full_name: profile.full_name || "", phone: profile.phone || "" });
    }
  }, [profile]);

  useEffect(() => {
    if (profile?.organization_id) {
      supabase.from("organizations").select("name").eq("id", profile.organization_id).single()
        .then(({ data }) => { if (data) setOrgForm({ name: data.name }); });
    }
  }, [profile]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("profiles").update({ full_name: profileForm.full_name, phone: profileForm.phone, updated_at: new Date().toISOString() }).eq("id", user!.id);
    if (error) setToast({ msg: error.message, type: "error" });
    else setToast({ msg: "Profile updated!", type: "success" });
    setSubmitting(false);
  }

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.organization_id) return;
    setSubmitting(true);
    const { error } = await supabase.from("organizations").update({ name: orgForm.name }).eq("id", profile.organization_id);
    if (error) setToast({ msg: error.message, type: "error" });
    else setToast({ msg: "Organization updated!", type: "success" });
    setSubmitting(false);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.password !== passwordForm.confirm) { setToast({ msg: "Passwords do not match", type: "error" }); return; }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
    if (error) setToast({ msg: error.message, type: "error" });
    else { setToast({ msg: "Password updated!", type: "success" }); setPasswordForm({ password: "", confirm: "" }); }
    setSubmitting(false);
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: <User size={15} /> },
    { id: "org", label: "Organization", icon: <Building2 size={15} /> },
    { id: "security", label: "Security", icon: <Shield size={15} /> },
  ];

  return (
    <div className="animate-fade-in max-w-2xl">
      <PageHeader title="Settings" subtitle="Manage your account and organization" />

      {/* Tabs */}
      <div className="flex gap-1 bg-navy-800 border border-navy-700 rounded-xl p-1 mb-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold font-display transition-all ${tab === t.id ? "bg-navy-700 text-white" : "text-navy-400 hover:text-navy-200"}`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <Card>
          <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2"><User size={18} /> Profile</h2>
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                <span className="text-xl font-bold text-white">{(profile?.full_name || "U")[0].toUpperCase()}</span>
              </div>
              <div>
                <div className="font-display font-semibold text-white">{profile?.full_name}</div>
                <div className="text-xs text-blue-400 font-mono">{profile?.role}</div>
                <div className="text-xs text-navy-500">{user?.email}</div>
              </div>
            </div>
            <Input label="Full name" value={profileForm.full_name} onChange={(e) => setProfileForm(f => ({ ...f, full_name: e.target.value }))} />
            <Input label="Phone" type="tel" value={profileForm.phone} onChange={(e) => setProfileForm(f => ({ ...f, phone: e.target.value }))} />
            <Button type="submit" loading={submitting} className="self-start">Save changes</Button>
          </form>
        </Card>
      )}

      {tab === "org" && (
        <Card>
          <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2"><Building2 size={18} /> Organization</h2>
          {!profile?.organization_id ? (
            <div className="text-sm text-navy-500 py-4 text-center">No organization linked to your account.</div>
          ) : (
            <form onSubmit={saveOrg} className="flex flex-col gap-4">
              <Input label="Organization name" value={orgForm.name} onChange={(e) => setOrgForm({ name: e.target.value })} />
              <Button type="submit" loading={submitting} className="self-start">Save</Button>
            </form>
          )}
        </Card>
      )}

      {tab === "security" && (
        <Card>
          <h2 className="font-display font-bold text-white mb-4 flex items-center gap-2"><Shield size={18} /> Security</h2>
          <form onSubmit={changePassword} className="flex flex-col gap-4">
            <Input label="New password" type="password" value={passwordForm.password} onChange={(e) => setPasswordForm(f => ({ ...f, password: e.target.value }))} hint="Minimum 6 characters" />
            <Input label="Confirm password" type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm(f => ({ ...f, confirm: e.target.value }))} />
            <Button type="submit" loading={submitting} className="self-start">Change password</Button>
          </form>
        </Card>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
