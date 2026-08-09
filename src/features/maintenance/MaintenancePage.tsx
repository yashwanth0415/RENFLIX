import { useEffect, useState } from "react";
import { Wrench, Plus, Search, Filter } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import {
  Button, Card, StatusBadge, Modal, Input, Select, Textarea, PageHeader, EmptyState, Skeleton, Toast,
} from "../../components/ui";
import type { MaintenanceRequest, MaintenancePriority, MaintenanceStatus, Property } from "../../lib/types";

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
  property_id: "",
  title: "",
  description: "",
  category: "Plumbing",
  priority: "MEDIUM" as MaintenancePriority,
};

export default function MaintenancePage() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
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
    if (profile?.organization_id) fetchAll();
    else setLoading(false);
  }, [profile]);

  async function fetchAll() {
    const [reqRes, propRes] = await Promise.all([
      supabase.from("maintenance_requests").select("*").eq("organization_id", profile!.organization_id!).order("created_at", { ascending: false }),
      supabase.from("properties").select("*").eq("organization_id", profile!.organization_id!).eq("status", "ACTIVE"),
    ]);
    setRequests(reqRes.data || []);
    setProperties(propRes.data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("maintenance_requests").insert({
      organization_id: profile!.organization_id!,
      property_id: form.property_id,
      title: form.title,
      description: form.description,
      category: form.category,
      priority: form.priority,
      status: "SUBMITTED",
    });
    if (error) setToast({ msg: error.message, type: "error" });
    else { setToast({ msg: "Request submitted!", type: "success" }); setShowModal(false); setForm(defaultForm); fetchAll(); }
    setSubmitting(false);
  }

  async function advanceStatus(req: MaintenanceRequest) {
    const next = NEXT_STATUS[req.status];
    if (!next) return;
    const { error } = await supabase
      .from("maintenance_requests")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", req.id);
    if (error) setToast({ msg: error.message, type: "error" });
    else { setToast({ msg: `Status → ${next.replace(/_/g, " ")}`, type: "success" }); setSelected(null); fetchAll(); }
  }

  const filtered = requests.filter((r) => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || r.status === filterStatus;
    const matchPriority = !filterPriority || r.priority === filterPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const openCount = requests.filter((r) => !["COMPLETED", "CLOSED", "VERIFIED"].includes(r.status)).length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Maintenance"
        subtitle={`${openCount} open request${openCount !== 1 ? "s" : ""}`}
        action={
          <Button onClick={() => setShowModal(true)} size="sm"><Plus size={16} /> New Request</Button>
        }
      />

      {/* Filters */}
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
        <select
          className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-navy-100 focus:outline-none focus:ring-2 focus:ring-blue-electric"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">All status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select
          className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-navy-100 focus:outline-none focus:ring-2 focus:ring-blue-electric"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
        >
          <option value="">All priority</option>
          {["LOW", "MEDIUM", "HIGH", "URGENT"].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Wrench size={28} />}
            title="No maintenance requests"
            description="Submit a maintenance request to track repairs."
            action={<Button onClick={() => setShowModal(true)} size="sm"><Plus size={14} /> New Request</Button>}
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((req) => {
            const prop = properties.find((p) => p.id === req.property_id);
            const next = NEXT_STATUS[req.status];
            return (
              <div
                key={req.id}
                className="bg-navy-800 border border-navy-700 rounded-xl p-4 card-hover group cursor-pointer"
                onClick={() => setSelected(req)}
              >
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
                  <div className="text-xs text-navy-600">
                    {new Date(req.created_at).toLocaleDateString("en-IN")}
                  </div>
                  {next && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(e) => { e.stopPropagation(); advanceStatus(req); }}
                    >
                      → {next.replace(/_/g, " ")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Request Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Maintenance Request">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select
            label="Property"
            value={form.property_id}
            onChange={(e) => setForm(f => ({ ...f, property_id: e.target.value }))}
            options={[{ value: "", label: "Select property" }, ...properties.map((p) => ({ value: p.id, label: p.name }))]}
          />
          <Input label="Title" placeholder="e.g., Leaking tap in kitchen" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} required />
          <Textarea label="Description" placeholder="Describe the issue in detail..." value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
              options={CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm(f => ({ ...f, priority: e.target.value as MaintenancePriority }))}
              options={[
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
                { value: "URGENT", label: "Urgent" },
              ]}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Submit Request</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title="Maintenance Request" width="max-w-lg">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 flex-wrap">
              <StatusBadge status={selected.priority} />
              <StatusBadge status={selected.status} />
            </div>
            <div>
              <div className="font-display font-bold text-white text-base mb-1">{selected.title}</div>
              <div className="text-xs text-navy-400 mb-3">{selected.category} · {properties.find(p => p.id === selected.property_id)?.name}</div>
              <p className="text-sm text-navy-300">{selected.description}</p>
            </div>
            <div className="bg-navy-900 rounded-lg p-3 text-xs text-navy-400 flex flex-col gap-1">
              <div className="flex justify-between"><span>Created</span><span>{new Date(selected.created_at).toLocaleDateString("en-IN")}</span></div>
              {selected.estimated_cost && <div className="flex justify-between"><span>Estimated cost</span><span>₹{selected.estimated_cost.toLocaleString("en-IN")}</span></div>}
              {selected.actual_cost && <div className="flex justify-between"><span>Actual cost</span><span>₹{selected.actual_cost.toLocaleString("en-IN")}</span></div>}
            </div>
            {/* Status flow */}
            <div>
              <div className="text-xs text-navy-500 font-display font-semibold uppercase tracking-wider mb-2">Status flow</div>
              <div className="flex flex-wrap gap-1">
                {STATUSES.map((s, i) => (
                  <div key={s} className={`text-[10px] px-2 py-1 rounded font-mono ${s === selected.status ? "bg-blue-600 text-white" : STATUSES.indexOf(selected.status) > i ? "bg-emerald-800/40 text-emerald-600" : "bg-navy-700 text-navy-500"}`}>
                    {s.replace(/_/g, " ")}
                  </div>
                ))}
              </div>
            </div>
            {NEXT_STATUS[selected.status] && (
              <Button onClick={() => advanceStatus(selected)}>
                Mark as {NEXT_STATUS[selected.status]?.replace(/_/g, " ")}
              </Button>
            )}
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
