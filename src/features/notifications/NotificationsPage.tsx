import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, Check, X, Filter, Building2, Users, CreditCard, Wrench, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Button, Card, PageHeader, EmptyState, ScrollArea, Select } from "../../components/ui";
import { formatTime, getNotifIcon, getNotifIconColor, getNotificationDisplay, getNotificationRoute, FILTER_OPTIONS } from "../../components/layout/AppShell";
import type { Notification } from "../../components/layout/AppShell";



export default function NotificationsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user && profile?.organization_id) {
      fetchNotifications();
    }
  }, [user, profile?.organization_id]);

  async function fetchNotifications() {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const { data } = await query;
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
    setLoading(false);
  }

  async function markAsRead(ids: string[]) {
    await supabase.rpc('mark_notifications_read', { p_notification_ids: ids });
    setNotifications(prev => {
      const updated = prev.map(n => ids.includes(n.id) ? { ...n, read: true } : n);
      // Calculate unread from updated state to avoid stale closure
      setUnreadCount(updated.filter(n => !n.read).length);
      return updated;
    });
  }

  async function markAllRead() {
    await supabase.rpc('mark_all_notifications_read');
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  const filteredNotifications = filter === "all" 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Notifications" subtitle="Loading..." />
        <ScrollArea className="max-h-[600px]">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-4 border-b border-navy-700 skeleton animate-pulse">
              <div className="w-8 h-8 rounded-lg bg-navy-700" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-navy-700 rounded mb-2" />
                <div className="h-3 w-full bg-navy-700 rounded" />
              </div>
            </div>
          ))}
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        action={
          unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={markAllRead}>
              <Check size={14} /> Mark all read
            </Button>
          )
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-3 mb-4">
        <Select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          options={FILTER_OPTIONS}
          className="w-48"
        />
      </div>

      {/* Notifications List */}
      <ScrollArea className="max-h-[70vh]">
        {filteredNotifications.length === 0 ? (
          <EmptyState
            icon={<Bell size={28} />}
            title={filter === "all" ? "No notifications yet" : `No ${FILTER_OPTIONS.find(f => f.value === filter)?.label.toLowerCase()} notifications`}
            description={filter === "all" ? "You'll see activity updates here" : "Try a different filter"}
          />
        ) : (
          <div className="divide-y divide-navy-700">
            {filteredNotifications.map((notif) => (
              <button
                type="button"
                key={notif.id}
                onClick={async () => { await markAsRead([notif.id]); navigate(getNotificationRoute(notif, profile?.role)); }}
                className={`w-full text-left p-4 hover:bg-navy-700/30 transition-colors ${!notif.read ? 'bg-navy-700/30' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getNotifIconColor(notif.type)}`}>
                    {getNotifIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={`font-semibold text-white ${!notif.read ? '' : 'text-navy-300'}`}>{getNotificationDisplay(notif).title}</div>
                        <div className="text-xs text-navy-400 truncate max-w-md">{getNotificationDisplay(notif).message}</div>
                      </div>
                      {!notif.read && (
                        <span
                          onClick={(e) => { e.stopPropagation(); markAsRead([notif.id]); }}
                          className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center hover:bg-blue-500/30 transition-colors flex-shrink-0 cursor-pointer"
                        >
                          <Check size={12} className="text-blue-400" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-navy-500">
                      <span>{formatTime(notif.created_at)}</span>
                      <span className="px-2 py-0.5 bg-navy-700 rounded font-mono">{notif.type.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {filteredNotifications.length > notifications.length && (
        <div className="mt-4 text-center text-xs text-navy-500">
          Showing {filteredNotifications.length} of {notifications.length} notifications
        </div>
      )}
    </div>
  );
}