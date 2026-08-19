import { NavLink, useNavigate } from "react-router";
import { useState } from "react";
import {
  LayoutDashboard, Building2, Users, CreditCard, Wrench, MessageSquare, Megaphone,
  Settings, LogOut, Cpu, Home, DoorOpen, Globe, FileText, BarChart3,
  ChevronDown, ChevronRight
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../lib/types";

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles?: string[];
  beta?: boolean;
}

const MAIN_OWNER: NavItem[] = [
  { to: "/dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { to: "/properties", icon: <Building2 size={18} />, label: "Properties" },
  { to: "/units", icon: <DoorOpen size={18} />, label: "Units" },
  { to: "/tenants", icon: <Users size={18} />, label: "Tenants" },
  { to: "/payments", icon: <CreditCard size={18} />, label: "Payments" },
  { to: "/maintenance", icon: <Wrench size={18} />, label: "Maintenance" },
   { to: "/community", icon: <Globe size={18} />, label: "Community", beta: true }
];

const MORE_ITEMS: NavItem[] = [
  // { to: "/messages", icon: <MessageSquare size={18} />, label: "Messages", beta: true },
  // { to: "/leases", icon: <FileText size={18} />, label: "Leases", beta: true },
  { to: "/analytics", icon: <BarChart3 size={18} />, label: "Analytics", beta: true },
  { to: "/intelligence", icon: <Cpu size={18} />, label: "Intelligence", beta: true },
];

const TENANT_ITEMS: NavItem[] = [
  { to: "/dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { to: "/payments", icon: <CreditCard size={18} />, label: "Payments" },
  { to: "/maintenance", icon: <Wrench size={18} />, label: "Maintenance" },
  { to: "/messages", icon: <MessageSquare size={18} />, label: "Messages" },
  { to: "/announcements", icon: <Megaphone size={18} />, label: "Announcements" },
];

const TENANT_MORE_ITEMS: NavItem[] = [
  { to: "/analytics", icon: <BarChart3 size={18} />, label: "Analytics", beta: true },
  { to: "/intelligence", icon: <Cpu size={18} />, label: "Intelligence", beta: true },
];

function LinkItem({ item, onClose }: { item: NavItem; onClose?: () => void }) {
  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      className={({ isActive }) => `sidebar-link relative ${isActive ? "active" : ""}`}
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>
      {item.beta && (
        <span className="absolute top-1 right-2 text-[7px] leading-none px-1 py-0.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-300 font-bold uppercase">
          Beta
        </span>
      )}
    </NavLink>
  );
}

interface SidebarProps {
  profile: Profile | null;
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ profile, mobile, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  const role = profile?.role;
  const isOwnerPortal = ["OWNER", "PROPERTY_MANAGER"].includes(role || "");
  const mainItems = role === "TENANT"
    ? TENANT_ITEMS
    : isOwnerPortal
      ? MAIN_OWNER
      : [
          { to: "/dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
          { to: "/properties", icon: <Building2 size={18} />, label: "Properties" },
          { to: "/units", icon: <DoorOpen size={18} />, label: "Units" },
          { to: "/tenants", icon: <Users size={18} />, label: "Tenants" },
          { to: "/payments", icon: <CreditCard size={18} />, label: "Payments" },
          { to: "/maintenance", icon: <Wrench size={18} />, label: "Maintenance" },
        ];

  return (
    <aside className={`flex flex-col bg-navy-900 border-r border-navy-800 ${mobile ? "w-full h-[100dvh]" : "w-60 h-full"} overflow-hidden`}>
      <div className={`flex items-center justify-between px-5 py-5 border-b border-navy-800 flex-shrink-0 bg-navy-900 ${mobile ? "sticky top-0 z-20" : ""}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          {mobile ? (
            <img
              src="/logo.png"
              alt="RENFLIX"
              className="w-9 h-9 rounded-lg object-contain flex-shrink-0 shadow-lg"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
              <Home size={16} className="text-white" />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-display text-lg font-extrabold gradient-text leading-none">RENFLIX</div>
            <div className="text-[9px] text-navy-500 font-mono uppercase tracking-widest">Property OS</div>
          </div>
        </div>
        {mobile && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="ml-3 p-1.5 rounded-lg text-navy-400 hover:text-white hover:bg-navy-800 transition-colors flex-shrink-0"
          >
            <ChevronRight size={18} className="rotate-180" />
          </button>
        )}
      </div>

      {profile && (
        <button
          type="button"
          onClick={() => { navigate("/settings"); onClose?.(); }}
          className="w-full text-left px-4 py-3 border-b border-navy-800 hover:bg-navy-800/70 transition-colors"
          aria-label="Open My Profile in Settings"
        >
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">{(profile.full_name || "U")[0].toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white font-display truncate">{profile.full_name || "User"}</div>
              <div className="text-[10px] text-blue-400 font-mono uppercase">{profile.role}</div>
            </div>
          </div>
        </button>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
        {mainItems.map(item => <LinkItem key={item.to} item={item} onClose={onClose} />)}

        {(isOwnerPortal || role === "TENANT") && (
          <div className="mt-0.5">
            <button
              type="button"
              onClick={() => setMoreOpen(v => !v)}
              className="sidebar-link w-full h-[42px]"
              aria-expanded={moreOpen}
            >
              <ChevronDown size={18} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              <span className="flex-1 text-left">More</span>
              {/*{moreOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}*/}
            </button>

            {moreOpen && (
              <div className="mt-1 ml-2 pl-2 border-l border-navy-700 flex flex-col gap-0.5 animate-fade-in">
                {(role === "TENANT" ? TENANT_MORE_ITEMS : MORE_ITEMS).map(item => <LinkItem key={item.to} item={item} onClose={onClose} />)}
              </div>
            )}
          </div>
        )}

        <div className="mt-auto pt-2">
          <LinkItem item={{ to: "/settings", icon: <Settings size={18} />, label: "Settings" }} onClose={onClose} />
        </div>
      </nav>
    </aside>
  );
}

