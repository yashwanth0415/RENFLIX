import { useEffect, useState, useRef } from "react";
import { MessageSquare, Send, ArrowLeft, UserRound } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Button, EmptyState, Skeleton, Toast, Select } from "../../components/ui";
import type { Tenant } from "../../lib/types";

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

export default function MessagesPage() {
  const { profile, user } = useAuth();
  const isTenant = profile?.role === "TENANT";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMsg, setNewMsg] = useState("");
  const [starting, setStarting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.organization_id || !user) {
      setLoading(false);
      return;
    }
    loadConversations();
    if (!isTenant) loadTenants();
  }, [profile?.organization_id, user?.id, isTenant]);

  useEffect(() => {
    if (!activeConv) return;
    loadMessages(activeConv.id);
    const channel = supabase.channel(`conv-${activeConv.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${activeConv.id}`,
      }, (payload) => setMessages((prev) => [...prev, payload.new as Message]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeConv?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversations() {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("organization_id", profile!.organization_id!)
      .order("updated_at", { ascending: false });
    if (error) {
      setToast({ msg: error.message, type: "error" });
    } else {
      setConversations((data || []) as Conversation[]);
    }
    setLoading(false);
  }

  async function loadTenants() {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("organization_id", profile!.organization_id!)
      .eq("status", "ACTIVE")
      .not("profile_id", "is", null)
      .order("full_name");
    if (error) setToast({ msg: error.message, type: "error" });
    setTenants((data || []) as Tenant[]);
  }

  async function loadMessages(convId: string) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at");
    if (error) setToast({ msg: error.message, type: "error" });
    setMessages((data || []) as Message[]);
  }

  async function startTenantConversation() {
    const tenant = tenants.find((t) => t.id === selectedTenantId);
    if (!tenant?.profile_id || !profile?.organization_id || !user) return;
    setStarting(true);
    try {
      const { data: conv, error } = await supabase.rpc(
        "start_user_conversation",
        {
          p_other_user_id: tenant.profile_id,
          p_title: `${tenant.full_name} · ${tenant.tenant_display_id || tenant.phone}`,
        }
      );

      if (error) throw error;
      if (!conv) throw new Error("Unable to create conversation.");

      const conversation = conv as Conversation;
      setConversations((prev) =>
        prev.some((c) => c.id === conversation.id)
          ? prev
          : [conversation, ...prev]
      );
      setActiveConv(conversation);
      setSelectedTenantId("");
    } catch (error) {
      setToast({
        msg: error instanceof Error
          ? error.message
          : "Unable to create tenant conversation.",
        type: "error",
      });
    } finally {
      setStarting(false);
    }
  }

  async function ensureTenantOwnerConversation() {
    if (!isTenant || !user || !profile?.organization_id) return;

    const { data: conv, error } = await supabase.rpc(
      "start_user_conversation",
      {
        p_other_user_id: null,
        p_title: "Property Owner",
      }
    );

    if (error) throw error;
    if (!conv) throw new Error("Unable to create owner conversation.");

    const conversation = conv as Conversation;
    setConversations((prev) =>
      prev.some((c) => c.id === conversation.id)
        ? prev
        : [conversation, ...prev]
    );
    setActiveConv(conversation);
  }

  useEffect(() => {
    if (!isTenant || loading || conversations.length > 0) return;
    ensureTenantOwnerConversation().catch((e) => setToast({
      msg: e instanceof Error ? e.message : "Unable to create owner conversation.",
      type: "error",
    }));
  }, [isTenant, loading]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !activeConv || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeConv.id,
      sender_id: user.id,
      content: newMsg.trim(),
    });
    if (error) {
      setToast({ msg: error.message, type: "error" });
    } else {
      setNewMsg("");
      await supabase.from("conversations").update({
        updated_at: new Date().toISOString(),
      }).eq("id", activeConv.id);
      setConversations((prev) => prev.map((c) =>
        c.id === activeConv.id ? { ...c, updated_at: new Date().toISOString() } : c
      ));
    }
    setSending(false);
  }

  return (
    <div className="animate-fade-in h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Messages</h1>
          <p className="text-sm text-navy-400">
            {isTenant ? "Message your property owner." : "Select a tenant to start a conversation."}
          </p>
        </div>
        {!isTenant && (
          <div className="flex items-center gap-2">
            <Select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              options={[
                { value: "", label: "Select tenant..." },
                ...tenants.map((t) => ({
                  value: t.id,
                  label: `${t.full_name}${t.tenant_display_id ? ` · ${t.tenant_display_id}` : ""}`,
                })),
              ]}
            />
            <Button size="sm" onClick={startTenantConversation} loading={starting} disabled={!selectedTenantId}>
              Start
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-4 h-[calc(100%-64px)]">
        <div className={`w-full md:w-72 flex-shrink-0 bg-navy-800 border border-navy-700 rounded-xl overflow-y-auto ${activeConv ? "hidden md:block" : "block"}`}>
          {loading ? (
            <div className="p-3 flex flex-col gap-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center">
              <MessageSquare size={28} className="text-navy-600 mb-2" />
              <p className="text-sm text-navy-500">{isTenant ? "Connecting to owner..." : "No conversations yet"}</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {conversations.map((conv) => (
                <button key={conv.id} onClick={() => setActiveConv(conv)}
                  className={`text-left px-4 py-3 border-b border-navy-700 hover:bg-navy-700/40 transition-colors ${activeConv?.id === conv.id ? "bg-blue-600/15 border-l-2 border-l-blue-500" : ""}`}>
                  <div className="font-semibold text-sm text-white truncate">{conv.title || "Conversation"}</div>
                  <div className="text-xs text-navy-500">{new Date(conv.updated_at).toLocaleDateString("en-IN")}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`flex-1 bg-navy-800 border border-navy-700 rounded-xl flex flex-col overflow-hidden ${!activeConv ? "hidden md:flex" : "flex"}`}>
          {!activeConv ? (
            <div className="flex-1 items-center justify-center hidden md:flex">
              <EmptyState icon={<UserRound size={28} />} title="Select a conversation" description={isTenant ? "Your conversation with the owner will appear here." : "Choose a tenant above and start a conversation."} />
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-navy-700 flex-shrink-0 flex items-center gap-2">
                <button className="md:hidden text-navy-400 hover:text-white p-1 -ml-1" onClick={() => setActiveConv(null)}>
                  <ArrowLeft size={20} />
                </button>
                <div className="font-display font-semibold text-white truncate">{activeConv.title}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.length === 0 && <div className="flex items-center justify-center h-full text-navy-500 text-sm">No messages yet. Send the first one!</div>}
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
                <input className="flex-1 bg-navy-700 border border-navy-600 rounded-lg px-3 py-2 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric"
                  placeholder="Type a message..." value={newMsg} onChange={(e) => setNewMsg(e.target.value)} />
                <Button type="submit" size="sm" loading={sending}><Send size={15} /></Button>
              </form>
            </>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
