import { useEffect, useState } from "react";
import { CreditCard, Plus, Search, Receipt, Send } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import {
  Button, Card, StatusBadge, Modal, Input, Select, Textarea, PageHeader, EmptyState, Skeleton, Toast,
} from "../../components/ui";
import type { Payment, PaymentStatus, PaymentMethod, Tenant, Property, Unit } from "../../lib/types";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "UPI", label: "UPI" },
  { value: "BANK_TRANSFER", label: "Bank Transfer / NEFT / RTGS" },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

const defaultForm = {
  tenant_id: "",
  property_id: "",
  amount: "",
  payment_method: "UPI" as PaymentMethod,
  paid_date: new Date().toISOString().split("T")[0],
  reference_number: "",
  notes: "",
  status: "PAID" as PaymentStatus,
};

const pushDefault = {
  property_id: "",
  tenant_id: "",
  amount: "",
  month: new Date().toISOString().slice(0, 7),
  remarks: "",
};

function formatINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function PaymentsPage() {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterProperty, setFilterProperty] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
  const [pushForm, setPushForm] = useState(pushDefault);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [pushSubmitting, setPushSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (profile?.organization_id) fetchAll();
    else setLoading(false);
  }, [profile]);

  async function fetchAll() {
    const [payRes, tenRes, propRes, unitRes] = await Promise.all([
      supabase.from("payments").select("*").eq("organization_id", profile!.organization_id!).order("created_at", { ascending: false }),
      supabase.from("tenants").select("*").eq("organization_id", profile!.organization_id!).eq("status", "ACTIVE"),
      supabase.from("properties").select("*").eq("organization_id", profile!.organization_id!).eq("status", "ACTIVE"),
      supabase.from("units").select("*").eq("organization_id", profile!.organization_id!),
    ]);
    setPayments(payRes.data || []);
    setTenants(tenRes.data || []);
    setProperties(propRes.data || []);
    setUnits((unitRes.data || []) as Unit[]);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("payments").insert({
      organization_id: profile!.organization_id!,
      tenant_id: form.tenant_id,
      property_id: form.property_id || null,
      amount: parseFloat(form.amount),
      payment_method: form.payment_method,
      paid_date: form.paid_date,
      reference_number: form.reference_number || null,
      notes: form.notes || null,
      status: form.status,
    });
    if (error) setToast({ msg: error.message, type: "error" });
    else {
      setToast({ msg: "Payment recorded!", type: "success" });
      setShowModal(false);
      setForm(defaultForm);
      fetchAll();
    }
    setSubmitting(false);
  }

  async function handlePushPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.organization_id || !pushForm.property_id || !pushForm.tenant_id || !pushForm.amount || !pushForm.month) {
      setToast({ msg: "Select property, tenant, month and enter an amount.", type: "error" });
      return;
    }
    setPushSubmitting(true);
    try {
      const { data: payment, error } = await supabase.rpc("push_payment_request", {
        p_property_id: pushForm.property_id,
        p_tenant_id: pushForm.tenant_id,
        p_amount: Number(pushForm.amount),
        p_month: `${pushForm.month}-01`,
        p_remarks: pushForm.remarks?.trim() || null,
      });
      if (error) throw error;
      if (!payment) throw new Error("Payment request was not created.");
      setToast({ msg: "Payment request pushed to the tenant.", type: "success" });
      setShowPushModal(false);
      setPushForm(pushDefault);
      fetchAll();
    } catch (error) {
      setToast({ msg: error instanceof Error ? error.message : "Unable to push payment request.", type: "error" });
    } finally {
      setPushSubmitting(false);
    }
  }

  const filtered = payments.filter((p) => {
    const t = tenants.find((t) => t.id === p.tenant_id);
    const matchesSearch = (t?.full_name || "").toLowerCase().includes(search.toLowerCase()) || (p.reference_number || "").toLowerCase().includes(search.toLowerCase());
    const matchesProperty = !filterProperty || p.property_id === filterProperty;
    const matchesUnit = !filterUnit || p.unit_id === filterUnit;
    const matchesStatus = !filterStatus || p.status === filterStatus;
    return matchesSearch && matchesProperty && matchesUnit && matchesStatus;
  });

  const totalPaid = payments.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter((p) => p.status === "OVERDUE" || p.status === "DUE").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Payments"
        subtitle="Record and track all rent payments"
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setShowPushModal(true)} size="sm">
              <Send size={15} /> Push
            </Button>
            <Button onClick={() => setShowModal(true)} size="sm">
              <Plus size={16} /> Record
            </Button>
          </div>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <div className="text-xs text-emerald-400 font-display font-semibold uppercase tracking-wider mb-1">Total collected</div>
          <div className="font-display text-2xl font-bold text-emerald-400">{formatINR(totalPaid)}</div>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="text-xs text-red-400 font-display font-semibold uppercase tracking-wider mb-1">Due / Overdue</div>
          <div className="font-display text-2xl font-bold text-red-400">{formatINR(totalOverdue)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 items-end">
        <div className="relative w-full col-span-2 lg:col-span-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500 pointer-events-none" />
          <input
            className="w-full h-10 bg-navy-800 border border-navy-700 rounded-lg pl-9 pr-3 py-2.5 text-sm leading-5 text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric focus:border-transparent"
            placeholder="Search tenant / reference..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
        </div>
        <Select label="Property" value={filterProperty} onChange={e=>{setFilterProperty(e.target.value);setFilterUnit("")}} options={[{value:"",label:"All properties"},...properties.map(p=>({value:p.id,label:p.name}))]} className="min-w-0 w-full" />
        <Select label="Unit" value={filterUnit} onChange={e=>setFilterUnit(e.target.value)} options={[{value:"",label:"All units"},...units.filter(u=>!filterProperty || u.property_id===filterProperty).map(u=>({value:u.id,label:u.unit_number}))]} className="min-w-0 w-full" />
        <div className="col-span-2 lg:col-span-1 min-w-0"><Select label="Payment Status" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} options={[{value:"",label:"All payments"},{value:"PENDING",label:"Pending"},{value:"DUE",label:"Due"},{value:"UNDER_REVIEW",label:"Under Review"},{value:"PAID",label:"Paid"},{value:"PARTIALLY_PAID",label:"Partially Paid"},{value:"OVERDUE",label:"Overdue"}]} className="w-full" /></div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CreditCard size={28} />}
            title="No payments yet"
            description="Record your first payment to track rent collection."
            action={<Button onClick={() => setShowModal(true)} size="sm"><Plus size={14} /> Record Payment</Button>}
          />
        </Card>
      ) : (
        <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
          <table className="w-full table-fixed text-[11px] sm:text-sm">
            <thead>
              <tr className="border-b border-navy-700">
                <th className="hidden md:table-cell md:w-[18%] text-left px-2 sm:px-4 py-3 text-[9px] sm:text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">Payment ID</th>
                <th className="w-[34%] md:w-[28%] text-left px-2 sm:px-3 py-3 text-[10px] sm:text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">Tenant</th>
                <th className="w-[24%] md:w-[19%] text-right px-2 sm:px-3 py-3 text-[9px] sm:text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">Amount</th>
                <th className="w-[21%] md:w-[17%] text-center px-1 sm:px-3 py-3 text-[9px] sm:text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">Date</th>
                <th className="w-[21%] md:w-[18%] text-center px-1 sm:px-3 py-3 text-[9px] sm:text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((pay) => {
                const tenant = tenants.find((t) => t.id === pay.tenant_id);
                return (
                  <tr key={pay.id} className="border-b border-navy-700/50 hover:bg-navy-700/30 transition-colors">
                    <td className="hidden md:table-cell px-2 sm:px-4 py-3 font-mono text-blue-300 font-semibold truncate">#{pay.payment_display_id || "—"}</td>
                    <td className="px-2 sm:px-3 py-3 min-w-0">
                      <button type="button" onClick={() => setReceiptPayment(pay)} className="block text-left max-w-full">
                        <div className="font-semibold text-white text-[12px] sm:text-sm truncate">{tenant?.full_name || "Unknown"}</div>
                        {pay.reference_number && <div className="text-[9px] sm:text-xs text-navy-500 font-mono truncate">{pay.reference_number}</div>}
                      </button>
                    </td>
                    <td className="px-2 sm:px-3 py-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap"><button type="button" onClick={() => setReceiptPayment(pay)} className="hover:underline">{formatINR(pay.amount)}</button></td>
                    <td className="px-1 sm:px-2 py-3 text-center text-navy-400 whitespace-nowrap">{pay.paid_date ? new Date(pay.paid_date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit" }) : "—"}</td>
                    <td className="px-1 sm:px-2 py-3 text-center"><StatusBadge status={pay.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Manual Payment">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg px-3 py-2 text-xs text-blue-300">
            This records a manual payment. For online payments, a payment gateway integration is required.
          </div>
          <Select
            label="Tenant"
            value={form.tenant_id}
            onChange={(e) => setForm(f => ({ ...f, tenant_id: e.target.value }))}
            options={[{ value: "", label: "Select tenant" }, ...tenants.map((t) => ({ value: t.id, label: t.full_name }))]}
          />
          <Select
            label="Property"
            value={form.property_id}
            onChange={(e) => setForm(f => ({ ...f, property_id: e.target.value }))}
            options={[{ value: "", label: "Select property" }, ...properties.map((p) => ({ value: p.id, label: p.name }))]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount (₹)" type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="18000" />
            <Input label="Payment date" type="date" value={form.paid_date} onChange={(e) => setForm(f => ({ ...f, paid_date: e.target.value }))} required />
          </div>
          <Select
            label="Payment method"
            value={form.payment_method}
            onChange={(e) => setForm(f => ({ ...f, payment_method: e.target.value as PaymentMethod }))}
            options={PAYMENT_METHODS}
          />
          <Input label="Reference / Transaction ID" value={form.reference_number} onChange={(e) => setForm(f => ({ ...f, reference_number: e.target.value }))} placeholder="UPI ref / bank ref" />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes..." />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>Record Payment</Button>
          </div>
        </form>
      </Modal>

      {/* Push Payment Modal */}
      <Modal open={showPushModal} onClose={() => !pushSubmitting && setShowPushModal(false)} title="Push Payment Request">
        <form onSubmit={handlePushPayment} className="flex flex-col gap-4">
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg px-3 py-2 text-xs text-blue-300">
            Send a payment request to a tenant. It will appear in their notifications and Payments page.
          </div>
          <Select
            label="Property"
            value={pushForm.property_id}
            onChange={(e) => setPushForm(f => ({ ...f, property_id: e.target.value, tenant_id: "" }))}
            options={[{ value: "", label: "Select property" }, ...properties.map(p => ({ value: p.id, label: p.name }))]}
            required
          />
          <Select
            label="Tenant"
            value={pushForm.tenant_id}
            onChange={(e) => setPushForm(f => ({ ...f, tenant_id: e.target.value }))}
            options={[
              { value: "", label: pushForm.property_id ? "Select tenant" : "Select property first" },
              ...tenants
                .filter(t => {
                  const unit = units.find(u => u.id === t.unit_id);
                  return unit?.property_id === pushForm.property_id;
                })
                .map(t => ({ value: t.id, label: `${t.full_name}${t.phone ? ` · ${t.phone}` : ""}` }))
            ]}
            disabled={!pushForm.property_id}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount (₹)" type="number" min="1" value={pushForm.amount} onChange={e => setPushForm(f => ({ ...f, amount: e.target.value }))} placeholder="15000" required />
            <Input label="Month" type="month" value={pushForm.month} onChange={e => setPushForm(f => ({ ...f, month: e.target.value }))} required />
          </div>
          <Textarea label="Remarks" value={pushForm.remarks || ""} onChange={e => setPushForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional remarks for the tenant..." />
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowPushModal(false)}>Cancel</Button>
            <Button type="submit" loading={pushSubmitting}><Send size={15} /> Push</Button>
          </div>
        </form>
      </Modal>

      {/* Receipt Modal */}
      {receiptPayment && (
        <Modal open={!!receiptPayment} onClose={() => setReceiptPayment(null)} title="Payment Receipt">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Receipt size={28} className="text-white" />
            </div>
            <div className="font-display text-xl font-bold text-white mb-1">Payment Confirmed</div>
            <div className="text-navy-400 text-sm">RENFLIX Receipt</div>
          </div>
          <div className="bg-navy-900 rounded-xl p-4 flex flex-col gap-3 text-sm font-mono">
            <ReceiptLine label="Amount" value={formatINR(receiptPayment.amount)} />
            <ReceiptLine label="Tenant" value={tenants.find(t => t.id === receiptPayment.tenant_id)?.full_name || "—"} />
            <ReceiptLine label="Method" value={receiptPayment.payment_method || "—"} />
            {receiptPayment.reference_number && <ReceiptLine label="Ref" value={receiptPayment.reference_number} />}
            <ReceiptLine label="Date" value={receiptPayment.paid_date ? new Date(receiptPayment.paid_date).toLocaleDateString("en-IN") : "—"} />
            <ReceiptLine label="Status" value={receiptPayment.status} />
          </div>
          {receiptPayment.notes && <p className="text-xs text-navy-500 mt-3">{receiptPayment.notes}</p>}
          <Button variant="ghost" className="w-full mt-4" onClick={() => setReceiptPayment(null)}>Close</Button>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-navy-800 pb-2 last:border-0 last:pb-0">
      <span className="text-navy-500">{label}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}
