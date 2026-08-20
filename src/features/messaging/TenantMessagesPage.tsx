import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, UserRound } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Button, Card, EmptyState, Skeleton, Toast } from "../../components/ui";

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}
interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function TenantMessagesPage() {
  const { profile, user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [ownerName, setOwnerName] = useState("Property Owner");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.organization_id || !user) { setLoading(false); return; }
    (async () => {
      try {
        const { data, error } = await supabase
          .from("conversations")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .is("archived_at", null)
          .order("updated_at", { ascending: false });
        if (error) throw error;

        const rows = (data || []) as Conversation[];
        const ids = rows.map((row) => row.id);
        let tenantConversation: Conversation | null = null;
        if (ids.length) {
          const { data: members } = await supabase
            .from("conversation_members")
            .select("conversation_id,user_id")
            .in("conversation_id", ids);
          tenantConversation = rows.find((row) => (members || []).some((m: any) => m.conversation_id === row.id && m.user_id === user.id)) || null;
        }
        if (!tenantConversation) {
          const { data: created, error: createError } = await supabase.rpc("start_user_conversation", { p_other_user_id: null, p_title: "Property Owner" });
          if (createError) throw createError;
          tenantConversation = created as Conversation;
        }
        if (tenantConversation) {
          const resolvedOwnerName = tenantConversation.title && !["Property Owner", "Conversation", "Tenant Conversation"].includes(tenantConversation.title)
            ? tenantConversation.title
            : "Property Owner";
          setOwnerName(resolvedOwnerName);
          tenantConversation.title = resolvedOwnerName;
          setConversation(tenantConversation);
        }
      } catch (e) {
        setToast({ msg: e instanceof Error ? e.message : "Unable to load messages.", type: "error" });
      } finally { setLoading(false); }
    })();
  }, [profile?.organization_id, user?.id]);

  useEffect(() => {
    if (!conversation) return;
    (async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", conversation.id).order("created_at");
      if (error) setToast({ msg: error.message, type: "error" });
      else setMessages((data || []) as Message[]);
    })();
    const channel = supabase.channel(`tenant-conv-${conversation.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversation.id}` }, payload => {
        setMessages(prev => prev.some(m => m.id === (payload.new as Message).id) ? prev : [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversation?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !conversation || !newMsg.trim()) return;
    setSending(true);
    const content = newMsg.trim();
    const { error } = await supabase.from("messages").insert({ conversation_id: conversation.id, sender_id: user.id, content });
    if (error) setToast({ msg: error.message, type: "error" });
    else { setNewMsg(""); await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation.id); }
    setSending(false);
  }

  if (loading) return <div className="animate-fade-in"><div className="mb-4"><Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-56 mt-2" /></div><Card><Skeleton className="h-[55vh]" /></Card></div>;

  return (
    <div className="animate-fade-in h-[calc(100vh-120px)] min-h-0 flex flex-col">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold text-white">Messages</h1>
        <p className="text-sm text-navy-400">Message your property owner.</p>
      </div>
      <Card className="flex-1 min-h-0 flex flex-col overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-navy-700 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/15 text-blue-300 flex items-center justify-center"><UserRound size={18} /></div>
          <div className="min-w-0"><p className="font-semibold text-white truncate">{ownerName}</p><p className="text-xs text-navy-500">Property Owner</p></div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!messages.length ? <EmptyState icon={<MessageSquare size={28} />} title="No messages yet" description="Start the conversation with your property owner." /> : messages.map(m => {
            const mine = m.sender_id === user?.id;
            return <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${mine ? "bg-blue-600 text-white rounded-br-md" : "bg-navy-700 text-white rounded-bl-md"}`}>
                {!mine && <div className="text-[10px] font-semibold text-blue-300 mb-1">{ownerName}</div>}
                <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`text-[10px] mt-1 ${mine ? "text-blue-100/70" : "text-navy-500"}`}>{new Date(m.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>;
          })}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={sendMessage} className="border-t border-navy-700 p-3 flex gap-2">
          <input value={newMsg} onChange={e => setNewMsg(e.target.value)} className="flex-1 min-w-0 bg-navy-900 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" placeholder={`Message ${ownerName}...`} />
          <Button type="submit" loading={sending} disabled={!newMsg.trim()}><Send size={15} /></Button>
        </form>
      </Card>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
