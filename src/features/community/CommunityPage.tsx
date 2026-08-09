import { useEffect, useState } from "react";
import { Globe, Plus, Megaphone } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Button, Card, Modal, Input, Textarea, PageHeader, EmptyState, Skeleton, Toast } from "../../components/ui";

interface Announcement { id: string; organization_id: string; title: string; body: string; priority: string; created_at: string; }

export default function CommunityPage() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", priority: "NORMAL" });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (profile?.organization_id) fetchAnnouncements();
    else setLoading(false);
  }, [profile]);

  // Subscribe to realtime announcements
  useEffect(() => {
    if (!profile?.organization_id) return;
    const channel = supabase
      .channel("community-announcements")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_announcements", filter: `organization_id=eq.${profile.organization_id}` },
        (payload) => setAnnouncements(prev => [payload.new as Announcement, ...prev])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from("community_announcements")
      .select("*")
      .eq("organization_id", profile!.organization_id!)
      .order("created_at", { ascending: false });
    setAnnouncements(data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("community_announcements").insert({
      organization_id: profile!.organization_id!,
      title: form.title,
      body: form.body,
      priority: form.priority,
    });
    if (error) setToast({ msg: error.message, type: "error" });
    else { setToast({ msg: "Announcement published!", type: "success" }); setShowModal(false); setForm({ title: "", body: "", priority: "NORMAL" }); fetchAnnouncements(); }
    setSubmitting(false);
  }

  const priorityColor: Record<string, string> = {
    URGENT: "border-l-4 border-l-red-500",
    IMPORTANT: "border-l-4 border-l-amber-500",
    NORMAL: "border-l-4 border-l-blue-500",
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Community"
        subtitle="Announcements and community management"
        action={
          <Button size="sm" onClick={() => setShowModal(true)}><Plus size={16} /> Announce</Button>
        }
      />

      {loading ? (
        <div className="flex flex-col gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : announcements.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Megaphone size={28} />}
            title="No announcements yet"
            description="Publish your first community announcement."
            action={<Button size="sm" onClick={() => setShowModal(true)}><Plus size={14} /> Announce</Button>}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((ann) => (
            <div key={ann.id} className={`bg-navy-800 border border-navy-700 rounded-xl p-4 ${priorityColor[ann.priority] || ""}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-display font-bold text-white">{ann.title}</h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {ann.priority !== "NORMAL" && (
                    <span className={`status-pill border ${ann.priority === "URGENT" ? "bg-red-500/15 text-red-400 border-red-500/30" : "bg-amber-500/15 text-amber-400 border-amber-500/30"}`}>
                      {ann.priority}
                    </span>
                  )}
                  <span className="text-xs text-navy-500">{new Date(ann.created_at).toLocaleDateString("en-IN")}</span>
                </div>
              </div>
              <p className="text-sm text-navy-300">{ann.body}</p>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Announcement">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Title" placeholder="e.g., Water supply disruption on 10 Aug" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Message" placeholder="Write your announcement..." value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} required />
          <div>
            <label className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider">Priority</label>
            <div className="flex gap-2 mt-1">
              {["NORMAL", "IMPORTANT", "URGENT"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, priority: p }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-all ${form.priority === p
                    ? p === "URGENT" ? "bg-red-600 border-red-500 text-white" : p === "IMPORTANT" ? "bg-amber-600 border-amber-500 text-white" : "bg-blue-600 border-blue-500 text-white"
                    : "bg-navy-700 border-navy-600 text-navy-400"}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Publish</Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
