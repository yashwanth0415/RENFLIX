import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, DoorOpen, CreditCard, Wrench } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Card, PageHeader, Skeleton, StatCard } from "../../components/ui";
import TenantAnalyticsPage from "../tenant/TenantAnalyticsPage";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<{ status: string; monthly_rent: number }[]>([]);
  const [payments, setPayments] = useState<{ status: string; amount: number; created_at: string }[]>([]);
  const [maintenance, setMaintenance] = useState<{ status: string; category: string }[]>([]);

  useEffect(() => {
    if (profile?.role !== "TENANT" && profile?.organization_id) fetchAll();
    else setLoading(false);
  }, [profile]);

  if (profile?.role === "TENANT") return <TenantAnalyticsPage />;

  async function fetchAll() {
    const propRes = await supabase.from("properties").select("id").eq("organization_id", profile!.organization_id!).eq("status", "ACTIVE");
    const propIds = (propRes.data || []).map((p: any) => p.id);

    const [unitRes, payRes, maintRes] = await Promise.all([
      propIds.length ? supabase.from("units").select("status, monthly_rent").in("property_id", propIds) : Promise.resolve({ data: [] }),
      supabase.from("payments").select("status, amount, created_at").eq("organization_id", profile!.organization_id!),
      supabase.from("maintenance_requests").select("status, category").eq("organization_id", profile!.organization_id!),
    ]);

    setUnits(unitRes.data || []);
    setPayments(payRes.data || []);
    setMaintenance(maintRes.data || []);
    setLoading(false);
  }

  // Occupancy data for pie
  const occupancyData = [
    { name: "Occupied", value: units.filter(u => u.status === "OCCUPIED").length },
    { name: "Available", value: units.filter(u => u.status === "AVAILABLE").length },
    { name: "Maintenance", value: units.filter(u => u.status === "MAINTENANCE").length },
    { name: "Reserved", value: units.filter(u => u.status === "RESERVED").length },
  ].filter(d => d.value > 0);

  // Payment status for pie
  const paymentData = [
    { name: "Paid", value: payments.filter(p => p.status === "PAID").reduce((s, p) => s + p.amount, 0) },
    { name: "Overdue", value: payments.filter(p => p.status === "OVERDUE").reduce((s, p) => s + p.amount, 0) },
    { name: "Pending", value: payments.filter(p => p.status === "PENDING").reduce((s, p) => s + p.amount, 0) },
  ].filter(d => d.value > 0);

  // Monthly payments bar chart (last 6 months)
  const monthlyData = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[`${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`] = 0;
    }
    payments
      .filter(p => p.status === "PAID")
      .forEach(p => {
        const d = new Date(p.created_at);
        const key = `${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`;
        if (key in months) months[key] += p.amount;
      });
    return Object.entries(months).map(([month, amount]) => ({ month, amount }));
  })();

  // Maintenance by category
  const maintByCategory = (() => {
    const cats: Record<string, number> = {};
    maintenance.forEach(m => { cats[m.category] = (cats[m.category] || 0) + 1; });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }));
  })();

  const totalRevenue = payments.filter(p => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const occupancyRate = units.length > 0 ? Math.round((units.filter(u => u.status === "OCCUPIED").length / units.length) * 100) : 0;

  if (loading) {
    return (
      <div>
        <Skeleton className="w-48 h-7 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-xs">
          <div className="text-navy-400 mb-1">{label}</div>
          <div className="text-white font-bold">{fmt(payload[0].value)}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Analytics" subtitle="Financial and operational insights from your portfolio" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total units" value={units.length} icon={<DoorOpen size={18} className="text-blue-400" />} color="blue" />
        <StatCard label="Occupancy rate" value={`${occupancyRate}%`} icon={<TrendingUp size={18} className="text-emerald-400" />} color="emerald" />
        <StatCard label="Total collected" value={fmt(totalRevenue)} icon={<CreditCard size={18} className="text-violet-400" />} color="violet" />
        <StatCard label="Maintenance requests" value={maintenance.length} icon={<Wrench size={18} className="text-orange-400" />} color="orange" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly revenue */}
        <Card>
          <h3 className="font-display font-bold text-white mb-4">Rent collected — last 6 months</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => fmt(v)} tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Occupancy pie */}
        <Card>
          <h3 className="font-display font-bold text-white mb-4">Unit occupancy breakdown</h3>
          {occupancyData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-navy-500 text-sm">No units added yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={occupancyData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {occupancyData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Legend formatter={(v) => <span className="text-xs text-navy-300">{v}</span>} />
                <Tooltip formatter={(v) => [`${v} units`, ""]} contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Maintenance by category */}
      {maintByCategory.length > 0 && (
        <Card>
          <h3 className="font-display font-bold text-white mb-4">Maintenance by category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={maintByCategory} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#f97316" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </div>
  );
}
