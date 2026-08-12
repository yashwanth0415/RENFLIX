import { useEffect, useState, useRef } from "react";
import { MessageSquare, Plus, Send } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Button, EmptyState, Skeleton, Toast, Modal, Input } from "../../components/ui";

interface Conversation { id: string; title: string | null; created_at: string; updated_at: string; }
interface Message { id: string; conversation_id: string; sender_id: string; content: string; created_at: string; }

export default function MessagesPage() {
  const { profile, user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.organization_id) fetchConversations();
    else setLoading(false);
  }, [profile]);

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id);
      const channel = supabase
        .channel(`conv-${activeConv.id}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConv.id}` },
          (payload) => setMessages(prev => [...prev, payload.new as Message])
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeConv]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function fetchConversations() {
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("organization_id", profile!.organization_id!)
      .order("updated_at", { ascending: false });
    setConversations(data || []);
    setLoading(false);
  }

  async function fetchMessages(convId: string) {
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", convId).order("created_at");
    setMessages(data || []);
  }

  async function createConversation() {
    if (!newTitle.trim()) return;
    const { data, error } = await supabase.from("conversations").insert({
      organization_id: profile!.organization_id!,
      title: newTitle,
    }).select().single();
    if (error) { setToast({ msg: error.message, type: "error" }); return; }
    if (data) {
      await supabase.from("conversation_members").insert({ conversation_id: data.id, user_id: user!.id });
      setConversations(prev => [data, ...prev]);
      setActiveConv(data);
      setShowNew(false);
      setNewTitle("");
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !activeConv) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeConv.id,
      sender_id: user!.id,
      content: newMsg.trim(),
    });
    if (!error) {
      setNewMsg("");
      await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", activeConv.id);
    } else {
      setToast({ msg: error.message, type: "error" });
    }
    setSending(false);
  }

  return (
    <div className="animate-fade-in h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Messages</h1>
          <p className="text-sm text-navy-400">Conversations with tenants and team</p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)}><Plus size={16} /> New</Button>
      </div>

      <div className="flex gap-4 h-[calc(100%-64px)]">
        {/* Conversation list */}
        <div className="w-72 flex-shrink-0 bg-navy-800 border border-navy-700 rounded-xl overflow-y-auto">
          {loading ? (
            <div className="p-3 flex flex-col gap-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
              <MessageSquare size={28} className="text-navy-600 mb-2" />
              <p className="text-sm text-navy-500">No conversations yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv(conv)}
                  className={`text-left px-4 py-3 border-b border-navy-700 hover:bg-navy-700/40 transition-colors ${activeConv?.id === conv.id ? "bg-blue-600/15 border-l-2 border-l-blue-500" : ""}`}
                >
                  <div className="font-semibold text-sm text-white truncate">{conv.title || "Untitled"}</div>
                  <div className="text-xs text-navy-500">{new Date(conv.updated_at).toLocaleDateString("en-IN")}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message area */}
        <div className="flex-1 bg-navy-800 border border-navy-700 rounded-xl flex flex-col overflow-hidden">
          {!activeConv ? (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState icon={<MessageSquare size={28} />} title="Select a conversation" description="Choose a conversation from the left to start messaging." />
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-navy-700 flex-shrink-0">
                <div className="font-display font-semibold text-white">{activeConv.title}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-navy-500 text-sm">No messages yet. Send the first one!</div>
                )}
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${isMe ? "bg-blue-600 text-white rounded-br-sm" : "bg-navy-700 text-navy-200 rounded-bl-sm"}`}>
                        <p>{msg.content}</p>
                        <div className={`text-[10px] mt-1 ${isMe ? "text-blue-200" : "text-navy-500"}`}>
                          {new Date(msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={sendMessage} className="p-3 border-t border-navy-700 flex gap-2">
                <input
                  className="flex-1 bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric"
                  placeholder="Type a message..."
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                />
                <Button type="submit" size="sm" loading={sending}>
                  <Send size={15} />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Conversation">
        <div className="flex flex-col gap-4">
          <Input
            label="Conversation title"
            placeholder="e.g., Arjun Kumar — Unit A-101"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button onClick={createConversation}>Create</Button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
