import { useEffect, useState } from "react";
import { Lightbulb, AlertTriangle, CheckCircle, CreditCard, Wrench } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Card, PageHeader, Skeleton } from "../../components/ui";

export default function TenantIntelligencePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: t } = await supabase.from("tenants").select("id").eq("profile_id", user.id).maybeSingle();
      if (!t) { setLoading(false); return; }
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from("payments").select("amount,status,due_date,created_at").eq("tenant_id", t.id).order("created_at", { ascending: false }),
        supabase.from("maintenance_requests").select("title,status,priority,created_at").eq("tenant_id", t.id).order("created_at", { ascending: false }),
      ]);
      setPayments(p || []); setMaintenance(m || []); setLoading(false);
    })();
  }, [user?.id]);

  if (loading) return <div><Skeleton className="w-56 h-7 mb-6" /><div className="flex flex-col gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div>;

  const overdue = payments.filter(p => p.status === "OVERDUE");
  const open = maintenance.filter(m => !["COMPLETED", "CLOSED", "VERIFIED"].includes(m.status));
  const items = [
    overdue.length ? { type: "warning", title: "Payment needs attention", text: `${overdue.length} payment${overdue.length > 1 ? "s are" : " is"} overdue. Check the Payments page and clear outstanding rent.` } : { type: "positive", title: "Payments are on track", text: "No overdue rent payments were found in your account." },
    open.length ? { type: "warning", title: "Maintenance in progress", text: `${open.length} maintenance request${open.length > 1 ? "s are" : " is"} still open. Review the latest updates in Maintenance.` } : { type: "positive", title: "Maintenance is clear", text: "There are no open maintenance requests right now." },
    { type: "info", title: "Stay on top of renewals", text: "Keep your contact details and emergency contact information up to date in your profile so your property team can reach you quickly." },
  ];
  const icon = { positive: <CheckCircle size={18} className="text-emerald-400" />, warning: <AlertTriangle size={18} className="text-amber-400" />, info: <Lightbulb size={18} className="text-blue-400" /> };
  const box = { positive: "border-emerald-500/20 bg-emerald-500/5", warning: "border-amber-500/20 bg-amber-500/5", info: "border-blue-500/20 bg-blue-500/5" };

  return <div className="animate-fade-in"><PageHeader title="My Intelligence" subtitle="Helpful insights based only on your RENFLIX account" /><div className="space-y-3">{items.map((item, i) => <Card key={i} className={`border ${box[item.type as keyof typeof box]}`}><div className="flex items-start gap-3"><div className="mt-0.5">{icon[item.type as keyof typeof icon]}</div><div><h3 className="font-display font-bold text-white">{item.title}</h3><p className="text-sm text-navy-300 mt-1">{item.text}</p></div></div></Card>)}</div><Card className="mt-6"><div className="flex items-center gap-2 mb-2"><CreditCard size={16} className="text-blue-400" /><h3 className="font-display font-bold text-white">What to do next</h3></div><p className="text-sm text-navy-400">Use Payments for rent history, Maintenance for requests, and Messages to contact your property owner or manager.</p></Card></div>;
}
