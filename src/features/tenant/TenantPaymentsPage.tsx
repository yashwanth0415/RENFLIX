import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, ExternalLink, Receipt, Wallet, XCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import type { Payment, Tenant, Unit } from "../../lib/types";
import { Button, Card, EmptyState, Input, Modal, PageHeader, Skeleton, StatusBadge, Toast } from "../../components/ui";

type UpiApp = {
  name: string;
  scheme: string;
  initials: string;
  className: string;
};

const UPI_APPS: UpiApp[] = [
  { name: "Google Pay", scheme: "tez", initials: "G", className: "bg-blue-500/15 text-blue-300" },
  { name: "PhonePe", scheme: "phonepe", initials: "P", className: "bg-violet-500/15 text-violet-300" },
  { name: "Paytm", scheme: "paytmmp", initials: "P", className: "bg-cyan-500/15 text-cyan-300" },
  { name: "Amazon Pay", scheme: "amazonpay", initials: "A", className: "bg-amber-500/15 text-amber-300" },
];

function encodeUpiPart(value: string) {
  return encodeURIComponent(value);
}

function buildUpiUrl(
  app: UpiApp,
  upiId: string,
  amount: number,
  paymentId: string,
  tenantName: string
) {
  const params = [
    `pa=${encodeUpiPart(upiId)}`,
    `pn=${encodeUpiPart(tenantName || "RENFLIX Property Owner")}`,
    `am=${encodeURIComponent(amount.toFixed(2))}`,
    "cu=INR",
    `tn=${encodeUpiPart(`RENFLIX Rent ${paymentId}`)}`,
  ].join("&");

  return `${app.scheme}://upi/pay?${params}`;
}

