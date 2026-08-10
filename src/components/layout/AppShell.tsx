import { useState, useEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router";
import { Menu, Bell, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import Sidebar from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { ensureDbReady } from "../../lib/setupDb";

type DbStatus = "checking" | "ready" | "error" | "needs-redeploy";

export default function AppShell() {
  const { user, profile, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatus>("checking");
  const [dbMsg, setDbMsg] = useState("");
  const [retrying, setRetrying] = useState(false);
  const location = useLocation();

  useEffect(() => {
    runSetup();
  }, []);

  async function runSetup() {
    const res = await ensureDbReady();
    if (res.ok) {
      setDbStatus("ready");
    } else if (res.needsRedeploy) {
      setDbStatus("needs-redeploy");
      setDbMsg(res.message);
    } else {
      setDbStatus("error");
      setDbMsg(res.message);
    }
  }

  async function retry() {
    setRetrying(true);
    setDbStatus("checking");
    sessionStorage.removeItem("renflix_db_ready_v3");
    await runSetup();
    setRetrying(false);
  }

  // Show splash while auth or DB is loading
  if (loading || dbStatus === "checking") {
    return <SplashScreen />;
  }

  if (!user) return <Navigate to="/login" replace />;

  // DB not ready — show actionable error
  if (dbStatus === "needs-redeploy" || dbStatus === "error") {
    return <DbErrorScreen status={dbStatus} message={dbMsg} onRetry={retry} retrying={retrying} />;
  }

  // Profile missing or incomplete → onboarding
  if (!profile || !profile.full_name) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="flex h-screen bg-navy-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar profile={profile} />
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-navy-950/85 backdrop-blur-sm modal-backdrop"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 flex w-72 animate-slide-in-left">
            <Sidebar profile={profile} mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-navy-900 border-b border-navy-800 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-navy-700 text-navy-300 transition-all active:scale-90"
          >
            <Menu size={20} />
          </button>
          <div className="font-display font-extrabold gradient-text text-lg">RENFLIX</div>
          <button className="p-2 rounded-lg hover:bg-navy-700 text-navy-300 relative transition-all active:scale-90">
            <Bell size={20} />
          </button>
        </header>

        {/* Desktop topbar */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-navy-900 border-b border-navy-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse" />
            <span className="text-xs text-navy-500 font-mono">Live · Supabase connected</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg hover:bg-navy-700 text-navy-400 hover:text-navy-200 transition-all active:scale-90 group">
              <Bell size={18} />
            </button>
            {profile && (
              <div className="flex items-center gap-2.5 pl-3 border-l border-navy-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg">
                  <span className="text-xs font-bold text-white">
                    {(profile.full_name || "U")[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-navy-200 font-display leading-none">
                    {profile.full_name}
                  </div>
                  <div className="text-[10px] text-blue-400 font-mono">{profile.role}</div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Outlet — key on pathname triggers page transition */}
        <main key={location.pathname} className="flex-1 overflow-y-auto page-enter">
          <div className="max-w-[1600px] mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Splash Screen ─────────────────────────────────────────────────────────────
function SplashScreen() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl">
            <span className="text-white font-display font-extrabold text-2xl">R</span>
          </div>
          {/* Spinning ring */}
          <div className="absolute -inset-2 rounded-[20px] border-2 border-transparent border-t-blue-500 animate-spin" />
        </div>
        <div className="text-center">
          <div className="font-display font-extrabold gradient-text text-2xl mb-1">RENFLIX</div>
          <div className="text-xs text-navy-600 font-mono">Connecting to Supabase…</div>
        </div>
        <div className="w-48 h-0.5 bg-navy-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-600 to-violet-500 rounded-full progress-bar-fill" />
        </div>
      </div>
    </div>
  );
}

// ── DB Error Screen ───────────────────────────────────────────────────────────
function DbErrorScreen({
  status,
  message,
  onRetry,
  retrying,
}: {
  status: DbStatus;
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  const isRedeploy = status === "needs-redeploy";

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full animate-scale-in">
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-8 text-center">
          <div className={`w-14 h-14 rounded-2xl ${isRedeploy ? "bg-amber-500/15 border border-amber-500/30" : "bg-red-500/15 border border-red-500/30"} flex items-center justify-center mx-auto mb-5`}>
            <AlertCircle size={28} className={isRedeploy ? "text-amber-400" : "text-red-400"} />
          </div>

          <h2 className="font-display text-xl font-bold text-white mb-2">
            {isRedeploy ? "Database setup required" : "Connection error"}
          </h2>

          <p className="text-navy-400 text-sm mb-5 leading-relaxed">
            {isRedeploy
              ? "The RENFLIX database tables need to be initialized. The Edge Function needs to be deployed from the Make settings panel."
              : message || "Could not connect to the database. Please try again."}
          </p>

          {isRedeploy && (
            <div className="bg-navy-900 rounded-xl p-4 text-left mb-5 border border-navy-700">
              <div className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider mb-2">Steps to fix:</div>
              <ol className="text-xs text-navy-400 space-y-1.5 list-decimal list-inside">
                <li>Open <span className="text-blue-400">Figma Make → Settings</span></li>
                <li>Find the <span className="text-white font-medium">Supabase Edge Function</span> section</li>
                <li>Click <span className="text-white font-medium">Deploy / Redeploy</span></li>
                <li>Return here and click <span className="text-white font-medium">Retry</span></li>
              </ol>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onRetry}
              disabled={retrying}
              className="btn-primary flex-1 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={15} className={retrying ? "animate-spin" : ""} />
              {retrying ? "Retrying…" : "Retry connection"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
