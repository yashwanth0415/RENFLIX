import { NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  CreditCard,
  Wrench,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Cpu,
  Home,
  DoorOpen,
  Receipt,
  Globe,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Profile } from "../../lib/types";

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", icon: <LayoutDashboard size={18} />, label: "Dashboard" },
  { to: "/properties", icon: <Building2 size={18} />, label: "Properties", roles: ["OWNER", "PROPERTY_MANAGER", "ADMIN"] },
  { to: "/units", icon: <DoorOpen size={18} />, label: "Units", roles: ["OWNER", "PROPERTY_MANAGER", "ADMIN"] },
  { to: "/tenants", icon: <Users size={18} />, label: "Tenants", roles: ["OWNER", "PROPERTY_MANAGER", "HOSTEL_MANAGER", "ADMIN"] },
  { to: "/leases", icon: <FileText size={18} />, label: "Leases", roles: ["OWNER", "PROPERTY_MANAGER", "ADMIN"] },
  { to: "/payments", icon: <CreditCard size={18} />, label: "Payments" },
  { to: "/maintenance", icon: <Wrench size={18} />, label: "Maintenance" },
  { to: "/messages", icon: <MessageSquare size={18} />, label: "Messages" },
  { to: "/community", icon: <Globe size={18} />, label: "Community", roles: ["OWNER", "COMMUNITY_MANAGER", "ADMIN"] },
  { to: "/analytics", icon: <BarChart3 size={18} />, label: "Analytics", roles: ["OWNER", "PROPERTY_MANAGER", "ADMIN"] },
  { to: "/intelligence", icon: <Cpu size={18} />, label: "Intelligence", roles: ["OWNER", "PROPERTY_MANAGER", "ADMIN"] },
  { to: "/settings", icon: <Settings size={18} />, label: "Settings" },
];

interface SidebarProps {
  profile: Profile | null;
  mobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ profile, mobile, onClose }: SidebarProps) {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || !profile?.role || item.roles.includes(profile.role)
  );

  return (
    <aside
      className={`flex flex-col bg-navy-900 border-r border-navy-800 ${mobile ? "w-full" : "w-60"} h-full`}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-navy-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
            <Home size={16} className="text-white" />
          </div>
          <div>
            <div className="font-display text-lg font-extrabold gradient-text leading-none">RENFLIX</div>
            <div className="text-[9px] text-navy-500 font-mono uppercase tracking-widest">Property OS</div>
          </div>
        </div>
      </div>

      {/* User info */}
      {profile && (
        <div className="px-4 py-3 border-b border-navy-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {(profile.full_name || "U")[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white font-display truncate">
                {profile.full_name || "User"}
              </div>
              <div className="text-[10px] text-blue-400 font-mono uppercase">{profile.role}</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onClose}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-navy-800">
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-red-400 hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