export default function TenantPaymentsPage() {
  const { user } = useAuth();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ownerUpiId, setOwnerUpiId] = useState("");
  const [ownerName, setOwnerName] = useState("Property Owner");
  const [loading, setLoading] = useState(true);

  const [paying, setPaying] = useState<Payment | null>(null);
  const [returning, setReturning] = useState(false);
  const [result, setResult] = useState<"success" | "failed" | null>(null);
  const [resultPayment, setResultPayment] = useState<Payment | null>(null);
  const [utr, setUtr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Payment | null>(null);

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  async function load() {
    if (!user) return;

    setLoading(true);

    try {
      const { data: t, error: tenantError } = await supabase
        .from("tenants")
        .select("*")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (tenantError) throw tenantError;
      if (!t) return;

      const td = t as Tenant;
      setTenant(td);

      if (td.unit_id) {
        const { data: u } = await supabase
          .from("units")
          .select("*")
          .eq("id", td.unit_id)
          .maybeSingle();

        if (u) {
          setUnit(u as Unit);
        }
      }

      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", td.id)
        .order("due_date", { ascending: false });

      if (error) throw error;

      setPayments((data || []) as Payment[]);

      const { data: upi, error: upiError } = await supabase.rpc(
        "get_tenant_owner_upi"
      );

      if (upiError) throw upiError;

      setOwnerUpiId((upi || "").trim());

      const { data: owner } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("organization_id", td.organization_id)
        .eq("role", "OWNER")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      setOwnerName(owner?.full_name || "Property Owner");
    } catch (e) {
      setToast({
        msg: e instanceof Error ? e.message : "Unable to load payments.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user?.id]);

  useEffect(() => {
    const paymentId = sessionStorage.getItem("renflix:upi-payment-id");

    if (!paymentId) return;

    const onReturn = () => {
      if (!document.hidden) {
        setReturning(true);
      }
    };

    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);

    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, []);

  const pending = payments.filter((p) =>
    ["PENDING", "DUE", "OVERDUE", "PARTIALLY_PAID"].includes(p.status)
  );

  void pending;

  function openPaymentInterface(payment: Payment) {
    if (!ownerUpiId) {
      setToast({
        msg: "The property owner has not configured a UPI ID yet.",
        type: "error",
      });
      return;
    }

    setPaying(payment);
  }

  function launchUpi(app: UpiApp) {
    if (!paying || !ownerUpiId) return;

    sessionStorage.setItem("renflix:upi-payment-id", paying.id);
    sessionStorage.setItem("renflix:upi-launch-time", String(Date.now()));

    const url = buildUpiUrl(
      app,
      ownerUpiId,
      paying.amount,
      paying.payment_display_id || paying.id.slice(0, 8),
      ownerName
    );

    window.location.href = url;
  }

  function handleResult(choice: "success" | "failed") {
    const paymentId = sessionStorage.getItem("renflix:upi-payment-id");

    const payment =
      payments.find((p) => p.id === paymentId) || paying;

    setPaying(null);
    setReturning(false);

    sessionStorage.removeItem("renflix:upi-payment-id");
    sessionStorage.removeItem("renflix:upi-launch-time");

    setResult(choice);
    setResultPayment(payment || null);

    if (choice === "failed") {
      setUtr("");
    }
  }

  async function submitSuccessfulPayment() {
    if (!resultPayment) return;

    setSubmitting(true);

    try {
      const { error } = await supabase.rpc(
        "submit_upi_intent_payment",
        {
          p_payment_id: resultPayment.id,
          p_reference_number: utr.trim() || null,
        }
      );

      if (error) throw error;

      setToast({
        msg: "Payment submitted successfully for verification.",
        type: "success",
      });

      setResult(null);
      setResultPayment(null);
      setUtr("");

      await load();
    } catch (e) {
      setToast({
        msg:
          e instanceof Error
            ? e.message
            : "Unable to submit the payment result.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function downloadReceipt(payment: Payment) {
    const status =
      payment.status === "PAID" || payment.status === "RECEIVED"
        ? "Payment Confirmed"
        : "Payment Acknowledgement - Verification Pending";

    const html = `
      <html>
        <head>
          <title>RENFLIX Receipt</title>
          <style>
            body {
              font-family: Arial;
              padding: 40px;
              max-width: 650px;
              margin: auto;
              color: #111;
            }
            .line {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid #ddd;
            }
            h1 {
              margin-bottom: 4px;
            }
            small {
              color: #666;
            }
          </style>
        </head>
        <body>
          <h1>RENFLIX</h1>
          <h2>${status}</h2>

          <div class="line">
            <b>Tenant</b>
            <span>${tenant?.full_name || ""}</span>
          </div>

          <div class="line">
            <b>Amount</b>
            <span>Rs. ${payment.amount.toLocaleString("en-IN")}</span>
          </div>

          <div class="line">
            <b>Due date</b>
            <span>${payment.due_date || "-"}</span>
          </div>

          <div class="line">
            <b>Status</b>
            <span>${payment.status}</span>
          </div>

          <div class="line">
            <b>Method</b>
            <span>${payment.payment_method || "UPI"}</span>
          </div>

          <div class="line">
            <b>Reference</b>
            <span>${payment.reference_number || "-"}</span>
          </div>

          <p>
            <small>
              This document reflects the RENFLIX payment record.
              UPI payments remain subject to verification until the payment is approved.
            </small>
          </p>

          <script>
            window.print();
          </script>
        </body>
      </html>
    `;

    const w = window.open("", "_blank", "width=700,height=800");

    if (w) {
      w.document.write(html);
      w.document.close();
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Payments"
        subtitle="View and pay your monthly rent"
      />

      {unit && (
        <Card className="mb-5">
          <div className="flex items-center gap-3">
            <Wallet className="text-blue-400" />

            <div>
              <p className="text-xs text-navy-500">
                Current monthly rent
              </p>

              <p className="text-xl font-bold text-white">
                Rs. {unit.monthly_rent.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {!ownerUpiId && !loading && (
        <Card className="mb-4 border-amber-700/50">
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-300 flex items-center justify-center">
              <CreditCard size={18} />
            </div>

            <div>
              <p className="font-semibold text-white">
                UPI payments are not configured
              </p>

              <p className="text-sm text-navy-400 mt-1">
                Ask your property owner to add their UPI ID in Settings before
                paying online.
              </p>
            </div>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CreditCard size={28} />}
            title="No payments yet"
            description="Your monthly rent payment will appear here."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {payments.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg font-bold text-white">
                      Rs. {p.amount.toLocaleString("en-IN")}
                    </span>

                    <span className="text-xs font-mono font-bold text-blue-300">
                      #{p.payment_display_id || "-"}
                    </span>

                    <StatusBadge status={p.status} />
                  </div>

                  <p className="text-xs text-navy-500 mt-1">
                    Due{" "}
                    {p.due_date
                      ? new Date(p.due_date).toLocaleDateString("en-IN")
                      : "-"}
                    {p.paid_date
                      ? ` · Paid ${new Date(
                          p.paid_date
                        ).toLocaleDateString("en-IN")}`
                      : ""}
                  </p>

                  {p.reference_number && (
                    <p className="text-xs text-navy-600 font-mono mt-1">
                      {p.reference_number}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 flex-wrap justify-end">
                  {[
                    "PENDING",
                    "DUE",
                    "OVERDUE",
                    "PARTIALLY_PAID",
                  ].includes(p.status) ? (
                    <Button
                      onClick={() => openPaymentInterface(p)}
                      disabled={!ownerUpiId}
                    >
                      Pay Now
                    </Button>
                  ) : p.status === "UNDER_REVIEW" ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-300 font-semibold px-1">
                        Awaiting verification
                      </span>

                      <Button
                        variant="secondary"
                        onClick={() => setReceipt(p)}
                      >
                        <Receipt size={15} /> Receipt
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => setReceipt(p)}
                    >
                      <Receipt size={15} /> Receipt
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!paying}
        onClose={() => setPaying(null)}
        title="Pay Rent with UPI"
      >
        {paying && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-xs text-navy-500">Amount</p>

                  <p className="text-2xl font-bold text-white">
                    Rs. {paying.amount.toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-navy-500">Pay to</p>

                  <p className="text-sm font-semibold text-white break-all">
                    {ownerUpiId}
                  </p>

                  <p className="text-xs text-navy-500 mt-1">
                    {ownerName}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-2">
                Choose a UPI app
              </p>

              <div className="grid grid-cols-2 gap-3">
                {UPI_APPS.map((app) => (
                  <button
                    key={app.name}
                    type="button"
                    onClick={() => launchUpi(app)}
                    className="rounded-xl border border-navy-700 bg-navy-900 p-4 text-left hover:border-blue-500/50 hover:bg-navy-800 transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold mb-3 ${app.className}`}
                    >
                      {app.initials}
                    </div>

                    <div className="text-sm font-semibold text-white">
                      {app.name}
                    </div>

                    <div className="text-[11px] text-navy-500 mt-1 flex items-center gap-1">
                      Open app <ExternalLink size={11} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[11px] text-navy-500 leading-5">
              The selected app opens with the owner UPI ID and rent amount
              pre-filled. After returning to RENFLIX, confirm the payment
              result and enter the UTR if available. RENFLIX keeps the payment
              under review until it is verified.
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={returning}
        onClose={() => setReturning(false)}
        title="Payment app closed"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-navy-300">
            Did you complete the UPI payment in the app?
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={() => handleResult("failed")}
            >
              <XCircle size={16} /> Payment failed
            </Button>

            <Button onClick={() => handleResult("success")}>
              <CheckCircle2 size={16} /> I paid
            </Button>
          </div>

          <p className="text-[11px] text-navy-500">
            A browser cannot independently verify a bank transaction after a
            UPI deep link returns. Selecting "I paid" submits the payment for
            verification.
          </p>
        </div>
      </Modal>

      <Modal
        open={result === "success" && !!resultPayment}
        onClose={() => !submitting && setResult(null)}
        title="Payment submitted"
      >
        {resultPayment && (
          <div className="flex flex-col gap-4">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 text-emerald-300 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} />
              </div>

              <h3 className="text-lg font-bold text-white">
                Payment successful
              </h3>

              <p className="text-sm text-navy-400 mt-1">
                Your payment has been submitted for verification.
              </p>
            </div>

            <Input
              label="UPI Transaction ID / UTR (optional)"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="Enter UTR if your app shows one"
            />

            <Button
              className="w-full"
              onClick={submitSuccessfulPayment}
              loading={submitting}
            >
              Submit Payment
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={result === "failed" && !!resultPayment}
        onClose={() => setResult(null)}
        title="Payment failed"
      >
        <div className="flex flex-col gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-red-500/15 text-red-300 flex items-center justify-center mx-auto">
            <XCircle size={28} />
          </div>

          <h3 className="text-lg font-bold text-white">
            Payment failed
          </h3>

          <p className="text-sm text-navy-400">
            No payment has been recorded. You can close this message and try
            again.
          </p>

          <Button
            variant="secondary"
            className="w-full"
            onClick={() => setResult(null)}
          >
            Close
          </Button>
        </div>
      </Modal>

      {receipt && (
        <Modal
          open={!!receipt}
          onClose={() => setReceipt(null)}
          title="Payment Receipt"
        >
          <div className="text-center mb-5">
            <div
              className={`w-14 h-14 rounded-2xl ${
                receipt.status === "PAID" || receipt.status === "RECEIVED"
                  ? "bg-emerald-600"
                  : "bg-amber-600"
              } flex items-center justify-center mx-auto mb-3`}
            >
              <Receipt size={26} className="text-white" />
            </div>

            <div className="font-display text-xl font-bold text-white">
              {receipt.status === "PAID" || receipt.status === "RECEIVED"
                ? "Payment Confirmed"
                : "Payment Acknowledgement"}
            </div>

            <div className="text-navy-400 text-sm">
              RENFLIX Receipt
            </div>
          </div>

          <div className="bg-navy-900 rounded-xl p-4 flex flex-col gap-3 text-sm font-mono">
            <ReceiptLine
              label="Amount"
              value={`Rs. ${receipt.amount.toLocaleString("en-IN")}`}
            />

            <ReceiptLine
              label="Tenant"
              value={tenant?.full_name || "-"}
            />

            <ReceiptLine
              label="Method"
              value={receipt.payment_method || "UPI"}
            />

            {receipt.reference_number && (
              <ReceiptLine
                label="UTR"
                value={receipt.reference_number}
              />
            )}

            <ReceiptLine
              label="Date"
              value={
                receipt.paid_date
                  ? new Date(receipt.paid_date).toLocaleDateString("en-IN")
                  : new Date(receipt.created_at).toLocaleDateString("en-IN")
              }
            />

            <ReceiptLine
              label="Status"
              value={receipt.status}
            />
          </div>

          <Button
            className="w-full mt-4"
            onClick={() => downloadReceipt(receipt)}
          >
            Print / Save Receipt
          </Button>
        </Modal>
      )}

      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

function ReceiptLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex justify-between gap-4 items-center border-b border-navy-800 pb-2 last:border-0 last:pb-0">
      <span className="text-navy-500">{label}</span>
      <span className="text-white font-semibold text-right break-all">
        {value}
      </span>
    </div>
  );
}