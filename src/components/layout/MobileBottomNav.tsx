import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  CreditCard,
  Wrench,
  Globe,
  BarChart3,
  Cpu,
  Megaphone,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { Profile } from "../../lib/types";

export type MobileNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const OWNER_ITEMS: MobileNavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/properties", label: "Properties", icon: Building2 },
  { to: "/units", label: "Units", icon: DoorOpen },
  { to: "/tenants", label: "Tenants", icon: Users },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/community", label: "Community", icon: Globe },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/intelligence", label: "Intelligence", icon: Cpu },
  { to: "/settings", label: "Settings", icon: Settings },
];

const TENANT_ITEMS: MobileNavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/announcements", label: "Announcements", icon: Megaphone },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/intelligence", label: "Intelligence", icon: Cpu },
  { to: "/settings", label: "Settings", icon: Settings },
];

const FALLBACK_ITEMS: MobileNavItem[] = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/properties", label: "Properties", icon: Building2 },
  { to: "/units", label: "Units", icon: DoorOpen },
  { to: "/tenants", label: "Tenants", icon: Users },
  { to: "/payments", label: "Payments", icon: CreditCard },
  { to: "/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function getMobileNavItems(profile: Profile | null): MobileNavItem[] {
  if (profile?.role === "TENANT") return TENANT_ITEMS;
  if (["OWNER", "PROPERTY_MANAGER", "HOSTEL_MANAGER", "COMMUNITY_MANAGER", "TECHNICIAN"].includes(profile?.role || "")) {
    return OWNER_ITEMS;
  }
  return FALLBACK_ITEMS;
}

const STORAGE_PREFIX = "renflix-mobile-nav";
export const MOBILE_NAV_COUNT = 4;

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function getDefaultMobileNav(profile: Profile | null): string[] {
  const options = getMobileNavItems(profile);
  const preferred = profile?.role === "TENANT"
    ? ["/dashboard", "/payments", "/maintenance", "/announcements"]
    : ["/dashboard", "/units", "/tenants", "/payments"];

  const selected = preferred
    .map((to) => options.find((item) => item.to === to)?.to)
    .filter((to): to is string => Boolean(to));

  return selected.length === MOBILE_NAV_COUNT
    ? selected
    : options.slice(0, MOBILE_NAV_COUNT).map((item) => item.to);
}

export function getSavedMobileNav(profile: Profile | null, userId?: string | null): string[] {
  const options = getMobileNavItems(profile);
  const defaults = getDefaultMobileNav(profile);
  if (!userId) return defaults;

  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length !== MOBILE_NAV_COUNT) return defaults;

    const valid = parsed.filter((to): to is string =>
      typeof to === "string" && options.some((item) => item.to === to)
    );

    if (valid.length !== MOBILE_NAV_COUNT || new Set(valid).size !== MOBILE_NAV_COUNT) {
      return defaults;
    }

    return valid;
  } catch {
    return defaults;
  }
}

export function saveMobileNav(userId: string | null | undefined, items: string[]) {
  if (!userId || items.length !== MOBILE_NAV_COUNT) return;
  localStorage.setItem(storageKey(userId), JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("renflix-mobile-nav-change"));
}

export default function MobileBottomNav({ profile }: { profile: Profile | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = profile?.id || null;
  const [selected, setSelected] = useState<string[]>(() => getSavedMobileNav(profile, userId));

  const options = useMemo(() => getMobileNavItems(profile), [profile?.role]);

  useEffect(() => {
    setSelected(getSavedMobileNav(profile, userId));
  }, [profile, userId]);

  useEffect(() => {
    const refresh = () => setSelected(getSavedMobileNav(profile, userId));
    window.addEventListener("renflix-mobile-nav-change", refresh);
    return () => window.removeEventListener("renflix-mobile-nav-change", refresh);
  }, [profile, userId]);

  const items = selected
    .map((to) => options.find((item) => item.to === to))
    .filter((item): item is MobileNavItem => Boolean(item));

  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label="Mobile navigation">
      <div className="mobile-bottom-nav__glow" aria-hidden="true" />
      <div className="mobile-bottom-nav__inner">
        {items.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

          return (
            <button
              key={item.to}
              type="button"
              onClick={() => navigate(item.to)}
              className={`mobile-bottom-nav__item ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              aria-label={item.label}
            >
              <span className="mobile-bottom-nav__icon-wrap">
                <span className="mobile-bottom-nav__active-pill" aria-hidden="true" />
                <Icon size={20} strokeWidth={active ? 2.4 : 2} className="mobile-bottom-nav__icon" />
              </span>
              <span className="mobile-bottom-nav__label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
