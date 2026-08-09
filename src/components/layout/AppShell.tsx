import { useState } from "react";
import { Outlet, Navigate } from "react-router";
import { Menu, X, Bell } from "lucide-react";
import Sidebar from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { Skeleton } from "../ui";

export default function AppShell() {
  const { user, profile, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center animate-pulse-glow">
            <span className="text-white font-display font-bold text-lg">R</span>
          </div>
          <Skeleton className="w-32 h-2" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="flex h-screen bg-navy-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar profile={profile} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-50 flex w-72 animate-slide-in">
            <Sidebar profile={profile} mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-navy-900 border-b border-navy-800 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-navy-700 text-navy-300"
          >
            <Menu size={20} />
          </button>
          <div className="font-display font-extrabold gradient-text text-lg">RENFLIX</div>
          <button className="p-2 rounded-lg hover:bg-navy-700 text-navy-300 relative">
            <Bell size={20} />
          </button>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex items-center justify-end px-6 py-3 bg-navy-900 border-b border-navy-800 flex-shrink-0 gap-3">
          <button className="relative p-2 rounded-lg hover:bg-navy-700 text-navy-400 hover:text-navy-200 transition-colors">
            <Bell size={18} />
          </button>
          {profile && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {(profile.full_name || "U")[0].toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-semibold text-navy-200 font-display">
                {profile.full_name}
              </span>
            </div>
          )}
        </header>

        {/* Page outlet */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
