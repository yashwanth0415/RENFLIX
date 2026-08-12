import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import {
  Building2,
  Users,
  CreditCard,
  Wrench,
  TrendingUp,
  AlertTriangle,
  FileText,
  DoorOpen,
  ArrowLeft,
  Home,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { StatCard, Card, StatusBadge, Skeleton, PageHeader, EmptyState } from "../../components/ui";
import type { DashboardMetrics, MaintenanceRequest, Payment, Tenant, Unit } from "../../lib/types";

function formatINR(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

export default function PropertyDashboardPage() {
  const { profile } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<{ id: string; name: string; property_type: string; city: string; state: string; image_url: string | null } | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentMaintenance, setRecentMaintenance] = useState<MaintenanceRequest[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.organization_id && id) {
      fetchAll(profile.organization_id, id);
    } else if (profile && !profile.organization_id) {
      setLoading(false);
    }
  }, [profile, id]);

  async function fetchAll(orgId: string, propertyId: string) {
    const [propRes, unitRes, tenantRes, payRes, maintRes] = await Promise.all([
      supabase.from("properties").select("id, name, property_type, city, state, image_url").eq("id", propertyId).eq("organization_id", orgId).single(),
      supabase.from("units").select("*").eq("property_id", propertyId).order("unit_number", { ascending: true }),
      supabase.from("tenants").select("*").eq("organization_id", orgId).eq("status", "ACTIVE").in("unit_id", (await getUnitIds(propertyId)).map(u => u.id)),
      supabase.from("payments").select("*").eq("property_id", propertyId).order("created_at", { ascending: false }).limit(5),
      supabase.from("maintenance_requests").select("*").eq("property_id", propertyId).order("created_at", { ascending: false }).limit(5),
    ]);

    setProperty(propRes.data);

    const unitsData = unitRes.data || [];
    const occupied = unitsData.filter((u) => u.status === "OCCUPIED").length;

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const paymentsThisMonth = (payRes.data || []).filter(
      (p) => p.created_at >= firstOfMonth && p.status === "PAID"
    );
    const collectedThisMonth = paymentsThisMonth.reduce((s, p) => s + (p.amount || 0), 0);

    const overdue = (payRes.data || []).filter((p) => p.status === "OVERDUE");
    const overdueTotal = overdue.reduce((s, p) => s + (p.amount || 0), 0);

    const activeMaint = (maintRes.data || []).filter(
      (m) => !["COMPLETED", "CLOSED", "VERIFIED"].includes(m.status)
    ).length;
    const urgentMaint = (maintRes.data || []).filter(
      (m) => m.priority === "URGENT" && !["COMPLETED", "CLOSED", "VERIFIED"].includes(m.status)
    ).length;

    setMetrics({
      total_properties: 1,
      total_units: unitsData.length,
      occupied_units: occupied,
      total_tenants: tenantRes.count || 0,
      monthly_revenue: unitsData.filter((u) => u.status === "OCCUPIED").reduce((s, u) => s + (u.monthly_rent || 0), 0),
      collected_this_month: collectedThisMonth,
      pending_rent: 0,
      overdue_rent: overdueTotal,
      active_maintenance: activeMaint,
      urgent_maintenance: urgentMaint,
      leases_expiring_soon: 0,
    });

    setUnits(unitsData);
    setTenants(tenantRes.data || []);
    setRecentMaintenance(maintRes.data || []);
    setRecentPayments(payRes.data || []);
    setLoading(false);
  }

  async function getUnitIds(propertyId: string): Promise<{ id: string }[]> {
    const { data } = await supabase
      .from("units")
      .select("id")
      .eq("property_id", propertyId);
    return (data || []).map((u) => ({ id: u.id }));
  }

  const occupancyPct = metrics
    ? metrics.total_units > 0
      ? Math.round((metrics.occupied_units / metrics.total_units) * 100)
      : 0
    : 0;

  if (loading) {
    return (
      <div>
        <Skeleton className="w-48 h-7 mb-2" />
        <Skeleton className="w-72 h-4 mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div>
        <PageHeader title="Property Not Found" subtitle="The property may have been archived or deleted." />
      </div>
    );
  }

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

  const img = property.image_url || PROPERTY_IMAGES[property.property_type] || PROPERTY_IMAGES.DEFAULT;

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-navy-400 mb-4">
        <Link to="/dashboard" className="hover:text-white transition-colors flex items-center gap-1">
          <Home size={14} />
          Dashboard
        </Link>
        <ChevronRight size={14} />
        <Link to="/properties" className="hover:text-white transition-colors">Properties</Link>
        <ChevronRight size={14} />
        <span className="text-navy-200 font-medium truncate max-w-[300px]">{property.name}</span>
      </div>

      {/* Property Header */}
      <div className="bg-navy-800 border border-navy-700 rounded-2xl overflow-hidden mb-6">
        <div className="relative h-48 bg-navy-700">
          <img src={img} alt={property.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/90 via-navy-900/20 to-transparent" />
        </div>
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-navy-400 uppercase tracking-wide">{property.property_type.replace(/_/g, " ")}</span>
                <span className="text-navy-600">•</span>
                <span className="text-xs text-navy-400">{property.city}, {property.state}</span>
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">{property.name}</h1>
            </div>
            <Link to="/properties" className="inline-flex items-center gap-2 px-4 py-2 bg-navy-700 border border-navy-600 rounded-lg text-navy-300 hover:bg-navy-600 hover:text-white transition-colors">
              <ArrowLeft size={16} />
              Back to Properties
            </Link>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Units"
          value={metrics?.total_units ?? 0}
          icon={<DoorOpen size={18} className="text-blue-400" />}
          color="blue"
        />
        <StatCard
          label="Occupancy"
          value={`${occupancyPct}%`}
          sub={`${metrics?.occupied_units} / ${metrics?.total_units} units`}
          icon={<DoorOpen size={18} className="text-emerald-400" />}
          color="emerald"
        />
        <StatCard
          label="Active Tenants"
          value={metrics?.total_tenants ?? 0}
          icon={<Users size={18} className="text-violet-400" />}
          color="violet"
        />
        <StatCard
          label="Monthly Rent Roll"
          value={formatINR(metrics?.monthly_revenue ?? 0)}
          icon={<TrendingUp size={18} className="text-blue-400" />}
          color="blue"
        />
        <StatCard
          label="Collected This Month"
          value={formatINR(metrics?.collected_this_month ?? 0)}
          icon={<CreditCard size={18} className="text-emerald-400" />}
          color="emerald"
        />
        <StatCard
          label="Overdue Rent"
          value={formatINR(metrics?.overdue_rent ?? 0)}
          icon={<AlertTriangle size={18} className="text-red-400" />}
          color="red"
        />
        <StatCard
          label="Open Maintenance"
          value={metrics?.active_maintenance ?? 0}
          sub={metrics?.urgent_maintenance ? `${metrics.urgent_maintenance} urgent` : undefined}
          icon={<Wrench size={18} className="text-orange-400" />}
          color="orange"
        />
        <StatCard
          label="Lease Expiries"
          value={metrics?.leases_expiring_soon ?? 0}
          sub="Next 30 days"
          icon={<FileText size={18} className="text-amber-400" />}
          color="amber"
        />
      </div>

      {/* Tabs for Units, Tenants, Maintenance, Payments */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Units */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white">Units ({units.length})</h3>
            <Link to={`/units?property=${id}`} className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          {units.length === 0 ? (
            <EmptyState icon={<DoorOpen size={20} />} title="No units yet" description="Add units to start renting out spaces." />
          ) : (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
              {units.map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2.5 border-b border-navy-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center">
                      <DoorOpen size={14} className="text-navy-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{u.unit_number}</div>
                      <div className="text-xs text-navy-500">{u.unit_type || "—"} · {u.area ? `${u.area} sq ft` : "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-emerald-400 text-sm">₹{u.monthly_rent.toLocaleString("en-IN")}</span>
                    <StatusBadge status={u.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Tenants */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white">Tenants ({tenants.length})</h3>
            <Link to={`/tenants?property=${id}`} className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
          </div>
          {tenants.length === 0 ? (
            <EmptyState icon={<Users size={20} />} title="No tenants yet" description="Add tenants to occupied units." />
          ) : (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
              {tenants.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-navy-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">{t.full_name[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">{t.full_name}</div>
                      <div className="text-xs text-navy-500">Unit: {units.find(u => u.id === t.unit_id)?.unit_number || "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={t.status} />
                    {t.move_in_date && (
                      <span className="text-xs text-navy-400 hidden sm:inline">
                        Move-in: {new Date(t.move_in_date).toLocaleDateString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Maintenance & Payments */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* Recent Maintenance */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white">Recent Maintenance</h3>
            <Link to={`/maintenance?property=${id}`} className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
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
            <Link to={`/payments?property=${id}`} className="text-xs text-blue-400 hover:text-blue-300">View all →</Link>
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
    </div>
  );
}