import { useEffect, useState } from "react";
import { ArrowLeft, Edit, KeyRound, Plus, RefreshCw, ShieldCheck, Users, X } from "lucide-react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { Button, Card, Input, Toast } from "../../components/ui";

type ClientRow = { id: string; profile_id: string; username: string; display_name: string | null; active: boolean; created_at: string; properties: { property_display_id: string; name: string }[] };

export default function ClientAdminPanel() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [propertyIds, setPropertyIds] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => { fetchClients(); }, []);

  async function fetchClients() {
    setLoading(true);
    const { data, error } = await supabase.from("client_accounts").select("id,profile_id,username,display_name,active,created_at,client_properties(property_id,properties(property_display_id,name))").order("created_at", { ascending: false });
    if (error) setToast({ msg: error.message, type: "error" });
    const rows = (data || []).map((r: any) => ({ ...r, properties: (r.client_properties || []).map((x: any) => x.properties).filter(Boolean) })) as ClientRow[];
    setClients(rows); setLoading(false);
  }

  function openNew() { setEditing(null); setUsername(""); setPassword(""); setDisplayName(""); setPropertyIds(""); setActive(true); setShowForm(true); }
  function openEdit(client: ClientRow) { setEditing(client); setUsername(client.username); setDisplayName(client.display_name || ""); setPassword(""); setPropertyIds(client.properties.map((p) => p.property_display_id).join(", ")); setActive(client.active); setShowForm(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const ids = propertyIds.split(/[\s,]+/).map((x) => x.trim()).filter(Boolean);
    const payload = { clientId: editing?.id, username, password, displayName, propertyDisplayIds: ids, active };
    const { data, error } = await supabase.functions.invoke(editing ? "admin-update-client" : "admin-create-client", { body: payload });
    if (error) setToast({ msg: error.message, type: "error" });
    else if (data?.error) setToast({ msg: data.error, type: "error" });
    else { setToast({ msg: editing ? "Client updated." : "Client created and assigned to the selected properties.", type: "success" }); setShowForm(false); await fetchClients(); }
    setSaving(false);
  }

  return <div className="min-h-screen bg-navy-900 text-white p-5 sm:p-7"><div className="max-w-7xl mx-auto"><div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-7"><div><button onClick={() => navigate("/admin")} className="inline-flex items-center gap-2 text-sm text-navy-400 hover:text-white mb-3"><ArrowLeft size={15} /> Back to Admin</button><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center"><Users className="text-blue-400" size={21} /></div><div><h1 className="font-display font-bold text-3xl">Clients</h1><p className="text-navy-400 text-sm mt-1">Create client accounts, assign public properties and control access.</p></div></div></div><div className="flex gap-2"><Button variant="secondary" onClick={fetchClients}><RefreshCw size={14} className="mr-1" /> Refresh</Button><Button onClick={openNew}><Plus size={14} className="mr-1" /> Add Client</Button></div></div>

<div className="rounded-3xl border border-blue-400/15 bg-blue-500/[0.04] p-5 mb-5"><div className="flex items-start gap-3"><ShieldCheck className="text-blue-400 mt-0.5" size={18} /><div><div className="font-semibold">Public hosting rule</div><p className="text-xs text-navy-400 mt-1 leading-5">Adding a client automatically publishes each assigned property at <span className="text-blue-300 font-mono">/164xx</span>. The client can then edit only its public page and public photos.</p></div></div></div>

<Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-navy-700 text-left text-xs uppercase tracking-widest text-navy-500"><th className="px-5 py-4">Client</th><th className="px-5 py-4">Properties</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Created</th><th className="px-5 py-4 text-right">Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="p-10 text-center text-navy-500">Loading clients…</td></tr> : !clients.length ? <tr><td colSpan={5} className="p-10 text-center text-navy-500">No client accounts yet.</td></tr> : clients.map((client) => <tr key={client.id} className="border-b border-navy-800/70 hover:bg-navy-800/30"><td className="px-5 py-5"><div className="font-semibold text-white">{client.display_name || client.username}</div><div className="font-mono text-xs text-blue-300 mt-1">{client.username}</div></td><td className="px-5 py-5"><div className="flex flex-wrap gap-1.5">{client.properties.map((p) => <span key={p.property_display_id} title={p.name} className="px-2 py-1 rounded-lg bg-blue-500/10 text-blue-300 text-[11px] font-mono">{p.property_display_id}</span>)}</div></td><td className="px-5 py-5"><span className={`px-2.5 py-1 rounded-full text-xs ${client.active ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"}`}>{client.active ? "Active" : "Inactive"}</span></td><td className="px-5 py-5 text-navy-400">{new Date(client.created_at).toLocaleDateString("en-IN")}</td><td className="px-5 py-5 text-right"><Button variant="ghost" size="sm" onClick={() => openEdit(client)}><Edit size={14} /></Button></td></tr>)}</tbody></table></div></Card>

{showForm && <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}><div className="w-full max-w-xl rounded-3xl border border-navy-700 bg-navy-950 shadow-2xl"><div className="p-5 border-b border-navy-800 flex items-center justify-between"><div><h2 className="font-display font-bold text-xl">{editing ? "Edit Client" : "Add Client"}</h2><p className="text-xs text-navy-500 mt-1">Username and property assignments are managed by the admin.</p></div><button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-navy-800"><X size={18} /></button></div><form onSubmit={submit} className="p-5 space-y-4"><div className="grid sm:grid-cols-2 gap-4"><Input label="Client username" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={!!editing} placeholder="e.g. skylineproperties" /><Input label={editing ? "New password (optional)" : "Password"} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editing} minLength={8} placeholder="Minimum 8 characters" /></div><Input label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required placeholder="e.g. Skyline Properties" /><div><label className="text-xs text-navy-400">Property IDs</label><textarea value={propertyIds} onChange={(e) => setPropertyIds(e.target.value)} rows={4} required placeholder="16401, 16402, 16403" className="mt-1 w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-3 text-sm text-white outline-none focus:border-blue-400" /><p className="text-[11px] text-navy-500 mt-1">Enter one or multiple public property IDs separated by commas or spaces.</p></div>{editing && <label className="flex items-center gap-3 text-sm text-navy-300"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Client account active</label>}<div className="flex justify-end gap-2 pt-3 border-t border-navy-800"><Button variant="ghost" type="button" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" loading={saving}><KeyRound size={14} className="mr-1" />{editing ? "Save Client" : "Create Client"}</Button></div></form></div></div>}
{toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}</div></div>;
}
