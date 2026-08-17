import { useEffect, useState } from "react";
import { CreditCard, Download, Receipt, Wallet, Upload, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import type { Payment, Tenant, Unit } from "../../lib/types";
import { Button, Card, EmptyState, PageHeader, Skeleton, StatusBadge, Toast, Modal, Select, Input, Textarea } from "../../components/ui";

declare global { interface Window { Razorpay?: any; } }

export default function TenantPaymentsPage() {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [donePayment, setDonePayment] = useState<Payment | null>(null);
  const [doneForm, setDoneForm] = useState({ payment_method: "UPI", reference_number: "", remarks: "" });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submittingProof, setSubmittingProof] = useState(false);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: t } = await supabase.from("tenants").select("*").eq("profile_id", user.id).maybeSingle();
    if (!t) { setLoading(false); return; }
    const td = t as Tenant; setTenant(td);
    if (td.unit_id) { const { data: u } = await supabase.from("units").select("*").eq("id", td.unit_id).maybeSingle(); if (u) setUnit(u as Unit); }
    const { data, error } = await supabase.from("payments").select("*").eq("tenant_id", td.id).order("due_date", { ascending: false });
    if (error) setToast({ msg: error.message, type: "error" }); else setPayments((data || []) as Payment[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [user?.id]);

  function loadRazorpayScript() { return new Promise<boolean>(resolve => { if (window.Razorpay) return resolve(true); const s = document.createElement("script"); s.src = "https://checkout.razorpay.com/v1/checkout.js"; s.onload = () => resolve(true); s.onerror = () => resolve(false); document.body.appendChild(s); }); }

  async function pay(payment: Payment) {
    setPaying(payment.id);
    try {
      const ok = await loadRazorpayScript(); if (!ok) throw new Error("Unable to load payment gateway.");
      const { data, error } = await supabase.functions.invoke("create-rent-order", { body: { payment_id: payment.id } });
      if (error || !data?.order_id) throw new Error(error?.message || data?.error || "Unable to create payment order.");
      const options = { key: data.key_id, amount: data.amount, currency: data.currency || "INR", name: "RENFLIX", description: `Rent payment ${payment.due_date || ""}`, order_id: data.order_id, prefill: { name: tenant?.full_name, email: tenant?.email, contact: tenant?.phone }, theme: { color: "#2563eb" }, handler: async (response: any) => {
        const { data: verified, error: verifyError } = await supabase.functions.invoke("verify-rent-payment", { body: { payment_id: payment.id, ...response } });
        if (verifyError || !verified?.success) setToast({ msg: verifyError?.message || verified?.error || "Payment verification failed.", type: "error" });
        else { setToast({ msg: "Payment successful. Receipt generated.", type: "success" }); await load(); }
      }, modal: { ondismiss: () => setPaying(null) } };
      const checkout = new window.Razorpay(options); checkout.open();
    } catch (e) { setToast({ msg: e instanceof Error ? e.message : "Payment failed.", type: "error" }); }
    finally { setPaying(null); }
  }

  async function submitPaymentProof(e: React.FormEvent) {
    e.preventDefault();
    if (!donePayment || !tenant || !user) return;
    setSubmittingProof(true);
    try {
      let screenshotUrl: string | null = null;
      if (proofFile) {
        if (!proofFile.type.startsWith("image/")) throw new Error("Please upload an image file.");
        if (proofFile.size > 5 * 1024 * 1024) throw new Error("Screenshot must be 5 MB or smaller.");
        const path = `${user.id}/${donePayment.id}/${Date.now()}-${proofFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage.from("payment-submissions").upload(path, proofFile, { upsert: false, contentType: proofFile.type });
        if (uploadError) throw uploadError;
        screenshotUrl = path;
      }

      const { error } = await supabase.rpc("submit_payment_proof", {
        p_payment_id: donePayment.id,
        p_payment_method: doneForm.payment_method,
        p_reference_number: doneForm.reference_number.trim() || null,
        p_remarks: doneForm.remarks.trim() || null,
        p_screenshot_url: screenshotUrl,
      });
      if (error) throw error;

      setToast({msg:"Payment submitted for admin review.",type:"success"});
      setDonePayment(null);
      await load();
    } catch (e) {
      setToast({msg:e instanceof Error ? e.message : "Unable to submit payment proof.",type:"error"});
    } finally { setSubmittingProof(false); }
  }

  function downloadReceipt(payment: Payment) {
    const html = `<html><head><title>RENFLIX Receipt</title><style>body{font-family:Arial;padding:40px;max-width:650px;margin:auto}h1{color:#2563eb}.line{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #ddd}</style></head><body><h1>RENFLIX</h1><h2>Payment Receipt</h2><div class="line"><b>Tenant</b><span>${tenant?.full_name || ""}</span></div><div class="line"><b>Amount</b><span>₹${payment.amount.toLocaleString("en-IN")}</span></div><div class="line"><b>Due date</b><span>${payment.due_date || "—"}</span></div><div class="line"><b>Paid date</b><span>${payment.paid_date || "—"}</span></div><div class="line"><b>Method</b><span>${payment.payment_method || "—"}</span></div><div class="line"><b>Reference</b><span>${payment.reference_number || "—"}</span></div><p>Thank you for your payment.</p><script>window.print()</script></body></html>`;
    const w = window.open("", "_blank", "width=700,height=800"); if (w) { w.document.write(html); w.document.close(); }
  }

  const pending = payments.filter(p => ["PENDING", "OVERDUE", "PARTIALLY_PAID"].includes(p.status));
  return <div className="animate-fade-in"><PageHeader title="Payments" subtitle="View and pay your monthly rent" />
    {unit && <Card className="mb-5"><div className="flex items-center gap-3"><Wallet className="text-blue-400"/><div><p className="text-xs text-navy-500">Current monthly rent</p><p className="text-xl font-bold text-white">₹{unit.monthly_rent.toLocaleString("en-IN")}</p></div></div></Card>}
    {loading ? <div className="flex flex-col gap-2">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div> : payments.length === 0 ? <Card><EmptyState icon={<CreditCard size={28}/>} title="No payments yet" description="Your monthly rent payment will appear here." /></Card> : <div className="flex flex-col gap-3">{payments.map(p => <Card key={p.id}><div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between"><div><div className="flex items-center gap-2"><span className="text-lg font-bold text-white">₹{p.amount.toLocaleString("en-IN")}</span><span className="text-xs font-mono font-bold text-blue-300">#{p.payment_display_id || "—"}</span><StatusBadge status={p.status}/></div><p className="text-xs text-navy-500 mt-1">Due {p.due_date ? new Date(p.due_date).toLocaleDateString("en-IN") : "—"}{p.paid_date ? ` · Paid ${new Date(p.paid_date).toLocaleDateString("en-IN")}` : ""}</p>{p.reference_number && <p className="text-xs text-navy-600 font-mono mt-1">{p.reference_number}</p>}</div><div className="flex gap-2">{p.status === "UNDER_REVIEW" ? (
  <span className="text-xs text-amber-300 font-semibold px-2">Under review</span>
) : ["PENDING", "OVERDUE", "PARTIALLY_PAID"].includes(p.status) ? (
  <div className="flex gap-2 flex-wrap justify-end">
    <Button onClick={() => pay(p)} loading={paying === p.id}>Pay Now</Button>
    <Button variant="secondary" onClick={() => { setDonePayment(p); setDoneForm({payment_method:"UPI",reference_number:"",remarks:""}); setProofFile(null); }}>
      <CheckCircle2 size={15}/> Done
    </Button>
  </div>
) : (
  <Button variant="secondary" onClick={() => setReceipt(p)}><Receipt size={15}/> Receipt</Button>
)}</div></div></Card>)}</div>}
    <Modal open={!!donePayment} onClose={() => !submittingProof && setDonePayment(null)} title="Mark Payment as Done">
      <form onSubmit={submitPaymentProof} className="flex flex-col gap-4">
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg px-3 py-2 text-xs text-blue-300">
          Enter how you paid. The request will be sent to the admin for review.
        </div>
        <Select label="Payment mode" value={doneForm.payment_method} onChange={e=>setDoneForm(f=>({...f,payment_method:e.target.value}))}
          options={[{value:"UPI",label:"UPI"},{value:"BANK_TRANSFER",label:"Bank Transfer"},{value:"CASH",label:"Cash"},{value:"CHEQUE",label:"Cheque"},{value:"CARD",label:"Card"},{value:"OTHER",label:"Other"}]} />
        <Input label="Transaction ID" value={doneForm.reference_number} onChange={e=>setDoneForm(f=>({...f,reference_number:e.target.value}))} required placeholder="Enter transaction / reference ID" />
        <Textarea label="Remarks" value={doneForm.remarks} onChange={e=>setDoneForm(f=>({...f,remarks:e.target.value}))} placeholder="Optional remarks" />
        <div>
          <label className="text-xs font-semibold text-navy-300 font-display uppercase tracking-wider">Payment screenshot <span className="text-navy-500 normal-case">(optional)</span></label>
          <label className="mt-1 flex items-center gap-2 border border-dashed border-navy-600 rounded-lg px-3 py-3 cursor-pointer hover:border-blue-500">
            <Upload size={16} className="text-blue-400"/>
            <span className="text-sm text-navy-300 truncate">{proofFile?.name || "Choose screenshot"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={e=>setProofFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" type="button" onClick={()=>setDonePayment(null)}>Cancel</Button>
          <Button type="submit" loading={submittingProof}><CheckCircle2 size={15}/> Submit for Review</Button>
        </div>
      </form>
    </Modal>

    {receipt && <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"><div className="bg-navy-800 border border-navy-700 rounded-xl p-6 w-full max-w-md"><div className="text-center"><Receipt className="mx-auto text-emerald-400" size={36}/><h2 className="text-xl font-bold text-white mt-3">Payment Receipt</h2><p className="text-navy-400 text-sm">RENFLIX</p></div><div className="mt-5 space-y-3 text-sm"><Row l="Tenant" v={tenant?.full_name || "—"}/><Row l="Amount" v={`₹${receipt.amount.toLocaleString("en-IN")}`}/><Row l="Paid" v={receipt.paid_date || "—"}/><Row l="Method" v={receipt.payment_method || "—"}/><Row l="Reference" v={receipt.reference_number || "—"}/></div><div className="flex gap-2 mt-5"><Button className="flex-1" onClick={() => downloadReceipt(receipt)}><Download size={15}/> Print / Save</Button><Button variant="ghost" onClick={() => setReceipt(null)}>Close</Button></div></div></div>}
    {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
  </div>;
}
function Row({l,v}:{l:string;v:string}) { return <div className="flex justify-between border-b border-navy-700 pb-2"><span className="text-navy-500">{l}</span><span className="text-white font-medium text-right ml-4 break-all">{v}</span></div>; }
