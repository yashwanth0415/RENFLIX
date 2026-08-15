import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Building2,
  Users,
  CreditCard,
  Wrench,
  TrendingUp,
  AlertTriangle,
  FileText,
  DoorOpen,
  Edit,
  Archive,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import {
  Button,
  Card,
  StatusBadge,
  PageHeader,
  EmptyState,
  StatCard,
  Modal,
  Input,
  Select,
  Textarea,
  Toast,
  Skeleton,
} from "../../components/ui";
import type { Property, PropertyType, PropertyStatus, MaintenanceRequest, Payment } from "../../lib/types";

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

const PROPERTY_STATUSES: { value: PropertyStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

function formatINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function PropertyDetailPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { propertyId } = useParams<{ propertyId: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  // Data states for related entities
  const [units, setUnits] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [leases, setLeases] = useState<any[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);

  // Edit/Archive modal state
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Property> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!propertyId || propertyId === "") {
      setLoading(false);
      return;
    }
    fetchProperty(propertyId);
  }, [propertyId]);

  async function fetchProperty(id: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProperty(data);
    } catch (err) {
      console.error("Error fetching property:", err);
    } finally {
      setLoading(false);
    }
  }

  // Fetch related data when property changes
  useEffect(() => {
    if (property?.id) {
      fetchAllRelated(property.id);
    }
  }, [property?.id]);

  async function fetchAllRelated(propertyId: string) {
    const [unitsRes, tenantsRes, leasesRes, paymentsRes, maintenanceRes] = await Promise.all([
      supabase.from("units").select("*").eq("property_id", propertyId),
      supabase.from("tenants").select("*").eq("property_id", propertyId),
      supabase.from("leases").select("*").eq("property_id", propertyId),
      supabase.from("payments").select("*").eq("property_id", propertyId).order("created_at", { ascending: false }),
      supabase.from("maintenance_requests").select("*").eq("property_id", propertyId).order("created_at", { ascending: false }),
    ]);

    setUnits(unitsRes.data || []);
    setTenants(tenantsRes.data || []);
    setLeases(leasesRes.data || []);
    setPayments(paymentsRes.data || []);
    setMaintenance(maintenanceRes.data || []);
  }

  // Calculate metrics similar to dashboard
  const occupiedUnits = units.filter((u) => u.status === "OCCUPIED").length;
  const totalUnits = units.length;
  const occupancyPct = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
  const monthlyRevenue = units.filter((u) => u.status === "OCCUPIED").reduce((s, u) => s + (u.monthly_rent || 0), 0);
  
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const paymentsThisMonth = payments.filter((p) => p.created_at >= firstOfMonth && p.status === "PAID");
  const collectedThisMonth = paymentsThisMonth.reduce((s, p) => s + (p.amount || 0), 0);
  
  const overduePayments = payments.filter((p) => p.status === "OVERDUE");
  const overdueTotal = overduePayments.reduce((s, p) => s + (p.amount || 0), 0);
  
  const activeMaintenance = maintenance.filter((m) => !["COMPLETED", "CLOSED", "VERIFIED"].includes(m.status)).length;
  const urgentMaintenance = maintenance.filter((m) => m.priority === "URGENT" && !["COMPLETED", "CLOSED", "VERIFIED"].includes(m.status)).length;

  const activeLeases = leases.filter((l) => l.status === "ACTIVE").length;
  const expiringLeases = leases.filter((l) => {
    if (l.status !== "ACTIVE") return false;
    const endDate = new Date(l.end_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return endDate <= thirtyDaysFromNow && endDate >= now;
  }).length;

  function openEdit() {
    if (!property) return;
    setEditForm({
      name: property.name,
      property_type: property.property_type,
      description: property.description || "",
      address: property.address,
      city: property.city,
      state: property.state,
      country: property.country,
      postal_code: property.postal_code || "",
      status: property.status,
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditForm(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!property || !editForm) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("properties")
        .update({ ...editForm, updated_at: new Date().toISOString() })
        .eq("id", property.id);
      
      if (error) throw error;
      
      setToast({ msg: "Property updated!", type: "success" });
      closeModal();
      // Refresh property data
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("id", property.id)
        .single();
      if (data) setProperty(data);
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to update property", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function archiveProperty() {
    if (!property) return;
    if (!confirm("Archive this property? This will remove it from active listings.")) return;
    
    try {
      const { error } = await supabase
        .from("properties")
        .update({ status: "ARCHIVED", updated_at: new Date().toISOString() })
        .eq("id", property.id);
      
      if (error) throw error;
      
      setToast({ msg: "Property archived", type: "success" });
      setTimeout(() => navigate("/properties"), 1500);
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to archive property", type: "error" });
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Property Details" subtitle="Loading property..." />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-28" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="h-80"><Skeleton className="h-full" /></Card>
          <Card className="h-80"><Skeleton className="h-full" /></Card>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Property Details" subtitle="Property not found" />
        <EmptyState
          icon={<Building2 size={28} />}
          title="Property not found"
          description="The property you're looking for may have been archived or deleted."
        />
      </div>
    );
  }

  // Recent items (last 5)
  const recentPayments = payments.slice(0, 5);
  const recentMaintenance = maintenance.slice(0, 5);

  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/properties")} className="flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to Properties
        </Button>
      </div>

      {/* Property Image & Name - First */}
      <div className="relative h-72 bg-navy-700 overflow-hidden rounded-2xl mb-6">
        <img
          src={property.image_url || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&auto=format"}
          alt={property.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <StatusBadge status={property.status} />
                <span className="text-sm text-navy-300 font-mono uppercase">{property.property_type.replace(/_/g, " ")}</span>
              </div>
              <h1 className="font-display text-3xl font-bold text-white">{property.name}</h1>
              <div className="flex items-center gap-2 text-navy-300 mt-2">
                <Building2 size={16} />
                <span>{property.address}, {property.city}, {property.state}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={openEdit}>
                <Edit size={16} />
              </Button>
              <Button variant="danger" onClick={archiveProperty}>
                <Archive size={16} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid - same style as Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Units"
          value={totalUnits}
          icon={<Building2 size={18} className="text-blue-400" />}
          color="blue"
        />
        <StatCard
          label="Occupied"
          value={`${occupancyPct}%`}
          sub={`${occupiedUnits} / ${totalUnits} units`}
          icon={<DoorOpen size={18} className="text-emerald-400" />}
          color="emerald"
        />
        <StatCard
          label="Active Tenants"
          value={tenants.length}
          icon={<Users size={18} className="text-violet-400" />}
          color="violet"
        />
        <StatCard
          label="Monthly Rent Roll"
          value={formatINR(monthlyRevenue)}
          icon={<TrendingUp size={18} className="text-blue-400" />}
          color="blue"
        />
        <StatCard
          label="Collected This Month"
          value={formatINR(collectedThisMonth)}
          icon={<CreditCard size={18} className="text-emerald-400" />}
          color="emerald"
        />
        <StatCard
          label="Overdue Rent"
          value={formatINR(overdueTotal)}
          icon={<AlertTriangle size={18} className="text-red-400" />}
          color="red"
        />
        <StatCard
          label="Open Maintenance"
          value={activeMaintenance}
          sub={urgentMaintenance ? `${urgentMaintenance} urgent` : undefined}
          icon={<Wrench size={18} className="text-orange-400" />}
          color="orange"
        />
        <StatCard
          label="Active Leases"
          value={activeLeases}
          sub={expiringLeases ? `${expiringLeases} expiring soon` : undefined}
          icon={<FileText size={18} className="text-amber-400" />}
          color="amber"
        />
      </div>

      {/* Recent Maintenance & Recent Payments - same as Dashboard */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Maintenance */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white">Recent Maintenance</h3>
            <a href="/maintenance" className="text-xs text-blue-400 hover:text-blue-300">View all →</a>
          </div>
          {recentMaintenance.length === 0 ? (
            <EmptyState icon={<Wrench size={20} />} title="No maintenance requests" />
          ) : (
            <div className="flex flex-col gap-2">
              {recentMaintenance.map((req) => (
                <div key={req.id} className="flex items-start justify-between gap-3 py-2.5 border-b border-navy-700 last:border-0">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy-200 truncate">{req.title}</div>
                    <div className="text-xs text-navy-500">{req.category}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={req.priority} />
                    <StatusBadge status={req.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Payments */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white">Recent Payments</h3>
            <a href="/payments" className="text-xs text-blue-400 hover:text-blue-300">View all →</a>
          </div>
          {recentPayments.length === 0 ? (
            <EmptyState icon={<CreditCard size={20} />} title="No payments yet" />
          ) : (
            <div className="flex flex-col gap-2">
              {recentPayments.map((pay) => (
                <div key={pay.id} className="flex items-center justify-between py-2.5 border-b border-navy-700 last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-navy-200">
                      {formatINR(pay.amount)}
                    </div>
                    <div className="text-xs text-navy-500">
                      {pay.payment_method || "Manual"} · {new Date(pay.created_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <StatusBadge status={pay.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Edit Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title="Edit Property"
        width="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Property name"
            placeholder="e.g., Green Residency"
            value={editForm?.name || ""}
            onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))}
            required
          />
          <Select
            label="Property type"
            value={editForm?.property_type || ""}
            onChange={(e) => setEditForm(f => ({ ...f, property_type: e.target.value as PropertyType }))}
            options={PROPERTY_TYPES}
          />
          <Textarea
            label="Description"
            placeholder="Brief description..."
            value={editForm?.description || ""}
            onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))}
          />
          <Input
            label="Address"
            placeholder="Plot 12, Road 3"
            value={editForm?.address || ""}
            onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              value={editForm?.city || ""}
              onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))}
              required
            />
            <Input
              label="State"
              value={editForm?.state || ""}
              onChange={(e) => setEditForm(f => ({ ...f, state: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Postal code"
              value={editForm?.postal_code || ""}
              onChange={(e) => setEditForm(f => ({ ...f, postal_code: e.target.value }))}
            />
            <Select
              label="Status"
              value={editForm?.status || "ACTIVE"}
              onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value as PropertyStatus }))}
              options={PROPERTY_STATUSES}
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>
              Update Property
            </Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}