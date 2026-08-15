import { useEffect, useState } from "react";
import { DoorOpen, Plus, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import {
  Button, Card, StatusBadge, Modal, Input, Select, PageHeader, EmptyState, Skeleton, Toast,
} from "../../components/ui";
import type { Unit, UnitStatus, Property } from "../../lib/types";

const UNIT_STATUSES: { value: UnitStatus; label: string }[] = [
  { value: "AVAILABLE", label: "Available" },
  { value: "OCCUPIED", label: "Occupied" },
  { value: "MAINTENANCE", label: "Under Maintenance" },
  { value: "RESERVED", label: "Reserved" },
  { value: "BLOCKED", label: "Blocked" },
];

interface UnitWithProperty extends Unit {
  property?: { name: string };
}

const defaultForm = {
  property_id: "",
  unit_number: "",
  name: "",
  unit_type: "",
  area: "",
  monthly_rent: "",
  security_deposit: "",
  status: "AVAILABLE" as UnitStatus,
};

export default function UnitsPage() {
  const { profile } = useAuth();
  const [units, setUnits] = useState<UnitWithProperty[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProp, setFilterProp] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (profile?.organization_id) fetchAll();
    else setLoading(false);
  }, [profile]);

  async function fetchAll() {
    const { data: props } = await supabase
      .from("properties")
      .select("id, name")
      .eq("organization_id", profile!.organization_id!)
      .eq("status", "ACTIVE");
    setProperties((props || []) as Property[]);

    if (!props?.length) { setLoading(false); return; }
    const propIds = props.map((p) => p.id);
    const { data } = await supabase
      .from("units")
      .select("*, property:property_id(name)")
      .in("property_id", propIds)
      .order("created_at", { ascending: false });
    setUnits(data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditUnit(null);
    setForm({ ...defaultForm, property_id: properties[0]?.id || "" });
    setShowModal(true);
  }

  function openEdit(u: Unit) {
    setEditUnit(u);
    setForm({
      property_id: u.property_id,
      unit_number: u.unit_number,
      name: u.name || "",
      unit_type: u.unit_type || "",
      area: u.area?.toString() || "",
      monthly_rent: u.monthly_rent.toString(),
      security_deposit: u.security_deposit?.toString() || "",
      status: u.status,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      property_id: form.property_id,
      unit_number: form.unit_number,
      name: form.name || null,
      unit_type: form.unit_type || null,
      area: form.area ? parseFloat(form.area) : null,
      monthly_rent: parseFloat(form.monthly_rent),
      security_deposit: form.security_deposit ? parseFloat(form.security_deposit) : null,
      status: form.status,
      organization_id: profile!.organization_id!,
    };

    if (editUnit) {
      const { error } = await supabase.from("units").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editUnit.id);
      if (error) setToast({ msg: error.message, type: "error" });
      else { setToast({ msg: "Unit updated!", type: "success" }); setShowModal(false); fetchAll(); }
    } else {
      const { error } = await supabase.from("units").insert(payload);
      if (error) setToast({ msg: error.message, type: "error" });
      else { setToast({ msg: "Unit added!", type: "success" }); setShowModal(false); fetchAll(); }
    }
    setSubmitting(false);
  }

  const filtered = units.filter((u) => {
    const matchSearch =
      u.unit_number.toLowerCase().includes(search.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(search.toLowerCase());
    const matchProp = !filterProp || u.property_id === filterProp;
    return matchSearch && matchProp;
  });

  const propOptions = [{ value: "", label: "All properties" }, ...properties.map((p) => ({ value: p.id, label: p.name }))];

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Units"
        subtitle="Manage all your rental units"
        action={
          <Button onClick={openAdd} size="sm">
            <Plus size={16} /> Add Unit
          </Button>
        }
      />

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
          <input
            className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric"
            placeholder="Search units..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-navy-100 focus:outline-none focus:ring-2 focus:ring-blue-electric min-w-[160px]"
          value={filterProp}
          onChange={(e) => setFilterProp(e.target.value)}
        >
          {propOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<DoorOpen size={28} />}
            title="No units found"
            description={properties.length === 0 ? "Add a property first, then add units." : "Add your first unit."}
            action={properties.length > 0 ? <Button onClick={openAdd} size="sm"><Plus size={14} /> Add Unit</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">Unit</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy-400 font-display uppercase tracking-wider hidden md:table-cell">Property</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-navy-400 font-display uppercase tracking-wider hidden sm:table-cell">Type</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">Rent</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-navy-700/50 hover:bg-navy-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{u.unit_number}</div>
                    {u.name && <div className="text-xs text-navy-500">{u.name}</div>}
                  </td>
                  <td className="px-4 py-3 text-navy-300 hidden md:table-cell">
                    {(u.property as any)?.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-navy-400 font-mono text-xs hidden sm:table-cell">{u.unit_type || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400 font-semibold">
                    ₹{u.monthly_rent.toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>Edit</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editUnit ? "Edit Unit" : "Add Unit"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Select
            label="Property"
            value={form.property_id}
            onChange={(e) => setForm(f => ({ ...f, property_id: e.target.value }))}
            options={properties.map((p) => ({ value: p.id, label: p.name }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Unit number" placeholder="A-101" value={form.unit_number} onChange={(e) => setForm(f => ({ ...f, unit_number: e.target.value }))} required />
            <Input label="Unit name" placeholder="Studio" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Type" placeholder="2BHK" value={form.unit_type} onChange={(e) => setForm(f => ({ ...f, unit_type: e.target.value }))} />
            <Input label="Area (sq ft)" type="number" value={form.area} onChange={(e) => setForm(f => ({ ...f, area: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Monthly rent (₹)" type="number" value={form.monthly_rent} onChange={(e) => setForm(f => ({ ...f, monthly_rent: e.target.value }))} required />
            <Input label="Deposit (₹)" type="number" value={form.security_deposit} onChange={(e) => setForm(f => ({ ...f, security_deposit: e.target.value }))} />
          </div>
          <Select label="Status" value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value as UnitStatus }))} options={UNIT_STATUSES} />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editUnit ? "Update" : "Add Unit"}</Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
