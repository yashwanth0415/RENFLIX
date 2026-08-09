import { useEffect, useState } from "react";
import { FileText, Plus, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import {
  Button, Card, StatusBadge, Modal, Input, Select, Textarea, PageHeader, EmptyState, Skeleton, Toast,
} from "../../components/ui";
import type { Lease, LeaseStatus, Tenant, Property, Unit } from "../../lib/types";

const defaultForm = {
  property_id: "",
  unit_id: "",
  tenant_id: "",
  start_date: "",
  end_date: "",
  monthly_rent: "",
  security_deposit: "",
  notice_period_days: "30",
  late_fee_percentage: "2",
  payment_day: "5",
  status: "ACTIVE" as LeaseStatus,
  notes: "",
};

export default function LeasesPage() {
  const { profile } = useAuth();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (profile?.organization_id) fetchAll();
    else setLoading(false);
  }, [profile]);

  async function fetchAll() {
    const [leaseRes, propRes, tenRes] = await Promise.all([
      supabase.from("leases").select("*").eq("organization_id", profile!.organization_id!).order("created_at", { ascending: false }),
      supabase.from("properties").select("*").eq("organization_id", profile!.organization_id!).eq("status", "ACTIVE"),
      supabase.from("tenants").select("*").eq("organization_id", profile!.organization_id!).eq("status", "ACTIVE"),
    ]);
    setLeases(leaseRes.data || []);
    setProperties(propRes.data || []);
    setTenants(tenRes.data || []);
    setLoading(false);
  }

  async function loadUnits(propId: string) {
    const { data } = await supabase.from("units").select("*").eq("property_id", propId);
    setUnits(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("leases").insert({
      organization_id: profile!.organization_id!,
      property_id: form.property_id,
      unit_id: form.unit_id,
      tenant_id: form.tenant_id,
      start_date: form.start_date,
      end_date: form.end_date,
      monthly_rent: parseFloat(form.monthly_rent),
      security_deposit: parseFloat(form.security_deposit),
      notice_period_days: parseInt(form.notice_period_days),
      late_fee_percentage: parseFloat(form.late_fee_percentage),
      payment_day: parseInt(form.payment_day),
      status: form.status,
      notes: form.notes || null,
    });
    if (error) setToast({ msg: error.message, type: "error" });
    else {
      // Update unit status
      if (form.unit_id) await supabase.from("units").update({ status: "OCCUPIED" }).eq("id", form.unit_id);
      setToast({ msg: "Lease created!", type: "success" });
      setShowModal(false);
      setForm(defaultForm);
      fetchAll();
    }
    setSubmitting(false);
  }

  async function updateLeaseStatus(id: string, status: LeaseStatus) {
    await supabase.from("leases").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    setToast({ msg: `Lease ${status.toLowerCase()}`, type: "success" });
    fetchAll();
  }

  const filtered = leases.filter((l) => {
    const tenant = tenants.find((t) => t.id === l.tenant_id);
    const prop = properties.find((p) => p.id === l.property_id);
    return (
      (tenant?.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (prop?.name || "").toLowerCase().includes(search.toLowerCase())
    );
  });

  const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Leases"
        subtitle={`${leases.filter(l => l.status === "ACTIVE").length} active leases`}
        action={<Button onClick={() => setShowModal(true)} size="sm"><Plus size={16} /> New Lease</Button>}
      />

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
        <input
          className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric"
          placeholder="Search by tenant or property..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText size={28} />}
            title="No leases yet"
            description="Create a lease to track rent agreements."
            action={<Button onClick={() => setShowModal(true)} size="sm"><Plus size={14} /> New Lease</Button>}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((lease) => {
            const tenant = tenants.find((t) => t.id === lease.tenant_id);
            const prop = properties.find((p) => p.id === lease.property_id);
            const days = daysUntil(lease.end_date);
            const expiringSoon = days <= 30 && days >= 0 && lease.status === "ACTIVE";
            return (
              <div key={lease.id} className={`bg-navy-800 border rounded-xl p-4 ${expiringSoon ? "border-amber-500/40" : "border-navy-700"}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="font-display font-bold text-white">{tenant?.full_name || "Unknown Tenant"}</div>
                    <div className="text-xs text-navy-400">{prop?.name || "Unknown Property"}</div>
                  </div>
                  <div className="flex gap-1">
                    <StatusBadge status={lease.status} />
                    {expiringSoon && <span className="status-pill border bg-amber-500/15 text-amber-400 border-amber-500/30">Expiring in {days}d</span>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <div className="text-navy-500 mb-0.5">Monthly rent</div>
                    <div className="font-mono font-bold text-emerald-400">₹{lease.monthly_rent.toLocaleString("en-IN")}</div>
                  </div>
                  <div>
                    <div className="text-navy-500 mb-0.5">Start date</div>
                    <div className="text-navy-300">{new Date(lease.start_date).toLocaleDateString("en-IN")}</div>
                  </div>
                  <div>
                    <div className="text-navy-500 mb-0.5">End date</div>
                    <div className="text-navy-300">{new Date(lease.end_date).toLocaleDateString("en-IN")}</div>
                  </div>
                </div>
                {lease.status === "ACTIVE" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="secondary" onClick={() => updateLeaseStatus(lease.id, "RENEWED")}>Renew</Button>
                    <Button size="sm" variant="danger" onClick={() => updateLeaseStatus(lease.id, "TERMINATED")}>Terminate</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Lease Agreement" width="max-w-xl">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select
            label="Property"
            value={form.property_id}
            onChange={(e) => { setForm(f => ({ ...f, property_id: e.target.value, unit_id: "" })); loadUnits(e.target.value); }}
            options={[{ value: "", label: "Select property" }, ...properties.map((p) => ({ value: p.id, label: p.name }))]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Unit"
              value={form.unit_id}
              onChange={(e) => setForm(f => ({ ...f, unit_id: e.target.value }))}
              options={[{ value: "", label: "Select unit" }, ...units.map((u) => ({ value: u.id, label: u.unit_number }))]}
            />
            <Select
              label="Tenant"
              value={form.tenant_id}
              onChange={(e) => setForm(f => ({ ...f, tenant_id: e.target.value }))}
              options={[{ value: "", label: "Select tenant" }, ...tenants.map((t) => ({ value: t.id, label: t.full_name }))]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start date" type="date" value={form.start_date} onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))} required />
            <Input label="End date" type="date" value={form.end_date} onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monthly rent (₹)" type="number" value={form.monthly_rent} onChange={(e) => setForm(f => ({ ...f, monthly_rent: e.target.value }))} required />
            <Input label="Security deposit (₹)" type="number" value={form.security_deposit} onChange={(e) => setForm(f => ({ ...f, security_deposit: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Notice period (days)" type="number" value={form.notice_period_days} onChange={(e) => setForm(f => ({ ...f, notice_period_days: e.target.value }))} />
            <Input label="Late fee (%)" type="number" step="0.1" value={form.late_fee_percentage} onChange={(e) => setForm(f => ({ ...f, late_fee_percentage: e.target.value }))} />
            <Input label="Payment day" type="number" min="1" max="31" value={form.payment_day} onChange={(e) => setForm(f => ({ ...f, payment_day: e.target.value }))} />
          </div>
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Create Lease</Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
