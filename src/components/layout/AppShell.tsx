import {
  useState,
  useEffect,
  useRef,
} from "react";

import {
  Outlet,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router";

import {
  Menu,
  Bell,
  AlertCircle,
  RefreshCw,
  X,
  Check,
  Building2,
  Users,
  CreditCard,
  Wrench,
  FileText,
} from "lucide-react";

import Sidebar from "./Sidebar";

import {
  useAuth,
} from "../../hooks/useAuth";

import {
  ensureDbReady,
} from "../../lib/setupDb";

import {
  supabase,
} from "../../lib/supabase";

import {
  Modal,
  Button,
  ScrollArea,
} from "../../components/ui";

type DbStatus =
  | "checking"
  | "ready"
  | "error";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<
    string,
    unknown
  > | null;
  created_at: string;
}

// ------------------------------------------------------------
// Notification helpers
// ------------------------------------------------------------

export function formatTime(
  dateStr: string
) {
  const date = new Date(
    dateStr
  );

  const now = new Date();

  const diff =
    now.getTime() -
    date.getTime();

  const mins = Math.floor(
    diff / 60000
  );

  const hours = Math.floor(
    diff / 3600000
  );

  const days = Math.floor(
    diff / 86400000
  );

  if (mins < 1) {
    return "Just now";
  }

  if (mins < 60) {
    return `${mins}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
    }
  );
}

export function getNotifIcon(
  type: string
) {
  switch (type) {
    case "property_created":
      return (
        <Building2
          size={16}
          className="text-blue-400"
        />
      );

    case "tenant_added":
      return (
        <Users
          size={16}
          className="text-violet-400"
        />
      );

    case "payment_received":
      return (
        <CreditCard
          size={16}
          className="text-emerald-400"
        />
      );

    case "maintenance_created":
      return (
        <Wrench
          size={16}
          className="text-orange-400"
        />
      );

    case "lease_created":
      return (
        <FileText
          size={16}
          className="text-amber-400"
        />
      );

    default:
      return (
        <Bell
          size={16}
          className="text-navy-400"
        />
      );
  }
}

export function getNotifIconColor(
  type: string
) {
  switch (type) {
    case "property_created":
      return "bg-blue-500/15";

    case "tenant_added":
      return "bg-violet-500/15";

    case "payment_received":
      return "bg-emerald-500/15";

    case "maintenance_created":
      return "bg-orange-500/15";

    case "lease_created":
      return "bg-amber-500/15";

    default:
      return "bg-navy-700";
  }
}

export function getNotificationDisplay(notification: Notification) {
  const metadata = notification.metadata || {};
  const propertyName = typeof metadata.property_name === "string" ? metadata.property_name : "";
  const tenantName = typeof metadata.tenant_name === "string" ? metadata.tenant_name : "";
  if (notification.type === "property_created") {
    return {
      title: propertyName ? `${propertyName} Property Added` : notification.title,
      message: propertyName ? `Property ${propertyName} was added successfully.` : notification.message,
    };
  }
  if (notification.type === "tenant_added") {
    return {
      title: tenantName ? `${tenantName} Tenant Added` : notification.title,
      message: tenantName ? `Tenant ${tenantName} was added successfully.` : notification.message,
    };
  }
  return { title: notification.title, message: notification.message };
}

export const FILTER_OPTIONS = [
  {
    value: "all",
    label: "All",
  },
  {
    value: "property_created",
    label: "Properties",
  },
  {
    value: "tenant_added",
    label: "Tenants",
  },
  {
    value: "payment_received",
    label: "Payments",
  },
  {
    value: "maintenance_created",
    label: "Maintenance",
  },
  {
    value: "lease_created",
    label: "Leases",
  },
];

// ------------------------------------------------------------
// Notification navigation
// ------------------------------------------------------------
export function getNotificationRoute(notification: Notification, role?: string) {
  const metadata = notification.metadata || {};
  const entityId = notification.entity_id;
  const propertyDisplayId = typeof metadata.property_display_id === "string" ? metadata.property_display_id : null;

  switch (notification.type) {
    case "property_created":
      return propertyDisplayId
        ? `/properties/${propertyDisplayId}`
        : "/properties";
    case "tenant_added":
      return entityId
        ? `/tenants/${entityId}`
        : "/tenants";
    case "payment_received":
    case "payment_review":
      return "/payments";
    case "maintenance_created":
      return "/maintenance";
    case "announcement":
      return role === "TENANT" ? "/announcements" : "/community";
    case "lease_created":
      return "/leases";
    default:
      if (notification.entity_type === "tenant") return entityId ? `/tenants/${entityId}` : "/tenants";
      if (notification.entity_type === "property") return propertyDisplayId ? `/properties/${propertyDisplayId}` : "/properties";
      if (notification.entity_type === "payment") return "/payments";
      if (notification.entity_type === "maintenance") return "/maintenance";
      if (notification.entity_type === "announcement") return role === "TENANT" ? "/announcements" : "/community";
      if (notification.entity_type === "lease") return "/leases";
      return "/dashboard";
  }
}

// ------------------------------------------------------------
// AppShell
// ------------------------------------------------------------

export default function AppShell() {
  const {
    user,
    profile,
    loading,
  } = useAuth();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [
    mobileOpen,
    setMobileOpen,
  ] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("renflix-theme");
    document.documentElement.classList.toggle("theme-light", savedTheme === "light");
  }, []);

  const [
    dbStatus,
    setDbStatus,
  ] =
    useState<DbStatus>(
      "checking"
    );

  const [
    dbMsg,
    setDbMsg,
  ] = useState("");

  const [
    retrying,
    setRetrying,
  ] = useState(false);

  // ----------------------------------------------------------
  // Notification state
  // ----------------------------------------------------------

  const [
    notifications,
    setNotifications,
  ] = useState<
    Notification[]
  >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    notifOpen,
    setNotifOpen,
  ] = useState(false);

  const notifRefDesktop =
    useRef<HTMLDivElement>(
      null
    );

  const notifRefMobile =
    useRef<HTMLDivElement>(
      null
    );

  // ----------------------------------------------------------
  // Verify database availability
  // ----------------------------------------------------------

  async function runDbCheck() {
    setDbStatus(
      "checking"
    );

    const result =
      await ensureDbReady();

    if (result.ok) {
      setDbStatus(
        "ready"
      );
      setDbMsg("");
      return;
    }

    setDbStatus(
      "error"
    );

    setDbMsg(
      result.message
    );
  }

  useEffect(() => {
    /*
     * Only verify the database once the user is authenticated.
     *
     * Public authentication pages should not depend on the
     * application's database check.
     */
    if (!user) {
      setDbStatus(
        "ready"
      );

      return;
    }

    runDbCheck();
  }, [user]);

  // ----------------------------------------------------------
  // Retry database check
  // ----------------------------------------------------------

  async function retry() {
    setRetrying(
      true
    );

    sessionStorage.removeItem(
      "renflix_db_ready_v4"
    );

    await runDbCheck();

    setRetrying(
      false
    );
  }

  // ----------------------------------------------------------
  // Fetch notifications
  // ----------------------------------------------------------

  async function fetchNotifications() {
    if (
      !user ||
      !profile?.organization_id
    ) {
      return;
    }

    const {
      data,
      error,
    } = await supabase
      .from(
        "notifications"
      )
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(50);

    if (error) {
      console.error(
        "Notification fetch error:",
        error
      );

      return;
    }

    if (data) {
      setNotifications(
        data as Notification[]
      );

      setUnreadCount(
        data.filter(
          (
            notification
          ) =>
            !notification.read
        ).length
      );
    }
  }

  // ----------------------------------------------------------
  // Notification realtime subscription
  // ----------------------------------------------------------

  useEffect(() => {
    if (
      !user ||
      !profile?.organization_id
    ) {
      setNotifications([]);
      setUnreadCount(0);

      return;
    }

    let channel:
      | ReturnType<
          typeof supabase.channel
        >
      | null = null;

    fetchNotifications();

    channel =
      supabase
        .channel(
          "renflix-notifications"
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif =
              payload.new as Notification;

            setNotifications(
              (previous) => [
                newNotif,
                ...previous,
              ]
            );

            setUnreadCount(
              (previous) =>
                previous + 1
            );
            // Background/device delivery is handled by the Service Worker + Web Push.
            // Keep a foreground fallback only when the user has not created a Push subscription.
            if ("Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator) {
              navigator.serviceWorker.ready.then(async (registration) => {
                const subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                  try {
                    await registration.showNotification(`RENFLIX · ${newNotif.title}`, {
                      body: newNotif.message || "You have a new notification.",
                      icon: "/icons/icon-192.png",
                      tag: newNotif.id,
                    });
                  } catch {}
                }
              }).catch(() => {});
            }
          }
        )
        .subscribe();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [
    user?.id,
    profile?.organization_id,
  ]);

  // ----------------------------------------------------------
  // Notification actions
  // ----------------------------------------------------------

  async function markAsRead(
    ids: string[]
  ) {
    if (ids.length === 0) {
      return;
    }

    await supabase.rpc(
      "mark_notifications_read",
      {
        p_notification_ids:
          ids,
      }
    );

    setNotifications(
      (previous) =>
        previous.map(
          (notification) =>
            ids.includes(
              notification.id
            )
              ? {
                  ...notification,
                  read: true,
                }
              : notification
        )
    );

    setUnreadCount(
      (previous) => {
        const newlyRead =
          ids.filter(
            (id) =>
              notifications.find(
                (
                  notification
                ) =>
                  notification.id ===
                    id &&
                  !notification.read
              )
          ).length;

        return Math.max(
          0,
          previous -
            newlyRead
        );
      }
    );
  }

  async function markAllRead() {
    await supabase.rpc(
      "mark_all_notifications_read"
    );

    setNotifications(
      (previous) =>
        previous.map(
          (notification) => ({
            ...notification,
            read: true,
          })
        )
    );

    setUnreadCount(
      0
    );
  }

  function toggleNotif(
    e: React.MouseEvent
  ) {
    e.stopPropagation();

    setNotifOpen(
      (previous) =>
        !previous
    );
  }

  // ----------------------------------------------------------
  // Close notification dropdown on outside click
  // ----------------------------------------------------------

  useEffect(() => {
    function handleClickOutside(
      e: MouseEvent
    ) {
      const target =
        e.target as Node;

      const clickedDesktop =
        notifRefDesktop.current?.contains(
          target
        );

      const clickedMobile =
        notifRefMobile.current?.contains(
          target
        );

      if (
        !clickedDesktop &&
        !clickedMobile
      ) {
        setNotifOpen(
          false
        );
      }
    }

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // ----------------------------------------------------------
  // Auth/database loading
  // ----------------------------------------------------------

  if (
    loading ||
    dbStatus ===
      "checking"
  ) {
    return (
      <SplashScreen />
    );
  }

  // ----------------------------------------------------------
  // Authentication guard
  // ----------------------------------------------------------

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }

  // ----------------------------------------------------------
  // Database error
  // ----------------------------------------------------------

  if (
    dbStatus ===
    "error"
  ) {
    return (
      <DbErrorScreen
        message={dbMsg}
        onRetry={retry}
        retrying={retrying}
      />
    );
  }

  // ----------------------------------------------------------
  // Incomplete profile
  // ----------------------------------------------------------
  //
  // A completed RENFLIX account should have:
  //
  // - full_name
  // - email
  // - phone
  //
  // If any identifier is missing, return to onboarding.
  // ----------------------------------------------------------

  // const profileComplete =
  //   Boolean(
  //     profile?.full_name?.trim() &&
  //       profile?.email?.trim() &&
  //       profile?.phone?.trim()
  //   );

  // if (!profileComplete) {
  //   return (
  //     <Navigate
  //       to="/onboarding"
  //       replace
  //     />
  //   );
  // }

  // ----------------------------------------------------------
  // Application
  // ----------------------------------------------------------

  return (
    <div className="flex h-screen bg-navy-900 overflow-hidden">
      {/* ==================================================== */}
      {/* DESKTOP SIDEBAR                                     */}
      {/* ==================================================== */}

      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar
          profile={profile}
        />
      </div>

      {/* ==================================================== */}
      {/* MOBILE SIDEBAR                                      */}
      {/* ==================================================== */}

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] flex">
          <div
            className="absolute inset-0 bg-navy-950/85 backdrop-blur-sm modal-backdrop"
            onClick={() =>
              setMobileOpen(
                false
              )
            }
          />

          <div className="relative z-50 flex w-72 h-[100dvh] animate-slide-in-left">
            <Sidebar
              profile={profile}
              mobile
              onClose={() =>
                setMobileOpen(
                  false
                )
              }
            />
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MAIN AREA                                           */}
      {/* ==================================================== */}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* -------------------------------------------------- */}
        {/* MOBILE TOPBAR                                     */}
        {/* -------------------------------------------------- */}

        <header className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-navy-900/95 border-b border-navy-800 flex-shrink-0 backdrop-blur-xl">
          <button
            onClick={() =>
              setMobileOpen(
                true
              )
            }
            className="p-2 rounded-lg hover:bg-navy-700 text-navy-300 transition-all active:scale-90"
            aria-label="Open menu"
          >
            <Menu
              size={20}
            />
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="font-display font-extrabold gradient-text text-lg"
            aria-label="Reload RENFLIX"
          >
            RENFLIX
          </button>

          {/* Mobile notifications */}

          <div
            className="relative"
            ref={
              notifRefMobile
            }
          >
            <button
              onClick={
                toggleNotif
              }
              className="relative p-2 rounded-lg hover:bg-navy-700 text-navy-300 transition-all active:scale-90"
              aria-label="Notifications"
            >
              <Bell
                size={20}
              />

              {unreadCount >
                0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount >
                  9
                    ? "9+"
                    : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <NotificationDropdown
                notifications={
                  notifications
                }
                unreadCount={
                  unreadCount
                }
                onMarkAllRead={
                  markAllRead
                }
                onMarkRead={
                  markAsRead
                }
                onClose={() =>
                  setNotifOpen(
                    false
                  )
                }
                onNavigate={(
                  path
                ) => {
                  setNotifOpen(
                    false
                  );
                  navigate(
                    path
                  );
                }}
              />
            )}
          </div>
        </header>

        {/* -------------------------------------------------- */}
        {/* DESKTOP TOPBAR                                    */}
        {/* -------------------------------------------------- */}

        <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-navy-900 border-b border-navy-800 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse" />
              <span className="text-xs text-navy-500 font-mono">Live · Supabase connected</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="relative"
              ref={
                notifRefDesktop
              }
            >
              <button
                onClick={
                  toggleNotif
                }
                className="relative p-2 rounded-lg hover:bg-navy-700 text-navy-400 hover:text-navy-200 transition-all active:scale-90"
                aria-label="Notifications"
              >
                <Bell
                  size={18}
                />

                {unreadCount >
                  0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount >
                    9
                      ? "9+"
                      : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <NotificationDropdown
                  notifications={
                    notifications
                  }
                  unreadCount={
                    unreadCount
                  }
                  onMarkAllRead={
                    markAllRead
                  }
                  onMarkRead={
                    markAsRead
                  }
                  onClose={() =>
                    setNotifOpen(
                      false
                    )
                  }
                  onNavigate={(
                    path
                  ) => {
                    setNotifOpen(
                      false
                    );
                    navigate(
                      path
                    );
                  }}
                />
              )}
            </div>
          </div>
        </header>

        {/* -------------------------------------------------- */}
        {/* CONTENT                                            */}
        {/* -------------------------------------------------- */}

        <main className="flex-1 overflow-y-auto pt-[58px] lg:pt-0 overscroll-contain">
          <div className="p-4 md:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

// ============================================================
// NOTIFICATION DROPDOWN
// ============================================================

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onMarkRead: (
    ids: string[]
  ) => void;
  onClose: () => void;
  onNavigate: (
    path: string
  ) => void;
}

function NotificationDropdown({
  notifications,
  unreadCount,
  onMarkAllRead,
  onMarkRead,
  onClose,
  onNavigate,
}: NotificationDropdownProps) {
  function handleNotificationClick(
    notification: Notification
  ) {
    if (!notification.read) onMarkRead([notification.id]);
    onNavigate(getNotificationRoute(notification));
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-[min(18rem,calc(100vw-2rem))] md:w-96 bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-navy-700">
        <h3 className="font-display font-bold text-white">
          Notifications
        </h3>

        <div className="flex items-center gap-2">
          {unreadCount >
            0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={
                onMarkAllRead
              }
            >
              <Check
                size={12}
              />
              Mark all read
            </Button>
          )}

          <button
            onClick={
              onClose
            }
            className="text-navy-400 hover:text-white p-1.5 rounded-lg hover:bg-navy-700"
            aria-label="Close notifications"
          >
            <X
              size={16}
            />
          </button>
        </div>
      </div>

      <ScrollArea className="max-h-[400px]">
        {notifications.length ===
        0 ? (
          <div className="p-6 text-center text-navy-500">
            No notifications yet
          </div>
        ) : (
          <div className="divide-y divide-navy-700">
            {notifications.map(
              (
                notification
              ) => (
                <button
                  key={
                    notification.id
                  }
                  className={`w-full p-4 text-left hover:bg-navy-700/50 transition-colors ${
                    !notification.read
                      ? "bg-navy-700/30"
                      : ""
                  }`}
                  onClick={() =>
                    handleNotificationClick(
                      notification
                    )
                  }
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${getNotifIconColor(
                        notification.type
                      )}`}
                    >
                      {getNotifIcon(
                        notification.type
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-semibold ${
                          notification.read ? "text-navy-300" : "text-white"
                        }`}
                      >
                        {getNotificationDisplay(notification).title}
                      </div>

                      <div className="text-[10px] text-navy-600 mt-1">
                        {formatTime(
                          notification.created_at
                        )}
                      </div>
                    </div>

                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full mt-1 flex-shrink-0" />
                    )}
                  </div>
                </button>
              )
            )}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t border-navy-700">
        <Button
          variant="secondary"
          className="w-full"
          onClick={() =>
            onNavigate(
              "/notifications"
            )
          }
        >
          View All Notifications
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// SPLASH SCREEN
// ============================================================

function SplashScreen() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl">
            <span className="text-white font-display font-extrabold text-2xl">R</span>
          </div>
          <div className="absolute -inset-2 rounded-[20px] border-2 border-transparent border-t-blue-500 animate-spin" />
        </div>
        <div className="text-center">
          <div className="font-display font-extrabold gradient-text text-2xl mb-1">RENFLIX</div>
          <div className="text-xs text-navy-600 font-mono">Connecting to Supabase…</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DATABASE ERROR SCREEN
// ============================================================

function DbErrorScreen({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-navy-800 border border-navy-700 rounded-2xl p-7 text-center shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5">
          <AlertCircle
            size={26}
            className="text-red-400"
          />
        </div>

        <h2 className="font-display font-bold text-white text-xl mb-2">
          Database unavailable
        </h2>

        <p className="text-sm text-navy-400 leading-relaxed mb-5">
          RENFLIX could not access the
          application database.
        </p>

        <div className="text-xs text-red-400 bg-red-500/5 border border-red-500/10 rounded-xl p-3 mb-5 text-left">
          {message}
        </div>

        <Button
          onClick={
            onRetry
          }
          disabled={
            retrying
          }
          className="w-full"
        >
          <RefreshCw
            size={15}
            className={
              retrying
                ? "animate-spin"
                : ""
            }
          />

          {retrying
            ? "Checking…"
            : "Retry connection"}
        </Button>
      </div>
    </div>
  );
}