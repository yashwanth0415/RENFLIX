import { useEffect, useState } from "react";
import { Cpu, TrendingUp, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import { Card, PageHeader, Skeleton } from "../../components/ui";
import TenantIntelligencePage from "../tenant/TenantIntelligencePage";

interface Insight {
  type: "positive" | "warning" | "info";
  title: string;
  description: string;
}

function generateInsights(data: {
  occupancyRate: number;
  totalUnits: number;
  occupiedUnits: number;
  overduePayments: number;
  urgentMaintenance: number;
  activeMaintenance: number;
  expiringLeases: number;
  totalRevenue: number;
}): Insight[] {
  const insights: Insight[] = [];

  if (data.occupancyRate >= 90) {
    insights.push({ type: "positive", title: "Excellent occupancy", description: `Your portfolio is ${data.occupancyRate}% occupied — well above the 85% benchmark. Strong demand for your properties.` });
  } else if (data.occupancyRate < 70) {
    insights.push({ type: "warning", title: "Low occupancy alert", description: `Only ${data.occupancyRate}% of your ${data.totalUnits} units are occupied. Consider reviewing rental pricing or marketing strategy.` });
  } else {
    insights.push({ type: "info", title: "Occupancy on track", description: `${data.occupiedUnits} of ${data.totalUnits} units are occupied (${data.occupancyRate}%). There's room to improve further.` });
  }

  if (data.overduePayments > 0) {
    insights.push({ type: "warning", title: `${data.overduePayments} overdue payment${data.overduePayments > 1 ? "s" : ""}`, description: "Follow up with tenants who have overdue rent. Consider setting up automated payment reminders." });
  } else {
    insights.push({ type: "positive", title: "Clean payment record", description: "No overdue payments detected. Your tenants are keeping up with rent payments." });
  }

  if (data.urgentMaintenance > 0) {
    insights.push({ type: "warning", title: `${data.urgentMaintenance} urgent maintenance issue${data.urgentMaintenance > 1 ? "s" : ""}`, description: "Urgent maintenance requests need immediate attention. Delays can lead to higher costs and tenant dissatisfaction." });
  }

  if (data.activeMaintenance > 5) {
    insights.push({ type: "info", title: "High maintenance activity", description: `${data.activeMaintenance} open maintenance requests. Consider hiring additional technicians or outsourcing to a facility management company.` });
  }

  if (data.expiringLeases > 0) {
    insights.push({ type: "warning", title: `${data.expiringLeases} lease${data.expiringLeases > 1 ? "s" : ""} expiring soon`, description: "Reach out to these tenants early about renewals. Early renewal reduces vacancy loss." });
  }

  if (data.totalRevenue > 0) {
    insights.push({ type: "positive", title: "Revenue flowing", description: `₹${data.totalRevenue.toLocaleString("en-IN")} collected to date. Track expenses against this to calculate your net income.` });
  }

  insights.push({
    type: "info",
    title: "Portfolio health tip",
    description: "Properties with preventive maintenance schedules see 40% fewer emergency repairs. Set up AC service, water tank cleaning, and electrical inspection cycles.",
  });

  return insights;
}

const QUESTIONS = [
  "Which property earns the most?",
  "Which tenants have overdue rent?",
  "Which units are vacant?",
  "What needs my attention today?",
  "How is my portfolio performing?",
  "Which leases expire soon?",
];

export default function IntelligencePage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [query, setQuery] = useState("");
  const [queryResult, setQueryResult] = useState<string | null>(null);
  const [querying, setQuerying] = useState(false);
  const [rawData, setRawData] = useState<any>({});

  useEffect(() => {
    if (profile?.role !== "TENANT" && profile?.organization_id) fetchData();
    else setLoading(false);
  }, [profile]);

  if (profile?.role === "TENANT") return <TenantIntelligencePage />;

  async function fetchData() {
    const propRes = await supabase.from("properties").select("id, name").eq("organization_id", profile!.organization_id!).eq("status", "ACTIVE");
    const propIds = (propRes.data || []).map((p: any) => p.id);

    const [unitRes, payRes, maintRes, leaseRes] = await Promise.all([
      propIds.length ? supabase.from("units").select("status, monthly_rent, property_id").in("property_id", propIds) : Promise.resolve({ data: [] }),
      supabase.from("payments").select("status, amount, tenant_id, created_at").eq("organization_id", profile!.organization_id!),
      supabase.from("maintenance_requests").select("status, priority, property_id").eq("organization_id", profile!.organization_id!),
      supabase.from("leases").select("status, end_date, tenant_id").eq("organization_id", profile!.organization_id!),
    ]);

    const units = unitRes.data || [];
    const payments = payRes.data || [];
    const maintenance = maintRes.data || [];
    const leases = leaseRes.data || [];

    const occupied = units.filter((u: any) => u.status === "OCCUPIED").length;
    const occupancyRate = units.length > 0 ? Math.round((occupied / units.length) * 100) : 0;
    const overduePayments = payments.filter((p: any) => p.status === "OVERDUE").length;
    const urgentMaintenance = maintenance.filter((m: any) => m.priority === "URGENT" && !["COMPLETED", "CLOSED", "VERIFIED"].includes(m.status)).length;
    const activeMaintenance = maintenance.filter((m: any) => !["COMPLETED", "CLOSED", "VERIFIED"].includes(m.status)).length;
    const now = Date.now();
    const expiringLeases = leases.filter((l: any) => {
      const days = (new Date(l.end_date).getTime() - now) / 86400000;
      return days >= 0 && days <= 30 && l.status === "ACTIVE";
    }).length;
    const totalRevenue = payments.filter((p: any) => p.status === "PAID").reduce((s: number, p: any) => s + p.amount, 0);

    const data = { occupancyRate, totalUnits: units.length, occupiedUnits: occupied, overduePayments, urgentMaintenance, activeMaintenance, expiringLeases, totalRevenue };
    setRawData({ units, payments, maintenance, leases, properties: propRes.data || [] });
    setInsights(generateInsights(data));
    setLoading(false);
  }

  function handleQuery(q: string) {
    setQuery(q);
    setQuerying(true);

    setTimeout(() => {
      const lower = q.toLowerCase();
      let result = "";

      if (lower.includes("vacant") || lower.includes("available")) {
        const vacant = rawData.units?.filter((u: any) => u.status === "AVAILABLE") || [];
        result = vacant.length === 0
          ? "All your units are currently occupied — great news!"
          : `You have ${vacant.length} vacant unit${vacant.length > 1 ? "s" : ""} available for new tenants.`;
      } else if (lower.includes("overdue")) {
        const overdue = rawData.payments?.filter((p: any) => p.status === "OVERDUE") || [];
        result = overdue.length === 0
          ? "No overdue payments — all tenants are up to date!"
          : `${overdue.length} payment${overdue.length > 1 ? "s are" : " is"} overdue, totalling ₹${overdue.reduce((s: number, p: any) => s + p.amount, 0).toLocaleString("en-IN")}.`;
      } else if (lower.includes("attention") || lower.includes("today")) {
        const items = [];
        const urgentMaint = rawData.maintenance?.filter((m: any) => m.priority === "URGENT" && !["COMPLETED", "CLOSED"].includes(m.status)) || [];
        if (urgentMaint.length) items.push(`${urgentMaint.length} urgent maintenance issue${urgentMaint.length > 1 ? "s" : ""}`);
        const overdue = rawData.payments?.filter((p: any) => p.status === "OVERDUE") || [];
        if (overdue.length) items.push(`${overdue.length} overdue payment${overdue.length > 1 ? "s" : ""}`);
        const expiring = rawData.leases?.filter((l: any) => { const d = (new Date(l.end_date).getTime() - Date.now()) / 86400000; return d >= 0 && d <= 30; }) || [];
        if (expiring.length) items.push(`${expiring.length} lease${expiring.length > 1 ? "s" : ""} expiring soon`);
        result = items.length === 0
          ? "Everything looks good today! No urgent items require your attention."
          : `Your attention is needed for: ${items.join(", ")}.`;
      } else if (lower.includes("performing") || lower.includes("portfolio")) {
        const occ = rawData.units?.length > 0 ? Math.round((rawData.units.filter((u: any) => u.status === "OCCUPIED").length / rawData.units.length) * 100) : 0;
        const rev = rawData.payments?.filter((p: any) => p.status === "PAID").reduce((s: number, p: any) => s + p.amount, 0) || 0;
        result = `Your portfolio has ${rawData.properties?.length || 0} active properties, ${occ}% occupancy, and ₹${rev.toLocaleString("en-IN")} collected to date.`;
      } else if (lower.includes("expir")) {
        const expiring = rawData.leases?.filter((l: any) => { const d = (new Date(l.end_date).getTime() - Date.now()) / 86400000; return d >= 0 && d <= 30; }) || [];
        result = expiring.length === 0
          ? "No leases are expiring in the next 30 days."
          : `${expiring.length} lease${expiring.length > 1 ? "s" : ""} expiring in the next 30 days. Reach out for early renewal.`;
      } else {
        result = "I analyzed your portfolio data. Try asking about vacant units, overdue payments, lease expiries, or what needs your attention today.";
      }

      setQueryResult(result);
      setQuerying(false);
    }, 800);
  }

  const iconMap = { positive: <CheckCircle size={18} className="text-emerald-400" />, warning: <AlertTriangle size={18} className="text-amber-400" />, info: <Info size={18} className="text-blue-400" /> };
  const colorMap = { positive: "border-emerald-500/20 bg-emerald-500/5", warning: "border-amber-500/20 bg-amber-500/5", info: "border-blue-500/20 bg-blue-500/5" };

  if (loading) {
    return (
      <div>
        <Skeleton className="w-48 h-7 mb-6" />
        <div className="flex flex-col gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="RENFLIX Intelligence"
        subtitle="Rule-based insights from your live portfolio data"
      />

      {/* Query interface */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Cpu size={18} className="text-violet-400" />
          <h3 className="font-display font-bold text-white">Ask your portfolio</h3>
          <span className="text-xs text-navy-500 ml-auto">Data-driven · No external AI</span>
        </div>
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 bg-navy-900 border border-navy-600 rounded-lg px-3 py-2.5 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Ask a question about your portfolio..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && query.trim() && handleQuery(query)}
          />
          <button
            onClick={() => query.trim() && handleQuery(query)}
            disabled={querying || !query.trim()}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-semibold hover:bg-violet-500 disabled:opacity-40 transition-colors"
          >
            {querying ? "..." : "Ask"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => handleQuery(q)}
              className="text-xs px-3 py-1.5 bg-navy-700 border border-navy-600 rounded-full text-navy-300 hover:text-white hover:border-violet-500/50 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
        {queryResult && (
          <div className="mt-4 bg-violet-900/20 border border-violet-700/40 rounded-xl p-4 animate-fade-in">
            <div className="flex items-start gap-2">
              <Cpu size={16} className="text-violet-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-navy-200">{queryResult}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Auto-generated insights */}
      <h3 className="font-display font-semibold text-navy-300 text-sm uppercase tracking-wider mb-3">Portfolio Insights</h3>
      <div className="flex flex-col gap-3">
        {insights.map((insight, i) => (
          <div key={i} className={`border rounded-xl p-4 flex gap-3 ${colorMap[insight.type]}`}>
            <div className="flex-shrink-0 mt-0.5">{iconMap[insight.type]}</div>
            <div>
              <div className="font-display font-semibold text-white text-sm mb-1">{insight.title}</div>
              <p className="text-sm text-navy-300">{insight.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
