import { useEffect, useState } from "react";
import { BarChart3, CreditCard, Wrench, CalendarDays } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Card, PageHeader, Skeleton, StatCard } from "../../components/ui";

export default function TenantAnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t } = await supabase.from("tenants").select("id,monthly_rent,unit_id").eq("profile_id", user.id).maybeSingle();
      if (!t) { setLoading(false); return; }
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from("payments").select("amount,status,created_at").eq("tenant_id", t.id).order("created_at", { ascending: false }),
        supabase.from("maintenance_requests").select("status,priority,created_at").eq("tenant_id", t.id).order("created_at", { ascending: false }),
      ]);
      setTenant(t); setPayments(p || []); setMaintenance(m || []); setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <div><Skeleton className="w-48 h-7 mb-6" /><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div></div>;

  const paid = payments.filter(p => p.status === "PAID").reduce((s, p) => s + Number(p.amount || 0), 0);
  const overdue = payments.filter(p => p.status === "OVERDUE").reduce((s, p) => s + Number(p.amount || 0), 0);
  const openMaintenance = maintenance.filter(m => !["COMPLETED", "CLOSED", "VERIFIED"].includes(m.status)).length;

  return <div className="animate-fade-in">
    <PageHeader title="My Analytics" subtitle="Personal payment and maintenance insights" />
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard label="Monthly rent" value={`₹${Number(tenant?.monthly_rent || 0).toLocaleString("en-IN")}`} icon={<CreditCard size={18} className="text-blue-400" />} color="blue" />
      <StatCard label="Paid to date" value={`₹${paid.toLocaleString("en-IN")}`} icon={<BarChart3 size={18} className="text-emerald-400" />} color="emerald" />
      <StatCard label="Overdue" value={`₹${overdue.toLocaleString("en-IN")}`} icon={<CalendarDays size={18} className="text-amber-400" />} color="amber" />
      <StatCard label="Open maintenance" value={openMaintenance} icon={<Wrench size={18} className="text-orange-400" />} color="orange" />
    </div>
    <div className="grid lg:grid-cols-2 gap-6">
      <Card><h3 className="font-display font-bold text-white mb-3">Payment history</h3><div className="space-y-2">{payments.slice(0,6).map((p,i)=><div key={i} className="flex items-center justify-between py-2 border-b border-navy-700 last:border-0"><span className="text-xs text-navy-400">{new Date(p.created_at).toLocaleDateString("en-IN")}</span><span className="text-sm font-semibold text-white">₹{Number(p.amount||0).toLocaleString("en-IN")}</span><span className="text-xs text-blue-300">{p.status}</span></div>)}</div></Card>
      <Card><h3 className="font-display font-bold text-white mb-3">Maintenance activity</h3><div className="space-y-2">{maintenance.slice(0,6).map((m,i)=><div key={i} className="flex items-center justify-between py-2 border-b border-navy-700 last:border-0"><span className="text-xs text-navy-400">{new Date(m.created_at).toLocaleDateString("en-IN")}</span><span className="text-xs text-navy-300">{m.priority || "Normal"}</span><span className="text-xs text-emerald-300">{m.status}</span></div>)}</div></Card>
    </div>
  </div>;
}
