import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  Users,
  Phone,
  Mail,
  CreditCard,
  FileText,
  AlertTriangle,
  Edit,
  Building2,
  Home,
  ArrowLeft,
  Archive,
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
  Toast,
} from "../../components/ui";
import type { Tenant, TenantStatus, Unit, Property, Lease, Payment } from "../../lib/types";

function formatINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function TenantDetailPage() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { tenantDisplayId } = useParams<{ tenantDisplayId: string }>();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  // Related data
  const [unit, setUnit] = useState<Unit | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeLease, setActiveLease] = useState<Lease | null>(null);

  // Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Tenant> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!tenantDisplayId || tenantDisplayId === "") {
      setLoading(false);
      return;
    }
    fetchTenant(tenantDisplayId);
  }, [tenantDisplayId]);

  async function fetchTenant(displayId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("tenant_display_id", displayId)
        .single();

      if (error) throw error;
      setTenant(data);
    } catch (err) {
      console.error("Error fetching tenant:", err);
    } finally {
      setLoading(false);
    }
  }

  // Fetch related data when tenant changes
  useEffect(() => {
    if (tenant) {
      fetchRelatedData(tenant);
    }
  }, [tenant]);

  async function fetchRelatedData(tenantData: Tenant) {
    // Fetch unit
    if (tenantData.unit_id) {
      const { data: unitData } = await supabase
        .from("units")
        .select("*")
        .eq("id", tenantData.unit_id)
        .single();
      setUnit(unitData);

      // Fetch property from unit
      if (unitData?.property_id) {
        const { data: propData } = await supabase
          .from("properties")
          .select("*")
          .eq("id", unitData.property_id)
          .single();
        setProperty(propData);
      }
    }

    // Fetch leases for this tenant
    const { data: leaseData } = await supabase
      .from("leases")
      .select("*")
      .eq("tenant_id", tenantData.id)
      .order("created_at", { ascending: false });
    setLeases(leaseData || []);
    
    // Find active lease
    const active = leaseData?.find(l => l.status === "ACTIVE");
    setActiveLease(active || null);

    // Fetch payments for this tenant
    const { data: payData } = await supabase
      .from("payments")
      .select("*")
      .eq("tenant_id", tenantData.id)
      .order("created_at", { ascending: false });
    setPayments(payData || []);
  }

  // Calculate stats
  const totalPaid = payments.filter(p => p.status === "PAID").reduce((s, p) => s + (p.amount || 0), 0);
  const totalPending = payments.filter(p => p.status === "PENDING").reduce((s, p) => s + (p.amount || 0), 0);
  const totalOverdue = payments.filter(p => p.status === "OVERDUE").reduce((s, p) => s + (p.amount || 0), 0);
  const paymentsThisMonth = payments.filter(p => {
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    return p.created_at >= firstOfMonth && p.status === "PAID";
  });
  const collectedThisMonth = paymentsThisMonth.reduce((s, p) => s + (p.amount || 0), 0);
  const recentPayments = payments.slice(0, 5);

  function openEdit() {
    if (!tenant) return;
    setEditForm({
      full_name: tenant.full_name,
      email: tenant.email || "",
      phone: tenant.phone,
      emergency_contact_name: tenant.emergency_contact_name || "",
      emergency_contact_phone: tenant.emergency_contact_phone || "",
      status: tenant.status,
    });
    setShowModal(true);
  }

  async function archiveTenant() {
    if (!tenant) return;
    if (!confirm("Archive this tenant? This will remove them from active listings.")) return;

    try {
      const { error } = await supabase
        .from("tenants")
        .update({ status: "FORMER", updated_at: new Date().toISOString() })
        .eq("id", tenant.id);

      if (error) throw error;

      // Free up the unit if assigned
      if (tenant.unit_id) {
        await supabase.from("units").update({ status: "AVAILABLE" }).eq("id", tenant.unit_id);
      }

      setToast({ msg: "Tenant archived", type: "success" });
      setTimeout(() => navigate("/tenants"), 1500);
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to archive tenant", type: "error" });
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditForm(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenant || !editForm) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ ...editForm, updated_at: new Date().toISOString() })
        .eq("id", tenant.id);
      
      if (error) throw error;
      
      setToast({ msg: "Tenant updated!", type: "success" });
      closeModal();
      const { data } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenant.id)
        .single();
      if (data) setTenant(data);
    } catch (err: any) {
      setToast({ msg: err.message || "Failed to update tenant", type: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Tenant Details" subtitle="Loading..." />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28" />)}
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="animate-fade-in">
        <PageHeader title="Tenant Details" subtitle="Not found" />
        <EmptyState
          icon={<Users size={28} />}
          title="Tenant not found"
          description="The tenant you're looking for may have been removed."
        />
      </div>
    );
  }

  // Monthly rent from active lease
  const monthlyRent = activeLease?.monthly_rent || 0;
  const securityDeposit = activeLease?.security_deposit || 0;

  return (
    <div className="animate-fade-in">
      {/* Back Button */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/tenants")} className="flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to Tenants
        </Button>
      </div>

      {/* Tenant Profile Header */}
      <div className="bg-navy-800 border border-navy-700 rounded-2xl p-6 mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">{tenant.full_name[0].toUpperCase()}</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-white">{tenant.full_name}</h1>
              <StatusBadge status={tenant.status} />
              {tenant.tenant_display_id && (
                <span className="text-xs text-navy-500 bg-navy-700 px-2 py-0.5 rounded font-mono">ID: {tenant.tenant_display_id}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-navy-300 mt-2">
              {tenant.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={16} />
                  <span>{tenant.phone}</span>
                </div>
              )}
              {tenant.email && (
                <div className="flex items-center gap-2">
                  <Mail size={16} />
                  <span>{tenant.email}</span>
                </div>
              )}
              {property && (
                <div className="flex items-center gap-2">
                  <Building2 size={16} />
                  <span>{property.name}</span>
                </div>
              )}
              {unit && (
                <div className="flex items-center gap-2">
                  <Home size={16} />
                  <span>{unit.unit_number} {unit.unit_type ? `· ${unit.unit_type}` : ""}</span>
                </div>
              )}
              {tenant.emergency_contact_name && (
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-amber-400" />
                  <span>Emergency: {tenant.emergency_contact_name} - {tenant.emergency_contact_phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" onClick={openEdit}>
            <Edit size={16} />
            Edit Profile
          </Button>
          <Button variant="danger" onClick={archiveTenant}>
            <Archive size={16} />
            Archive
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Monthly Rent"
          value={formatINR(monthlyRent)}
          icon={<CreditCard size={18} className="text-blue-400" />}
          color="blue"
        />
        <StatCard
          label="Collected This Month"
          value={formatINR(collectedThisMonth)}
          icon={<CreditCard size={18} className="text-emerald-400" />}
          color="emerald"
        />
        <StatCard
          label="Total Paid"
          value={formatINR(totalPaid)}
          icon={<FileText size={18} className="text-violet-400" />}
          color="violet"
        />
        <StatCard
          label="Overdue"
          value={formatINR(totalOverdue)}
          icon={<AlertTriangle size={18} className="text-red-400" />}
          color="red"
        />
        <StatCard
          label="Pending"
          value={formatINR(totalPending)}
          icon={<AlertTriangle size={18} className="text-amber-400" />}
          color="amber"
        />
        <StatCard
          label="Security Deposit"
          value={formatINR(securityDeposit)}
          icon={<Building2 size={18} className="text-orange-400" />}
          color="orange"
        />
        <StatCard
          label="Total Payments"
          value={payments.length}
          icon={<FileText size={18} className="text-blue-400" />}
          color="blue"
        />
        <StatCard
          label="Active Leases"
          value={leases.filter(l => l.status === "ACTIVE").length}
          icon={<FileText size={18} className="text-emerald-400" />}
          color="emerald"
        />
      </div>

      {/* Recent Payments */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-white">Recent Payments</h3>
          <a href="/payments" className="text-xs text-blue-400 hover:text-blue-300">View all →</a>
        </div>
        {recentPayments.length === 0 ? (
          <EmptyState icon={<CreditCard size={20} />} title="No payments yet" description="No payment records found for this tenant." />
        ) : (
          <div className="flex flex-col gap-2">
            {recentPayments.map((pay) => (
              <div key={pay.id} className="flex items-center justify-between py-2.5 border-b border-navy-700 last:border-0">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-navy-200">{formatINR(pay.amount)}</div>
                    <StatusBadge status={pay.status} />
                  </div>
                  <div className="text-xs text-navy-500">
                    {pay.payment_method || "Manual"} · {new Date(pay.created_at).toLocaleDateString("en-IN")}
                    {pay.reference_number && ` · Ref: ${pay.reference_number}`}
                  </div>
                </div>
                <div className="text-xs text-navy-400">
                  {pay.due_date && `Due: ${new Date(pay.due_date).toLocaleDateString("en-IN")}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit Modal */}
      <Modal
        open={showModal}
        onClose={closeModal}
        title="Edit Tenant"
        width="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Full name" placeholder="Arjun Kumar" value={editForm?.full_name || ""} onChange={(e) => setEditForm(f => ({ ...f, full_name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" type="tel" placeholder="+91 98765 43210" value={editForm?.phone || ""} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} required />
            <Input label="Email" type="email" placeholder="arjun@email.com" value={editForm?.email || ""} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Emergency contact" placeholder="Contact name" value={editForm?.emergency_contact_name || ""} onChange={(e) => setEditForm(f => ({ ...f, emergency_contact_name: e.target.value }))} />
            <Input label="Emergency phone" type="tel" value={editForm?.emergency_contact_phone || ""} onChange={(e) => setEditForm(f => ({ ...f, emergency_contact_phone: e.target.value }))} />
          </div>
          <Select
            label="Status"
            value={editForm?.status || "ACTIVE"}
            onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value as TenantStatus }))}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
              { value: "FORMER", label: "Former" },
            ]}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={submitting}>Update Tenant</Button>
          </div>
        </form>
      </Modal>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}