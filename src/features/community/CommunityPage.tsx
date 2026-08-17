import { useEffect, useState } from "react";
import { Globe, Plus, Megaphone, Trash2 } from "lucide-react";
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
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (profile?.organization_id) fetchAnnouncements();
    else setLoading(false);
  }, [profile?.organization_id]);

  useEffect(() => {
    if (!profile?.organization_id) return;
    const channel = supabase.channel("community-announcements")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_announcements", filter: `organization_id=eq.${profile.organization_id}` },
        (payload) => setAnnouncements(prev => [payload.new as Announcement, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.organization_id]);

  async function fetchAnnouncements() {
    const { data, error } = await supabase.from("community_announcements").select("*")
      .eq("organization_id", profile!.organization_id!).order("created_at", { ascending: false });
    if (error) setToast({ msg: error.message, type: "error" });
    setAnnouncements((data || []) as Announcement[]);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.organization_id) return;
    setSubmitting(true);
    const { data: authData } = await supabase.auth.getUser();
    const { error } = await supabase.from("community_announcements").insert({
      organization_id: profile.organization_id, created_by: authData.user?.id || null,
      title: form.title.trim(), body: form.body.trim(), priority: form.priority,
    });
    if (error) setToast({ msg: error.message, type: "error" });
    else {
      setToast({ msg: "Announcement published and tenants notified.", type: "success" });
      setShowModal(false); setForm({ title: "", body: "", priority: "NORMAL" }); fetchAnnouncements();
    }
    setSubmitting(false);
  }

  function toggle(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function deleteSelected() {
    if (!selectedIds.length) {
      setToast({ msg: "Select at least one announcement.", type: "error" });
      return;
    }
    if (!confirm(`Delete ${selectedIds.length} selected announcement(s)? This will remove them from the database.`)) return;
    const { error } = await supabase.rpc("delete_community_announcements", { p_ids: selectedIds });
    if (error) {
      setToast({ msg: error.message, type: "error" });
      return;
    }
    setAnnouncements(prev => prev.filter(a => !selectedIds.includes(a.id)));
    setSelectedIds([]); setSelectionMode(false);
    setToast({ msg: "Selected announcements deleted.", type: "success" });
  }

  const priorityColor: Record<string, string> = {
    URGENT: "border-l-4 border-l-red-500", IMPORTANT: "border-l-4 border-l-amber-500", NORMAL: "border-l-4 border-l-blue-500",
  };

  return <div className="animate-fade-in">
    <PageHeader title="Community" subtitle="Announcements and community management" action={
      <div className="flex items-center gap-2">
        {selectionMode ? (
          <Button variant="secondary" size="sm" onClick={deleteSelected} disabled={!selectedIds.length}><Trash2 size={15}/> Delete{selectedIds.length ? ` (${selectedIds.length})` : ""}</Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setSelectionMode(true)}>Select</Button>
        )}
        <Button size="sm" onClick={() => setShowModal(true)}><Plus size={16}/> Announce</Button>
      </div>
    } />

    {loading ? <div className="flex flex-col gap-3">{[1,2,3,4].map(i=><Skeleton key={i} className="h-28"/>)}</div>
      : announcements.length === 0 ? <Card><EmptyState icon={<Megaphone size={28}/>} title="No announcements yet" description="Publish your first community announcement." action={<Button size="sm" onClick={()=>setShowModal(true)}><Plus size={14}/> Announce</Button>}/></Card>
      : <div className="flex flex-col gap-3">{announcements.map(ann =>
        <div key={ann.id} className={`bg-navy-800 border border-navy-700 rounded-xl p-4 ${priorityColor[ann.priority] || ""} flex gap-3`}>
          {selectionMode && <button type="button" onClick={()=>toggle(ann.id)} className="mt-1 flex-shrink-0"><span className={`inline-flex w-5 h-5 rounded border ${selectedIds.includes(ann.id) ? "bg-blue-600 border-blue-500" : "border-navy-500"}`}>{selectedIds.includes(ann.id) && <span className="text-white text-xs m-auto">✓</span>}</span></button>}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-display font-bold text-white">{ann.title}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">{ann.priority !== "NORMAL" && <span className={`status-pill border ${ann.priority==="URGENT"?"bg-red-500/15 text-red-400 border-red-500/30":"bg-amber-500/15 text-amber-400 border-amber-500/30"}`}>{ann.priority}</span>}<span className="text-xs text-navy-500">{new Date(ann.created_at).toLocaleDateString("en-IN")}</span></div>
            </div>
            <p className="text-sm text-navy-300">{ann.body}</p>
          </div>
        </div>
      )}</div>}

    <Modal open={showModal} onClose={()=>setShowModal(false)} title="New Announcement">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Title" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required />
        <Textarea label="Message" value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} required />
        <div><label className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider">Priority</label><div className="flex gap-2 mt-1">{["NORMAL","IMPORTANT","URGENT"].map(p=><button key={p} type="button" onClick={()=>setForm(f=>({...f,priority:p}))} className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${form.priority===p ? "bg-blue-600 border-blue-500 text-white":"bg-navy-700 border-navy-600 text-navy-400"}`}>{p}</button>)}</div></div>
        <div className="flex gap-2 justify-end pt-2"><Button variant="ghost" type="button" onClick={()=>setShowModal(false)}>Cancel</Button><Button type="submit" loading={submitting}>Publish</Button></div>
      </form>
    </Modal>
    {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
  </div>;
}
