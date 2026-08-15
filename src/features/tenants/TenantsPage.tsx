import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Users, Plus, Search, Phone, Mail } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import {
  Button, Card, StatusBadge, Modal, Input, Select, Textarea, PageHeader, EmptyState, Skeleton, Toast,
} from "../../components/ui";
import type { Tenant, TenantStatus, Unit, Property } from "../../lib/types";

const defaultForm = {
  full_name: "",
  email: "",
  phone: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  property_id: "",
  unit_id: "",
  move_in_date: "",
  status: "ACTIVE" as TenantStatus,
};

export default function TenantsPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (profile?.organization_id) fetchAll();
    else setLoading(false);
  }, [profile]);

  // Filter units based on selected property
  useEffect(() => {
    if (form.property_id) {
      const unitsForProperty = units.filter(u => u.property_id === form.property_id && u.status === "AVAILABLE");
      setFilteredUnits(unitsForProperty);
    } else {
      setFilteredUnits([]);
    }
    // Reset unit selection when property changes
    if (form.unit_id && !filteredUnits.find(u => u.id === form.unit_id)) {
      setForm(f => ({ ...f, unit_id: "" }));
    }
  }, [form.property_id, units]);

  async function fetchAll() {
    const [tenRes, propRes, unitRes] = await Promise.all([
      supabase.from("tenants").select("*").eq("organization_id", profile!.organization_id!).order("created_at", { ascending: false }),
      supabase.from("properties").select("*").eq("organization_id", profile!.organization_id!).eq("status", "ACTIVE"),
      supabase.from("units").select("*").in(
        "property_id",
        (await supabase.from("properties").select("id").eq("organization_id", profile!.organization_id!).eq("status", "ACTIVE")).data?.map(p => p.id) || []
      ),
    ]);
    setTenants(tenRes.data || []);
    setProperties(propRes.data || []);
    setUnits(unitRes.data || []);
    setLoading(false);
  }

  function openAdd() {
    setEditTenant(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEdit(t: Tenant) {
    setEditTenant(t);
    // Find the property for this tenant's unit
    let propertyId = "";
    if (t.unit_id) {
      const unit = units.find(u => u.id === t.unit_id);
      propertyId = unit?.property_id || "";
    }
    setForm({
      full_name: t.full_name,
      email: t.email || "",
      phone: t.phone,
      emergency_contact_name: t.emergency_contact_name || "",
      emergency_contact_phone: t.emergency_contact_phone || "",
      property_id: propertyId,
      unit_id: t.unit_id || "",
      move_in_date: t.move_in_date || "",
      status: t.status,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      organization_id: profile!.organization_id!,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone,
      emergency_contact_name: form.emergency_contact_name || null,
      emergency_contact_phone: form.emergency_contact_phone || null,
      unit_id: form.unit_id || null,
      move_in_date: form.move_in_date || null,
      status: form.status,
    };

    if (editTenant) {
      const { error } = await supabase.from("tenants").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editTenant.id);
      if (error) setToast({ msg: error.message, type: "error" });
      else {
        // Update unit status if assigned
        if (form.unit_id && form.status === "ACTIVE") {
          await supabase.from("units").update({ status: "OCCUPIED" }).eq("id", form.unit_id);
        }
        // If unit changed, free up old unit
        if (editTenant.unit_id && editTenant.unit_id !== form.unit_id) {
          await supabase.from("units").update({ status: "AVAILABLE" }).eq("id", editTenant.unit_id);
        }
        setToast({ msg: "Tenant updated!", type: "success" }); setShowModal(false); fetchAll();
      }
    } else {
      const { error } = await supabase.from("tenants").insert(payload);
      if (error) setToast({ msg: error.message, type: "error" });
      else {
        if (form.unit_id) await supabase.from("units").update({ status: "OCCUPIED" }).eq("id", form.unit_id);
        setToast({ msg: "Tenant added!", type: "success" }); setShowModal(false); fetchAll();
      }
    }
    setSubmitting(false);
  }

  const filtered = tenants.filter(
    (t) =>
      t.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.phone || "").includes(search) ||
      (t.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tenants"
        subtitle={`${tenants.filter(t => t.status === "ACTIVE").length} active tenants`}
        action={
          <Button onClick={openAdd} size="sm"><Plus size={16} /> Add Tenant</Button>
        }
      />

      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
        <input
          className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users size={28} />}
            title="No tenants yet"
            description="Add your first tenant to start tracking rent and maintenance."
            action={<Button onClick={openAdd} size="sm"><Plus size={14} /> Add Tenant</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <div
              key={t.id}
              className="bg-navy-800 border border-navy-700 rounded-xl p-4 card-hover group cursor-pointer"
              onClick={() => navigate(`/tenants/${t.tenant_display_id || t.id}`)}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white">{t.full_name[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-white truncate">{t.full_name}</div>
                  <StatusBadge status={t.status} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {t.phone && (
                  <div className="flex items-center gap-2 text-xs text-navy-400">
                    <Phone size={11} />
                    <span>{t.phone}</span>
                  </div>
                )}
                {t.email && (
                  <div className="flex items-center gap-2 text-xs text-navy-400">
                    <Mail size={11} />
                    <span className="truncate">{t.email}</span>
                  </div>
                )}
                {t.tenant_display_id && (
                  <div className="text-xs text-navy-500 font-mono">ID: {t.tenant_display_id}</div>
                )}
                {t.move_in_date && (
                  <div className="text-xs text-navy-500 mt-1">
                    Move-in: {new Date(t.move_in_date).toLocaleDateString("en-IN")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editTenant ? "Edit Tenant" : "Add Tenant"} width="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Full name" placeholder="Arjun Kumar" value={form.full_name} onChange={(e) => setForm(f => ({ ...f, full_name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} required />
            <Input label="Email" type="email" placeholder="arjun@email.com" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Emergency contact" placeholder="Contact name" value={form.emergency_contact_name} onChange={(e) => setForm(f => ({ ...f, emergency_contact_name: e.target.value }))} />
            <Input label="Emergency phone" type="tel" value={form.emergency_contact_phone} onChange={(e) => setForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} />
          </div>
          
          {/* Property Selection */}
          {properties.length > 0 && (
            <Select
              label="Property *"
              value={form.property_id}
              onChange={(e) => setForm(f => ({ ...f, property_id: e.target.value }))}
              options={[{ value: "", label: "Select a property" }, ...properties.map((p) => ({ value: p.id, label: p.name }))]}
              required
            />
          )}
          
          {/* Unit Selection (filtered by property) */}
          {filteredUnits.length > 0 && (
            <Select
              label="Unit *"
              value={form.unit_id}
              onChange={(e) => setForm(f => ({ ...f, unit_id: e.target.value }))}
              options={[{ value: "", label: "Select a unit" }, ...filteredUnits.map((u) => ({ value: u.id, label: `${u.unit_number}${u.name ? ` — ${u.name}` : ""} (₹${u.monthly_rent?.toLocaleString("en-IN")}/mo)` }))]}
              required
            />
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <Input label="Move-in date" type="date" value={form.move_in_date} onChange={(e) => setForm(f => ({ ...f, move_in_date: e.target.value }))} />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm(f => ({ ...f, status: e.target.value as TenantStatus }))}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "FORMER", label: "Former" },
              ]}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editTenant ? "Update" : "Add Tenant"}</Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}