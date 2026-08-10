import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Home, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { ensureDbReady } from "../../lib/setupDb";

const ROLES = [
  { value: "OWNER",              label: "Property Owner",       desc: "I own properties and want to manage them",    icon: "🏠" },
  { value: "PROPERTY_MANAGER",   label: "Property Manager",     desc: "I manage properties professionally",           icon: "🏢" },
  { value: "HOSTEL_MANAGER",     label: "Hostel / PG Manager",  desc: "I run a hostel, PG or co-living space",        icon: "🛏️" },
  { value: "COMMUNITY_MANAGER",  label: "Community Manager",    desc: "I manage a residential society",               icon: "🏘️" },
  { value: "TECHNICIAN",         label: "Technician",           desc: "I handle maintenance and repairs",             icon: "🔧" },
  { value: "TENANT",             label: "Tenant",               desc: "I am renting a property",                     icon: "🔑" },
];

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [done, setDone] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [role, setRole] = useState("OWNER");
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [orgName, setOrgName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [setupReady, setSetupReady] = useState(false);

  const needsOrg = ["OWNER", "PROPERTY_MANAGER", "HOSTEL_MANAGER", "COMMUNITY_MANAGER"].includes(role);
  const totalSteps = needsOrg ? 3 : 2;

  useEffect(() => {
    // Ensure DB is ready before onboarding submits
    ensureDbReady().then((r) => setSetupReady(r.ok));
  }, []);

  function goNext() {
    setDirection("forward");
    setStep((s) => Math.min(s + 1, totalSteps) as Step);
  }
  function goBack() {
    setDirection("back");
    setStep((s) => Math.max(s - 1, 1) as Step);
  }

  async function handleFinish() {
    if (!user) return;
    if (!fullName.trim()) { setError("Please enter your full name."); return; }
    setError("");
    setSubmitting(true);

    try {
      // Ensure DB is set up
      if (!setupReady) {
        const r = await ensureDbReady();
        if (!r.ok) throw new Error("Database not ready: " + r.message);
      }

      let orgId: string | null = null;

      // Create org if needed
      if (needsOrg && orgName.trim()) {
        const { data: orgData, error: orgErr } = await supabase
          .from("organizations")
          .insert({ name: orgName.trim(), owner_id: user.id })
          .select()
          .single();

        if (orgErr) throw new Error(orgErr.message);
        orgId = orgData?.id || null;
      }

      // Upsert profile
      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          role,
          organization_id: orgId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (profileErr) throw new Error(profileErr.message);

      // Refresh the profile in auth context
      await refreshProfile();

      // Show success screen then redirect
      setDone(true);
      setSubmitting(false);
      setTimeout(() => navigate("/dashboard", { replace: true }), 1500);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setSubmitting(false);
      setDone(false);
    }
  }

  const animClass = direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left";

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at center, rgba(59,130,246,0.8) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg animate-pulse-glow">
            <Home size={20} className="text-white" />
          </div>
          <div>
            <div className="font-display text-xl font-extrabold gradient-text leading-none">RENFLIX</div>
            <div className="text-[9px] text-navy-500 font-mono uppercase tracking-widest">Property OS</div>
          </div>
        </div>

        {/* Step progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, ...(needsOrg ? [3] : [])].map((s) => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`h-1 rounded-full flex-1 transition-all duration-500 ${step >= s ? "bg-blue-500" : "bg-navy-700"}`} />
              {s === (needsOrg ? 3 : 2) ? null : (
                <div className={`w-2 h-2 rounded-full transition-all duration-300 ${step > s ? "bg-blue-500" : "bg-navy-700"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Role */}
        {step === 1 && (
          <div key="step1" className={animClass}>
            <h2 className="font-display text-2xl font-bold text-white text-center mb-1.5">
              What best describes you?
            </h2>
            <p className="text-navy-400 text-sm text-center mb-6">
              {"We'll personalize RENFLIX for your role"}
            </p>
            <div className="grid grid-cols-1 gap-2 mb-6 stagger-children">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 group relative overflow-hidden ${
                    role === r.value
                      ? "bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/10"
                      : "bg-navy-800 border-navy-700 hover:border-navy-600 hover:bg-navy-700/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{r.icon}</span>
                    <div className="flex-1">
                      <div className={`font-display font-semibold text-sm transition-colors ${role === r.value ? "text-white" : "text-navy-200"}`}>
                        {r.label}
                      </div>
                      <div className="text-xs text-navy-500 mt-0.5">{r.desc}</div>
                    </div>
                    {role === r.value && (
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 animate-scale-in">
                        <Check size={12} className="text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                  {role === r.value && (
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-transparent pointer-events-none" />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={goNext}
              className="btn-primary w-full py-3 rounded-xl text-base flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* Step 2: Profile details */}
        {step === 2 && !submitting && !done && (
          <div key="step2" className={animClass}>
            <h2 className="font-display text-2xl font-bold text-white text-center mb-1.5">
              Set up your profile
            </h2>
            <p className="text-navy-400 text-sm text-center mb-6">
              Almost there — just a few details to get started
            </p>

            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 mb-5 stagger-children">
              {/* Name */}
              <div className="flex flex-col gap-1 mb-4">
                <label className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider">Your full name</label>
                <input
                  autoFocus
                  className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-sm text-navy-100 placeholder-navy-600 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all"
                  placeholder="Rajan Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              {/* Phone */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider">
                  Phone number <span className="text-navy-600 normal-case font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-sm text-navy-100 placeholder-navy-600 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-sm text-red-400 mb-4 animate-fade-in-fast">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-navy-800 border border-navy-700 text-navy-300 hover:text-white hover:bg-navy-700 transition-all font-display font-semibold text-sm"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={needsOrg ? goNext : handleFinish}
                disabled={!fullName.trim()}
                className="btn-primary flex-1 py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
              >
                {needsOrg ? (<>Next <ArrowRight size={16} /></>) : (<>Get started <ArrowRight size={16} /></>)}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Organization (only if needed) */}
        {step === 3 && needsOrg && !submitting && !done && (
          <div key="step3" className={animClass}>
            <h2 className="font-display text-2xl font-bold text-white text-center mb-1.5">
              Name your organization
            </h2>
            <p className="text-navy-400 text-sm text-center mb-6">
              This is how your properties and data will be organized
            </p>

            <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 mb-5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider">
                  Organization / company name
                </label>
                <input
                  autoFocus
                  className="w-full bg-navy-900 border border-navy-600 rounded-xl px-4 py-3 text-sm text-navy-100 placeholder-navy-600 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent transition-all"
                  placeholder="e.g., Sharma Properties"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFinish()}
                />
                <p className="text-xs text-navy-600 mt-1.5">You can rename this later in Settings</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 text-sm text-red-400 mb-4 animate-fade-in-fast">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-navy-800 border border-navy-700 text-navy-300 hover:text-white hover:bg-navy-700 transition-all font-display font-semibold text-sm"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={handleFinish}
                className="btn-primary flex-1 py-3 rounded-xl text-sm flex items-center justify-center gap-2"
              >
                Get started <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Submitting state */}
        {submitting && (
          <div key="submitting" className="animate-fade-in flex flex-col items-center py-12 gap-6">
            <div className="relative w-20 h-20">
              <div className="w-20 h-20 rounded-full border-4 border-navy-700" />
              <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" />
            </div>
            <div className="text-center">
              <div className="font-display font-bold text-white text-lg">Setting up your account…</div>
              <div className="text-navy-500 text-sm mt-1">Creating your workspace on RENFLIX</div>
            </div>
          </div>
        )}

        {/* Success state — shown after submit completes */}
        {done && (
          <div key="success" className="animate-scale-in flex flex-col items-center py-12 gap-5">
            <div className="w-20 h-20 rounded-full bg-emerald-600/20 border-2 border-emerald-500 flex items-center justify-center">
              <Check size={36} className="text-emerald-400" strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <div className="font-display font-bold text-white text-2xl mb-1">
                {"You're all set" + (fullName ? ", " + fullName.split(" ")[0] : "") + "!"}
              </div>
              <div className="text-navy-400 text-sm">Taking you to your dashboard…</div>
            </div>
            <div className="w-40 h-1 bg-navy-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full progress-bar-fill" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
