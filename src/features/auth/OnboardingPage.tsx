import { useState } from "react";
import { useNavigate } from "react-router";
import { Home } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Button, Input, Select } from "../../components/ui";
import type { UserRole } from "../../lib/types";

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: "OWNER", label: "Property Owner", desc: "I own properties and want to manage them" },
  { value: "PROPERTY_MANAGER", label: "Property Manager", desc: "I manage properties for owners" },
  { value: "HOSTEL_MANAGER", label: "Hostel / PG Manager", desc: "I run a hostel or paying guest facility" },
  { value: "COMMUNITY_MANAGER", label: "Community Manager", desc: "I manage a residential society or community" },
  { value: "TECHNICIAN", label: "Technician", desc: "I handle maintenance and repairs" },
  { value: "TENANT", label: "Tenant", desc: "I am renting a property" },
];

export default function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<UserRole>("OWNER");
  const [form, setForm] = useState({ full_name: "", phone: "", org_name: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleFinish() {
    setSubmitting(true);
    let orgId: string | null = null;

    if (form.org_name && ["OWNER", "PROPERTY_MANAGER", "HOSTEL_MANAGER", "COMMUNITY_MANAGER"].includes(role)) {
      const { data } = await supabase.from("organizations").insert({ name: form.org_name, owner_id: user!.id }).select().single();
      orgId = data?.id || null;
    }

    await supabase.from("profiles").upsert({
      id: user!.id,
      full_name: form.full_name,
      phone: form.phone || null,
      role,
      organization_id: orgId,
    });

    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <Home size={18} className="text-white" />
          </div>
          <div className="font-display text-2xl font-extrabold gradient-text">RENFLIX</div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          {[1, 2].map((s) => (
            <div key={s} className={`w-8 h-1.5 rounded-full transition-all ${step >= s ? "bg-blue-500" : "bg-navy-700"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="font-display text-2xl font-bold text-white text-center mb-1">What best describes you?</h2>
            <p className="text-navy-400 text-sm text-center mb-6">We'll personalize RENFLIX for your role</p>
            <div className="flex flex-col gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`text-left p-4 rounded-xl border transition-all ${role === r.value ? "bg-blue-600/15 border-blue-500 text-white" : "bg-navy-800 border-navy-700 text-navy-300 hover:border-navy-600"}`}
                >
                  <div className="font-display font-semibold text-sm">{r.label}</div>
                  <div className="text-xs text-navy-500 mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
            <Button size="lg" className="w-full mt-6" onClick={() => setStep(2)}>Continue</Button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="font-display text-2xl font-bold text-white text-center mb-1">Set up your profile</h2>
            <p className="text-navy-400 text-sm text-center mb-6">Almost there — just a few details</p>
            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 flex flex-col gap-4">
              <Input
                label="Your full name"
                placeholder="Rajan Sharma"
                value={form.full_name}
                onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))}
                required
              />
              <Input
                label="Phone number"
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              />
              {["OWNER", "PROPERTY_MANAGER", "HOSTEL_MANAGER", "COMMUNITY_MANAGER"].includes(role) && (
                <Input
                  label="Organization / company name"
                  placeholder="e.g., Sharma Properties"
                  value={form.org_name}
                  onChange={(e) => setForm(f => ({ ...f, org_name: e.target.value }))}
                  hint="This will be your organization on RENFLIX"
                />
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button
                  className="flex-1"
                  loading={submitting}
                  disabled={!form.full_name.trim()}
                  onClick={handleFinish}
                >
                  Get started →
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
