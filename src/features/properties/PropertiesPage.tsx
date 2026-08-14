import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Building2, Plus, Search, MapPin, Grid, List } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import {
  Button,
  Card,
  StatusBadge,
  Modal,
  Input,
  Select,
  Textarea,
  PageHeader,
  EmptyState,
  Skeleton,
  Toast,
} from "../../components/ui";
import type { Property, PropertyType, PropertyStatus } from "../../lib/types";

const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: "HOUSE", label: "House" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "PG", label: "PG (Paying Guest)" },
  { value: "HOSTEL", label: "Hostel" },
  { value: "COLIVING", label: "Co-living" },
  { value: "VILLA", label: "Villa" },
  { value: "GATED_COMMUNITY", label: "Gated Community" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "SHOP", label: "Shop" },
  { value: "OFFICE", label: "Office" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "PLOT", label: "Plot" },
  { value: "LAND", label: "Land" },
  { value: "MIXED", label: "Mixed Use" },
];

const PROPERTY_IMAGES: Record<string, string> = {
  APARTMENT: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop&auto=format",
  HOUSE: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop&auto=format",
  VILLA: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&h=400&fit=crop&auto=format",
  OFFICE: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop&auto=format",
  COMMERCIAL: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop&auto=format",
  PG: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&h=400&fit=crop&auto=format",
  HOSTEL: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&h=400&fit=crop&auto=format",
  DEFAULT: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop&auto=format",
};

const defaultForm = {
  name: "",
  property_type: "APARTMENT" as PropertyType,
  description: "",
  address: "",
  city: "Hyderabad",
  state: "Telangana",
  country: "India",
  postal_code: "",
  status: "ACTIVE" as PropertyStatus,
};

