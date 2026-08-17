import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Building2, CreditCard, DoorOpen, Pencil, Save, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import type { Payment, Tenant, Unit, Property } from "../../lib/types";
import { Button, Card, Input, PageHeader, StatusBadge, Toast } from "../../components/ui";

export default function TenantDashboardPage() {
  const { user, profile } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [latestPayment, setLatestPayment] = useState<Payment | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ emergency_contact_name: "", emergency_contact_phone: "", emergency_email: "" });
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function load() {
    if (!user) return;
    const { data: t } = await supabase.from("tenants").select("*").eq("profile_id", user.id).maybeSingle();
    if (!t) return;
    const tenantData = t as Tenant;
    setTenant(tenantData);
    setForm({
      emergency_contact_name: tenantData.emergency_contact_name || "",
      emergency_contact_phone: tenantData.emergency_contact_phone || "",
      emergency_email: (tenantData as Tenant & { emergency_email?: string | null }).emergency_email || "",
    });
    if (tenantData.unit_id) {
      const { data: u } = await supabase.from("units").select("*").eq("id", tenantData.unit_id).maybeSingle();
      if (u) {
        setUnit(u as Unit);
        const { data: p } = await supabase.from("properties").select("*").eq("id", (u as Unit).property_id).maybeSingle();
        if (p) setProperty(p as Property);
      }
    }
    const { data: payments } = await supabase.from("payments").select("*").eq("tenant_id", tenantData.id).order("due_date", { ascending: false }).limit(1);
    setLatestPayment((payments?.[0] as Payment | undefined) || null);
  }

  useEffect(() => { load(); }, [user?.id]);

  async function saveEmergency() {
    if (!tenant) return;
    setSaving(true);
    const { error } = await supabase.from("tenants").update({
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
      emergency_email: form.emergency_email.trim().toLowerCase() || null,
      updated_at: new Date().toISOString(),
    }).eq("id", tenant.id);
    setSaving(false);
    if (error) setToast({ msg: error.message, type: "error" });
    else { setEditing(false); setToast({ msg: "Emergency contact updated.", type: "success" }); load(); }
  }

  const amount = latestPayment?.amount || unit?.monthly_rent || 0;
  const isDue = latestPayment && latestPayment.status !== "PAID" && latestPayment.status !== "WAIVED" && latestPayment.status !== "CANCELLED";

  return <div className="animate-fade-in">
    <PageHeader title={`Welcome, ${profile?.full_name?.split(" ")[0] || "Tenant"}`} subtitle="Your RENFLIX rental dashboard" />

    <div className="grid md:grid-cols-3 gap-4 mb-5">
      <Card><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Building2 size={20} className="text-blue-400" /></div><div><p className="text-xs text-navy-500 uppercase">Property</p><p className="font-semibold text-white">{property?.name || "—"}</p></div></div></Card>
      <Card><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-violet-500/10"><DoorOpen size={20} className="text-violet-400" /></div><div><p className="text-xs text-navy-500 uppercase">Unit</p><p className="font-semibold text-white">{unit?.unit_number || "—"}</p></div></div></Card>
      <Card><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><CreditCard size={20} className="text-emerald-400" /></div><div><p className="text-xs text-navy-500 uppercase">Monthly Rent</p><p className="font-semibold text-emerald-400">₹{amount.toLocaleString("en-IN")}</p></div></div></Card>
    </div>

    <div className="grid lg:grid-cols-2 gap-5">
      <Card>
        <div className="flex justify-between items-center mb-5"><div><h2 className="text-lg font-bold text-white">My Details</h2><p className="text-xs text-navy-500 mt-1">Account information</p></div><Button size="sm" variant="secondary" onClick={() => setEditing(v => !v)}>{editing ? <><X size={14}/> Cancel</> : <><Pencil size={14}/> Edit</>}</Button></div>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <Info label="Full name" value={tenant?.full_name || profile?.full_name || "—"} />
          <Info label="Email" value={tenant?.email || profile?.email || "—"} />
          <Info label="Phone" value={tenant?.phone || profile?.phone || "—"} />
          <Info label="Unit type" value={unit?.unit_type || "—"} />
          <Info label="Move-in date" value={tenant?.move_in_date ? new Date(tenant.move_in_date).toLocaleDateString("en-IN") : "—"} />
          <Info label="Tenant ID" value={tenant?.tenant_display_id || tenant?.id?.slice(0, 8).toUpperCase() || "—"} />
        </div>
        {editing && <div className="mt-5 pt-5 border-t border-navy-700 grid sm:grid-cols-2 gap-3">
          <Input label="Emergency contact" value={form.emergency_contact_name} onChange={e => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))} />
          <Input label="Emergency phone" type="tel" value={form.emergency_contact_phone} onChange={e => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} />
          <Input label="Emergency email" type="email" value={form.emergency_email} onChange={e => setForm(f => ({ ...f, emergency_email: e.target.value }))} />
          <div className="flex items-end"><Button onClick={saveEmergency} loading={saving}><Save size={15}/> Save changes</Button></div>
        </div>}
      </Card>

      <Card>
        <div className="flex justify-between items-center mb-4"><div><h2 className="text-lg font-bold text-white">Latest Payment</h2><p className="text-xs text-navy-500">Your rent status</p></div>{latestPayment && <StatusBadge status={latestPayment.status} />}</div>
        {latestPayment ? <div><div className="text-3xl font-bold text-white mb-1">₹{latestPayment.amount.toLocaleString("en-IN")}</div><p className="text-sm text-navy-400 mb-4">Due {latestPayment.due_date ? new Date(latestPayment.due_date).toLocaleDateString("en-IN") : "—"}</p>{isDue ? <Link to="/payments"><Button className="w-full">Pay Now</Button></Link> : <p className="text-sm text-emerald-400">Payment completed. Your receipt is available in Payments.</p>}</div> : <div><p className="text-sm text-navy-400 mb-4">No payment has been generated yet.</p><Link to="/payments"><Button variant="secondary">Open Payments</Button></Link></div>}
      </Card>
    </div>
    {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
  </div>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-navy-500 mb-1">{label}</p><p className="text-white font-medium break-words">{value}</p></div>; }
