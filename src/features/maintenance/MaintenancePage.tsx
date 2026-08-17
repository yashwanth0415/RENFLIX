import { useEffect, useState } from "react";
import { Wrench, Plus, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import {
  Button, Card, StatusBadge, Modal, Input, Select, Textarea,
  PageHeader, EmptyState, Skeleton, Toast,
} from "../../components/ui";
import type {
  MaintenanceRequest, MaintenancePriority, MaintenanceStatus, Property, Tenant, Unit,
} from "../../lib/types";

const CATEGORIES = [
  "Plumbing", "Electrical", "Carpentry", "Painting", "AC / HVAC",
  "Lift / Elevator", "Pest Control", "Cleaning", "Security", "Internet",
  "Gas", "Water Heater", "Flooring", "Roofing", "Appliance", "Other",
];

const STATUSES: MaintenanceStatus[] = [
  "SUBMITTED", "REVIEWED", "ASSIGNED", "ACCEPTED", "SCHEDULED",
  "IN_PROGRESS", "WAITING_FOR_PARTS", "COMPLETED", "VERIFIED", "CLOSED",
];

const NEXT_STATUS: Record<MaintenanceStatus, MaintenanceStatus | null> = {
  SUBMITTED: "REVIEWED",
  REVIEWED: "ASSIGNED",
  ASSIGNED: "ACCEPTED",
  ACCEPTED: "SCHEDULED",
  SCHEDULED: "IN_PROGRESS",
  IN_PROGRESS: "COMPLETED",
  WAITING_FOR_PARTS: "IN_PROGRESS",
  COMPLETED: "VERIFIED",
  VERIFIED: "CLOSED",
  CLOSED: null,
};

const defaultForm = {
  title: "",
  description: "",
  category: "Plumbing",
  priority: "MEDIUM" as MaintenancePriority,
};

export default function MaintenancePage() {
  const { profile, user } = useAuth();
  const isTenant = profile?.role === "TENANT";

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<MaintenanceRequest | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }
    fetchAll();
  }, [profile?.organization_id, user?.id, isTenant]);

  async function fetchAll() {
    setLoading(true);
    try {
      if (isTenant && user) {
        const { data: t, error: tenantError } = await supabase
          .from("tenants")
          .select("*")
          .eq("profile_id", user.id)
          .maybeSingle();
        if (tenantError) throw tenantError;
        setTenant((t as Tenant) || null);

        if (t?.unit_id) {
          const { data: u, error: unitError } = await supabase
            .from("units")
            .select("*")
            .eq("id", t.unit_id)
            .maybeSingle();
          if (unitError) throw unitError;
          setUnit((u as Unit) || null);

          if (u?.property_id) {
            const { data: prop } = await supabase
              .from("properties")
              .select("*")
              .eq("id", u.property_id)
              .maybeSingle();
            setProperties(prop ? [prop as Property] : []);
          }
        }
        // Tenants are intentionally NOT shown their request list/status.
        setRequests([]);
      } else {
        const [reqRes, propRes] = await Promise.all([
          supabase.from("maintenance_requests")
            .select("*")
            .eq("organization_id", profile!.organization_id!)
            .order("created_at", { ascending: false }),
          supabase.from("properties")
            .select("*")
            .eq("organization_id", profile!.organization_id!)
            .eq("status", "ACTIVE"),
        ]);
        if (reqRes.error) throw reqRes.error;
        if (propRes.error) throw propRes.error;
        setRequests((reqRes.data || []) as MaintenanceRequest[]);
        setProperties((propRes.data || []) as Property[]);
      }
    } catch (error) {
      setToast({
        msg: error instanceof Error ? error.message : "Unable to load maintenance.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleTenantSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.organization_id || !tenant || !unit) {
      setToast({ msg: "Your tenant account is not linked to a unit.", type: "error" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("maintenance_requests").insert({
      organization_id: profile.organization_id,
      property_id: unit.property_id,
      unit_id: unit.id,
      tenant_id: tenant.id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      priority: form.priority,
      status: "SUBMITTED",
    });
    setSubmitting(false);
    if (error) {
      setToast({ msg: error.message, type: "error" });
    } else {
      setToast({ msg: "Maintenance request submitted to the owner.", type: "success" });
      setShowModal(false);
      setForm(defaultForm);
    }
  }

  async function advanceStatus(req: MaintenanceRequest) {
    const next = NEXT_STATUS[req.status];
    if (!next || isTenant) return;
    const { error } = await supabase
      .from("maintenance_requests")
      .update({
        status: next,
        completed_date: next === "COMPLETED" ? new Date().toISOString().slice(0, 10) : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    if (error) {
      setToast({ msg: error.message, type: "error" });
    } else {
      setToast({ msg: `Status → ${next.replace(/_/g, " ")}`, type: "success" });
      setSelected(null);
      fetchAll();
    }
  }

  const filtered = requests.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)) &&
      (!filterStatus || r.status === filterStatus) &&
      (!filterPriority || r.priority === filterPriority)
    );
  });

  const openCount = requests.filter(
    (r) => !["COMPLETED", "CLOSED", "VERIFIED"].includes(r.status)
  ).length;

  if (isTenant) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Maintenance"
          subtitle="Report a maintenance issue to your property owner."
          action={
            <Button onClick={() => setShowModal(true)} size="sm">
              <Plus size={16} /> Make Request
            </Button>
          }
        />
        <Card>
          <EmptyState
            icon={<Wrench size={28} />}
            title="Need something repaired?"
            description="Create a maintenance request and the property owner will handle it. Your tenant portal does not show maintenance status or allow you to modify submitted requests."
            action={
              <Button onClick={() => setShowModal(true)} size="sm">
                <Plus size={14} /> Make Request
              </Button>
            }
          />
        </Card>

        <Modal open={showModal} onClose={() => !submitting && setShowModal(false)} title="New Maintenance Request">
          <form onSubmit={handleTenantSubmit} className="flex flex-col gap-4">
            <div className="rounded-lg bg-navy-900 border border-navy-700 p-3 text-xs text-navy-400">
              {unit ? `Unit ${unit.unit_number}` : "Your assigned unit"} · {properties[0]?.name || "Property"}
            </div>
            <Input
              label="Issue title"
              placeholder="e.g. Bathroom tap is leaking"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Textarea
              label="Describe the issue"
              placeholder="Explain what needs to be repaired..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
            />
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as MaintenancePriority })}
              options={[
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
                { value: "URGENT", label: "Urgent" },
              ]}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" loading={submitting}>Submit Request</Button>
            </div>
          </form>
        </Modal>

        {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Maintenance"
        subtitle={`${openCount} open request${openCount !== 1 ? "s" : ""}`}
      />
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
          <input
            className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric"
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-navy-100" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-navy-100" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
          <option value="">All priority</option>
          {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wrench size={28} />}
            title="No maintenance requests"
            description="Tenant requests will appear here when submitted."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((req) => {
            const prop = properties.find((p) => p.id === req.property_id);
            const next = NEXT_STATUS[req.status];
            return (
              <div key={req.id} className="bg-navy-800 border border-navy-700 rounded-xl p-4 card-hover group cursor-pointer" onClick={() => setSelected(req)}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <div className="font-display font-semibold text-white text-sm">{req.title}</div>
                    <div className="text-xs text-navy-400">{req.category} · {prop?.name || "Unknown property"}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={req.priority} />
                    <StatusBadge status={req.status} />
                  </div>
                </div>
                <p className="text-xs text-navy-500 line-clamp-2 mb-3">{req.description}</p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-navy-600">{new Date(req.created_at).toLocaleDateString("en-IN")}</div>
                  {next && (
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); advanceStatus(req); }}>
                      → {next.replace(/_/g, " ")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title="Maintenance Request" width="max-w-lg">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 flex-wrap"><StatusBadge status={selected.priority} /><StatusBadge status={selected.status} /></div>
            <div>
              <div className="font-display font-bold text-white text-base mb-1">{selected.title}</div>
              <div className="text-xs text-navy-400 mb-3">{selected.category}</div>
              <p className="text-sm text-navy-300">{selected.description}</p>
            </div>
            <div className="bg-navy-900 rounded-lg p-3 text-xs text-navy-400 flex flex-col gap-1">
              <div className="flex justify-between"><span>Created</span><span>{new Date(selected.created_at).toLocaleDateString("en-IN")}</span></div>
              {selected.estimated_cost != null && <div className="flex justify-between"><span>Estimated cost</span><span>₹{selected.estimated_cost.toLocaleString("en-IN")}</span></div>}
              {selected.actual_cost != null && <div className="flex justify-between"><span>Actual cost</span><span>₹{selected.actual_cost.toLocaleString("en-IN")}</span></div>}
            </div>
            <Select
              label="Update status"
              value={selected.status}
              onChange={async (e) => {
                const nextStatus = e.target.value as MaintenanceStatus;
                const { error } = await supabase
                  .from("maintenance_requests")
                  .update({
                    status: nextStatus,
                    completed_date: nextStatus === "COMPLETED" ? new Date().toISOString().slice(0, 10) : undefined,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", selected.id);
                if (error) {
                  setToast({ msg: error.message, type: "error" });
                } else {
                  setToast({ msg: `Status updated to ${nextStatus.replace(/_/g, " ")}.`, type: "success" });
                  setSelected(null);
                  fetchAll();
                }
              }}
              options={STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))}
            />
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
