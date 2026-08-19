import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Card, EmptyState, PageHeader, Skeleton, StatusBadge, Toast } from "../../components/ui";

interface Announcement {
  id: string;
  organization_id: string;
  title: string;
  body: string;
  priority: "NORMAL" | "IMPORTANT" | "URGENT";
  created_at: string;
}

export default function AnnouncementsPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{msg:string;type:"success"|"error"}|null>(null);

  async function load() {
    if (!profile?.organization_id) { setLoading(false); return; }
    const { data, error } = await supabase.from("community_announcements")
      .select("*").eq("organization_id", profile.organization_id).is("archived_at", null)
      .order("created_at", { ascending: false });
    if (error) setToast({msg:error.message,type:"error"});
    setItems((data || []) as Announcement[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [profile?.organization_id]);
  useEffect(() => {
    if (!profile?.organization_id) return;
    const channel = supabase.channel(`tenant-announcements-${profile.organization_id}`)
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"community_announcements", filter:`organization_id=eq.${profile.organization_id}` },
        payload => setItems(prev => [payload.new as Announcement, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.organization_id]);

  return <div className="animate-fade-in">
    <PageHeader title="Announcements" subtitle="Announcements from your property owner" />
    {loading ? <div className="flex flex-col gap-3">{[1,2,3].map(i=><Skeleton key={i} className="h-28"/>)}</div>
      : items.length === 0 ? <Card><EmptyState icon={<Megaphone size={28}/>} title="No announcements" description="Your property owner has not posted any announcements yet."/></Card>
      : <div className="flex flex-col gap-3">{items.map(a=><Card key={a.id} className={a.priority==="URGENT"?"border-l-4 border-l-red-500":a.priority==="IMPORTANT"?"border-l-4 border-l-amber-500":"border-l-4 border-l-blue-500"}>
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display font-bold text-white">{a.title}</h3>
          {a.priority!=="NORMAL" && <StatusBadge status={a.priority}/>}
        </div>
        <p className="text-sm text-navy-300 mt-2 whitespace-pre-wrap">{a.body}</p>
        <p className="text-xs text-navy-500 mt-3">{new Date(a.created_at).toLocaleString("en-IN")}</p>
      </Card>)}</div>}
    {toast && <Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
  </div>;
}