export default function PropertiesPage() {
  const { profile, user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showModal, setShowModal] = useState(false);
  const [editProperty, setEditProperty] = useState<Property | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const { propertyId } = useParams<{ propertyId: string }>();

  useEffect(() => {
    if (profile?.organization_id) {
      if (propertyId) {
        // Fetch specific property details
        async function fetchPropertyDetails() {
          const { data } = await supabase
            .from("properties")
            .select("*")
            .eq("id", propertyId)
            .single();
          if (data) {
            setEditProperty(data as Property);
            setForm({
              name: data.name,
              property_type: data.property_type,
              description: data.description || "",
              address: data.address,
              city: data.city,
              state: data.state,
              country: data.country,
              postal_code: data.postal_code || "",
              status: data.status,
            });
          }
        }
        fetchPropertyDetails();
      } else {
        fetchProperties();
      }
    } else setLoading(false);
  }, [profile, propertyId]);

  async function fetchProperties() {

  function openAdd() {
    setEditProperty(null);
    setForm(defaultForm);
    setShowModal(true);
  }

  function openEdit(p: Property) {
    setEditProperty(p);
    setForm({
      name: p.name,
      property_type: p.property_type,
      description: p.description || "",
      address: p.address,
      city: p.city,
      state: p.state,
      country: p.country,
      postal_code: p.postal_code || "",
      status: p.status,
    });
    setShowModal(true);
  }

  function openProperty(propertyId: string) {
    // Navigate to property detail view - will show property at top of page
    // The router will render PropertiesPage with propertyId param
    // We just set the state to show the selected property
    // No navigation needed since it's the same component with different params
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...form,
      organization_id: profile!.organization_id!,
      created_by: user!.id,
      image_url: PROPERTY_IMAGES[form.property_type] || PROPERTY_IMAGES.DEFAULT,
    };

    if (editProperty) {
      const { error } = await supabase
        .from("properties")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editProperty.id);
      if (error) setToast({ msg: error.message, type: "error" });
      else { setToast({ msg: "Property updated!", type: "success" }); setShowModal(false); fetchProperties(); }
    } else {
      const { error } = await supabase.from("properties").insert(payload);
      if (error) setToast({ msg: error.message, type: "error" });
      else { setToast({ msg: "Property added!", type: "success" }); setShowModal(false); fetchProperties(); }
    }
    setSubmitting(false);
  }

  async function archiveProperty(id: string) {
    if (!confirm("Archive this property?")) return;
    await supabase.from("properties").update({ status: "ARCHIVED" }).eq("id", id);
    setToast({ msg: "Property archived", type: "success" });
    fetchProperties();
  }

  const filtered = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.city.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Properties"
        subtitle="All your properties in one place"
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}
              className="p-2 rounded-lg bg-navy-700 text-navy-300 hover:text-white transition-colors"
            >
              {viewMode === "grid" ? <List size={18} /> : <Grid size={18} />}
            </button>
            <Button onClick={openAdd} size="sm">
              <Plus size={16} />
              Add Property
            </Button>
          </div>
        }
      />

      {/* Property Detail Section */}
      {propertyId && editProperty && (
        <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 mb-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <Building2 size={20} className="text-blue-400" />
            <div>
              <h2 className="font-display font-bold text-2xl text-white">
                {editProperty.name}
              </h2>
              <div className="text-sm text-navy-400">
                {editProperty.city}, {editProperty.state}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-navy-500 uppercase tracking-wider">Status</div>
              <StatusBadge status={editProperty.status} />
            </div>
            <div>
              <div className="text-xs text-navy-500 uppercase tracking-wider">Type</div>
              <span className="font-medium text-white">{editProperty.property_type.replace(/_/g, " ")}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-navy-700/50">
            <div className="text-xs text-navy-500 uppercase tracking-wider">Description</div>
            <p className="text-navy-400 text-sm leading-relaxed">
              {editProperty.description || "No description"}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-5">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500" />
        <input
          className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric"
          placeholder="Search properties..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-60" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 size={28} />}
            title="No properties yet"
            description="Add your first property to start managing it."
            action={<Button onClick={openAdd} size="sm"><Plus size={14} /> Add Property</Button>}
          />
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              onEdit={() => openEdit(p)}
              onArchive={() => archiveProperty(p.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((p) => (
            <PropertyRow key={p.id} property={p} onEdit={() => openEdit(p)} onArchive={() => archiveProperty(p.id)} />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editProperty ? "Edit Property" : "Add Property"}
        width="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Property name"
            placeholder="e.g., Green Residency"
            value={form.name}
            onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <Select
            label="Property type"
            value={form.property_type}
            onChange={(e) => setForm(f => ({ ...f, property_type: e.target.value as PropertyType }))}
            options={PROPERTY_TYPES}
          />
          <Textarea
            label="Description"
            placeholder="Brief description..."
            value={form.description}
            onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          />
          <Input
            label="Address"
            placeholder="Plot 12, Road 3"
            value={form.address}
            onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm(f => ({ ...f, city: e.target.value }))}
              required
            />
            <Input
              label="State"
              value={form.state}
              onChange={(e) => setForm(f => ({ ...f, state: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Postal code"
              value={form.postal_code}
              onChange={(e) => setForm(f => ({ ...f, postal_code: e.target.value }))}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm(f => ({ ...f, status: e.target.value as PropertyStatus }))}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
              ]}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>
              {editProperty ? "Update" : "Add Property"}
            </Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function PropertyCard({ property: p, onEdit, onArchive }: { property: Property; onEdit: () => void; onArchive: () => void }) {
  const img = p.image_url || PROPERTY_IMAGES.DEFAULT;
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden card-hover group" onClick={() => openProperty(p.id)} cursor="pointer">
      <div className="relative h-44 bg-navy-700">
        <img src={img} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 to-transparent" />
        <div className="absolute inset-0"></div>
        <div className="absolute top-3 left-3">
          <StatusBadge status={p.status} />
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="text-xs text-navy-300 font-mono uppercase">{p.property_type.replace(/_/g, " ")}</div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-display font-bold text-white text-base mb-1">{p.name}</h3>
        <div className="flex items-center gap-1 text-xs text-navy-400 mb-3">
          <MapPin size={12} />
          <span>{p.city}, {p.state}</span>
        </div>
        <div className="text-xs text-navy-500 line-clamp-2 mb-4">{p.description || p.address}</div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="sm" variant="secondary" className="flex-1" onClick={onEdit}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={onArchive}>Archive</Button>
        </div>
      </div>
    </div>
  );
}

function PropertyRow({ property: p, onEdit, onArchive }: { property: Property; onEdit: () => void; onArchive: () => void }) {
  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 flex items-center gap-4 group card-hover">
      <div className="w-12 h-12 rounded-lg bg-navy-700 flex-shrink-0 overflow-hidden">
        <img
          src={p.image_url || PROPERTY_IMAGES.DEFAULT}
          alt={p.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold text-white text-sm">{p.name}</div>
        <div className="text-xs text-navy-400">{p.city} · {p.property_type.replace(/_/g, " ")}</div>
      </div>
      <StatusBadge status={p.status} />
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="secondary" onClick={onEdit}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={onArchive}>Archive</Button>
      </div>
    </div>
  );
}
}