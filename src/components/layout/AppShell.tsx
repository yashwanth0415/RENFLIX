import { useState, useEffect, useRef } from "react";
import { Outlet, Navigate, useLocation, useNavigate } from "react-router";
import { Menu, Bell, AlertCircle, RefreshCw, ExternalLink, X, Check, Building2, Users, CreditCard, Wrench, FileText } from "lucide-react";
import Sidebar from "./Sidebar";
import { useAuth } from "../../hooks/useAuth";
import { ensureDbReady } from "../../lib/setupDb";
import { supabase } from "../../lib/supabase";
import { Modal, Button, ScrollArea } from "../../components/ui";

type DbStatus = "checking" | "ready" | "error" | "needs-redeploy";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function getNotifIcon(type: string) {
  switch (type) {
    case 'property_created': return <Building2 size={16} className="text-blue-400" />;
    case 'tenant_added': return <Users size={16} className="text-violet-400" />;
    case 'payment_received': return <CreditCard size={16} className="text-emerald-400" />;
    case 'maintenance_created': return <Wrench size={16} className="text-orange-400" />;
    case 'lease_created': return <FileText size={16} className="text-amber-400" />;
    default: return <Bell size={16} className="text-navy-400" />;
  }
}

export function getNotifIconColor(type: string) {
  switch (type) {
    case 'property_created': return 'bg-blue-500/15';
    case 'tenant_added': return 'bg-violet-500/15';
    case 'payment_received': return 'bg-emerald-500/15';
    case 'maintenance_created': return 'bg-orange-500/15';
    case 'lease_created': return 'bg-amber-500/15';
    default: return 'bg-navy-700';
  }
}

export const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "property_created", label: "Properties" },
  { value: "tenant_added", label: "Tenants" },
  { value: "payment_received", label: "Payments" },
  { value: "maintenance_created", label: "Maintenance" },
  { value: "lease_created", label: "Leases" },
];

export default function AppShell() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatus>("checking");
  const [dbMsg, setDbMsg] = useState("");
  const [retrying, setRetrying] = useState(false);
  const location = useLocation();

  // Notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Fetch notifications on auth
  useEffect(() => {
    if (!user || !profile?.organization_id) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    fetchNotifications();

    channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [user, profile?.organization_id]);

  async function fetchNotifications() {
    if (!user || !profile?.organization_id) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  }

  async function markAsRead(ids: string[]) {
    await supabase.rpc('mark_notifications_read', { p_notification_ids: ids });
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - ids.filter(id => notifications.find(n => n.id === id && !n.read)).length));
  }

  async function markAllRead() {
    await supabase.rpc('mark_all_notifications_read');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  function toggleNotif(e: React.MouseEvent) {
    e.stopPropagation();
    setNotifOpen(!notifOpen);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const runSetup = async () => {
    const res = await ensureDbReady();
    if (res.ok) setDbStatus("ready");
    else if (res.needsRedeploy) { setDbStatus("needs-redeploy"); setDbMsg(res.message); }
    else { setDbStatus("error"); setDbMsg(res.message); }
  };

  useEffect(() => { runSetup(); }, []);

  async function retry() {
    setRetrying(true);
    setDbStatus("checking");
    sessionStorage.removeItem("renflix_db_ready_v3");
    await runSetup();
    setRetrying(false);
  }

  // Show splash while auth or DB is loading
  if (loading || dbStatus === "checking") return <SplashScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (dbStatus === "needs-redeploy" || dbStatus === "error") return <DbErrorScreen status={dbStatus} message={dbMsg} onRetry={retry} retrying={retrying} />;
  if (!profile || !profile.full_name) return <Navigate to="/onboarding" replace />;

  return (
    <div className="flex h-screen bg-navy-900 overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar profile={profile} />
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-navy-950/85 backdrop-blur-sm modal-backdrop" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50 flex w-72 animate-slide-in-left">
            <Sidebar profile={profile} mobile onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-navy-900 border-b border-navy-800 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="p-2 rounded-lg hover:bg-navy-700 text-navy-300 transition-all active:scale-90">
            <Menu size={20} />
          </button>
          <div className="font-display font-extrabold gradient-text text-lg">RENFLIX</div>
          <button onClick={toggleNotif} className="relative p-2 rounded-lg hover:bg-navy-700 text-navy-300 transition-all active:scale-90">
            <Bell size={20} />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
        </header>

        {/* Desktop topbar */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3 bg-navy-900 border-b border-navy-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 dot-pulse" />
            <span className="text-xs text-navy-500 font-mono">Live · Supabase connected</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification Dropdown */}
            <div className="relative" ref={notifRef}>
              <button onClick={toggleNotif} className="relative p-2 rounded-lg hover:bg-navy-700 text-navy-400 hover:text-navy-200 transition-all active:scale-90">
                <Bell size={18} />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-navy-800 border border-navy-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-navy-700">
                    <h3 className="font-display font-bold text-white">Notifications</h3>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllRead}>
                          <Check size={12} /> Mark all read
                        </Button>
                      )}
                      <button onClick={() => setNotifOpen(false)} className="text-navy-400 hover:text-white p-1.5 rounded-lg hover:bg-navy-700">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <ScrollArea className="max-h-[400px]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-navy-500">No notifications yet</div>
                    ) : (
                      <div className="divide-y divide-navy-700">
                        {notifications.map((notif) => (
                          <button
                            key={notif.id}
                            className={`w-full p-4 text-left hover:bg-navy-700/50 transition-colors ${!notif.read ? 'bg-navy-700/30' : ''}`}
                            onClick={() => {
                              if (!notif.read) markAsRead([notif.id]);
                              if (notif.entity_type && notif.entity_id) {
                                const routes: Record<string, string> = {
                                  property: `/properties/${notif.entity_id}`,
                                  tenant: `/tenants/${notif.entity_id}`,
                                  payment: `/payments`,
                                  maintenance: `/maintenance`,
                                  lease: `/leases`,
                                };
                                if (routes[notif.entity_type]) navigate(routes[notif.entity_type]);
                              }
                              setNotifOpen(false);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getNotifIconColor(notif.type)}`}>
                                {getNotifIcon(notif.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`font-semibold text-white ${!notif.read ? '' : 'text-navy-300'}`}>{notif.title}</div>
                                <div className="text-xs text-navy-400 truncate">{notif.message}</div>
                                <div className="text-[10px] text-navy-600 mt-1">{formatTime(notif.created_at)}</div>
                              </div>
                              {!notif.read && <div className="w-2 h-2 bg-blue-400 rounded-full mt-1 flex-shrink-0" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <div className="p-3 border-t border-navy-700">
                    <Button variant="secondary" className="w-full" onClick={() => { setNotifOpen(false); navigate('/notifications'); }}>
                      View All Notifications
                    </Button>
                  </div>
                </div>
              )}
            </div>
            {/* Profile section removed from topbar */}
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