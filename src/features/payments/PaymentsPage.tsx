import { useEffect, useState } from "react";
import {
  CreditCard,
  Plus,
  Receipt,
  Search,
  Send,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import {
  Button,
  Card,
  StatusBadge,
  Modal,
  Input,
  Select,
  Textarea,
  PageHeader,
  EmptyState,
  Skeleton,
  Toast,
} from "../../components/ui";
import type {
  Payment,
  PaymentStatus,
  PaymentMethod,
  Tenant,
  Property,
  Unit,
} from "../../lib/types";

const PAYMENT_METHODS: {
  value: PaymentMethod;
  label: string;
}[] = [
  { value: "UPI", label: "UPI" },
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer / NEFT / RTGS",
  },
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
];

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

const defaultForm = {
  tenant_id: "",
  property_id: "",
  amount: "",
  payment_method: "UPI" as PaymentMethod,
  paid_date: getToday(),
  reference_number: "",
  notes: "",
  status: "PAID" as PaymentStatus,
};

const pushDefault = {
  property_id: "",
  tenant_id: "",
  amount: "",
  remarks: "",
};

function formatINR(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
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

  const [form, setForm] = useState(defaultForm);
  const [pushForm, setPushForm] = useState(pushDefault);

  const [submitting, setSubmitting] = useState(false);
  const [pushSubmitting, setPushSubmitting] = useState(false);

  const [receiptPayment, setReceiptPayment] =
    useState<Payment | null>(null);

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (profile?.organization_id) {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [profile?.organization_id]);

  async function fetchAll() {
    if (!profile?.organization_id) {
      return;
    }

    setLoading(true);

    try {
      const [paymentsRes, tenantsRes, propertiesRes, unitsRes] =
        await Promise.all([
          supabase
            .from("payments")
            .select("*")
            .eq("organization_id", profile.organization_id)
            .order("created_at", { ascending: false }),

          supabase
            .from("tenants")
            .select("*")
            .eq("organization_id", profile.organization_id)
            .eq("status", "ACTIVE"),

          supabase
            .from("properties")
            .select("*")
            .eq("organization_id", profile.organization_id)
            .eq("status", "ACTIVE"),

          supabase
            .from("units")
            .select("*")
            .eq("organization_id", profile.organization_id),
        ]);

      if (paymentsRes.error) {
        throw paymentsRes.error;
      }

      if (tenantsRes.error) {
        throw tenantsRes.error;
      }

      if (propertiesRes.error) {
        throw propertiesRes.error;
      }

      if (unitsRes.error) {
        throw unitsRes.error;
      }

      setPayments(paymentsRes.data || []);
      setTenants((tenantsRes.data || []) as Tenant[]);
      setProperties((propertiesRes.data || []) as Property[]);
      setUnits((unitsRes.data || []) as Unit[]);
    } catch (error) {
      setToast({
        msg:
          error instanceof Error
            ? error.message
            : "Unable to load payments.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  /**
   * Returns only the tenants whose unit belongs
   * to the selected property.
   */
  function getTenantsForProperty(
    propertyId: string
  ): Tenant[] {
    if (!propertyId) {
      return [];
    }

    const propertyUnitIds = new Set(
      units
        .filter(
          (unit) => unit.property_id === propertyId
        )
        .map((unit) => unit.id)
    );

    return tenants.filter((tenant) =>
      propertyUnitIds.has(tenant.unit_id)
    );
  }

  /**
   * Record payment tenant options.
   */
  const recordPaymentTenants =
    getTenantsForProperty(form.property_id);

  /**
   * Push payment tenant options.
   */
  const pushPaymentTenants =
    getTenantsForProperty(pushForm.property_id);

  async function handleRecordPayment(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!profile?.organization_id) {
      setToast({
        msg: "Organization information is missing.",
        type: "error",
      });
      return;
    }

    if (!form.property_id) {
      setToast({
        msg: "Please select a property.",
        type: "error",
      });
      return;
    }

    if (!form.tenant_id) {
      setToast({
        msg: "Please select a tenant.",
        type: "error",
      });
      return;
    }

    /**
     * Extra validation:
     * ensure the selected tenant belongs to
     * the selected property.
     */
    const validTenants = getTenantsForProperty(
      form.property_id
    );

    const tenantBelongsToProperty = validTenants.some(
      (tenant) => tenant.id === form.tenant_id
    );

    if (!tenantBelongsToProperty) {
      setToast({
        msg: "Please select a valid tenant.",
        type: "error",
      });
      return;
    }

    const numericAmount = Number(form.amount);

    if (!numericAmount || numericAmount <= 0) {
      setToast({
        msg: "Enter a valid payment amount.",
        type: "error",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("payments")
        .insert({
          organization_id:
            profile.organization_id,
          tenant_id: form.tenant_id,
          property_id: form.property_id,
          amount: numericAmount,
          payment_method:
            form.payment_method,
          paid_date: form.paid_date,
          reference_number:
            form.reference_number.trim() || null,
          notes: form.notes.trim() || null,
          status: form.status,
        });

      if (error) {
        throw error;
      }

      setToast({
        msg: "Payment recorded successfully.",
        type: "success",
      });

      setShowModal(false);
      setForm(defaultForm);

      await fetchAll();
    } catch (error) {
      setToast({
        msg:
          error instanceof Error
            ? error.message
            : "Unable to record payment.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePushPayment(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!profile?.organization_id) {
      setToast({
        msg: "Organization information is missing.",
        type: "error",
      });
      return;
    }

    if (!pushForm.property_id) {
      setToast({
        msg: "Please select a property.",
        type: "error",
      });
      return;
    }

    if (!pushForm.tenant_id) {
      setToast({
        msg: "Please select a tenant.",
        type: "error",
      });
      return;
    }

    const validTenants = getTenantsForProperty(
      pushForm.property_id
    );

    const tenantBelongsToProperty = validTenants.some(
      (tenant) => tenant.id === pushForm.tenant_id
    );

    if (!tenantBelongsToProperty) {
      setToast({
        msg: "Please select a valid tenant.",
        type: "error",
      });
      return;
    }

    const numericAmount = Number(
      pushForm.amount
    );

    if (!numericAmount || numericAmount <= 0) {
      setToast({
        msg: "Enter a valid payment amount.",
        type: "error",
      });
      return;
    }

    setPushSubmitting(true);

    try {
      const { error } = await supabase.rpc(
        "push_payment_request",
        {
          p_property_id:
            pushForm.property_id,

          p_tenant_id:
            pushForm.tenant_id,

          p_amount:
            numericAmount,

          p_remarks:
            pushForm.remarks.trim() || null,
        }
      );

      if (error) {
        throw error;
      }

      setToast({
        msg: "Payment request sent to tenant.",
        type: "success",
      });

      setShowPushModal(false);
      setPushForm(pushDefault);

      await fetchAll();
    } catch (error) {
      setToast({
        msg:
          error instanceof Error
            ? error.message
            : "Unable to send payment request.",
        type: "error",
      });
    } finally {
      setPushSubmitting(false);
    }
  }

  const filteredPayments = payments.filter(
    (payment) => {
      const tenant = tenants.find(
        (item) => item.id === payment.tenant_id
      );

      const tenantName =
        tenant?.full_name?.toLowerCase() || "";

      const reference =
        payment.reference_number
          ?.toLowerCase() || "";

      const searchValue =
        search.toLowerCase().trim();

      const matchesSearch =
        !searchValue ||
        tenantName.includes(searchValue) ||
        reference.includes(searchValue);

      const matchesProperty =
        !filterProperty ||
        payment.property_id === filterProperty;

      const matchesUnit =
        !filterUnit ||
        payment.unit_id === filterUnit;

      const matchesStatus =
        !filterStatus ||
        payment.status === filterStatus;

      return (
        matchesSearch &&
        matchesProperty &&
        matchesUnit &&
        matchesStatus
      );
    }
  );

  const totalPaid = payments
    .filter(
      (payment) => payment.status === "PAID"
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0
    );

  const totalDue = payments
    .filter(
      (payment) =>
        payment.status === "DUE" ||
        payment.status === "OVERDUE"
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount || 0),
      0
    );

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Payments"
        subtitle="Record and track all rent payments"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setPushForm(pushDefault);
                setShowPushModal(true);
              }}
            >
              <Send size={15} />
              Push
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setForm(defaultForm);
                setShowModal(true);
              }}
            >
              <Plus size={15} />
              Record
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <Card className="border-emerald-500/20 bg-emerald-500/10">
          <div className="text-xs uppercase tracking-wider text-emerald-400 font-display font-semibold mb-1">
            Total collected
          </div>

          <div className="font-display text-2xl font-bold text-emerald-400">
            {formatINR(totalPaid)}
          </div>
        </Card>

        <Card className="border-red-500/20 bg-red-500/10">
          <div className="text-xs uppercase tracking-wider text-red-400 font-display font-semibold mb-1">
            Due / Overdue
          </div>

          <div className="font-display text-2xl font-bold text-red-400">
            {formatINR(totalDue)}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5 items-end">
        <div className="relative col-span-2 lg:col-span-1 min-w-0">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500 pointer-events-none"
          />

          <input
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search tenant / reference..."
            className="w-full h-10 rounded-lg border border-navy-700 bg-navy-800 pl-9 pr-3 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric"
          />
        </div>

        <Select
          label="Property"
          value={filterProperty}
          onChange={(event) => {
            const propertyId =
              event.target.value;

            setFilterProperty(propertyId);
            setFilterUnit("");
          }}
          options={[
            {
              value: "",
              label: "All properties",
            },
            ...properties.map((property) => ({
              value: property.id,
              label: property.name,
            })),
          ]}
        />

        <Select
          label="Unit"
          value={filterUnit}
          onChange={(event) =>
            setFilterUnit(event.target.value)
          }
          options={[
            {
              value: "",
              label: "All units",
            },
            ...units
              .filter(
                (unit) =>
                  !filterProperty ||
                  unit.property_id ===
                    filterProperty
              )
              .map((unit) => ({
                value: unit.id,
                label: unit.unit_number,
              })),
          ]}
        />

        <div className="col-span-2 lg:col-span-1">
          <Select
            label="Payment Status"
            value={filterStatus}
            onChange={(event) =>
              setFilterStatus(event.target.value)
            }
            options={[
              {
                value: "",
                label: "All payments",
              },
              {
                value: "PENDING",
                label: "Pending",
              },
              {
                value: "DUE",
                label: "Due",
              },
              {
                value: "UNDER_REVIEW",
                label: "Under Review",
              },
              {
                value: "PAID",
                label: "Paid",
              },
              {
                value: "PARTIALLY_PAID",
                label: "Partially Paid",
              },
              {
                value: "OVERDUE",
                label: "Overdue",
              },
            ]}
          />
        </div>
      </div>

      {/* Payments */}
      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 7 }).map(
            (_, index) => (
              <Skeleton
                key={index}
                className="h-16"
              />
            )
          )}
        </div>
      ) : filteredPayments.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CreditCard size={28} />}
            title="No payments yet"
            description="Record your first payment to track rent collection."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setForm(defaultForm);
                  setShowModal(true);
                }}
              >
                <Plus size={14} />
                Record Payment
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
          <table className="w-full table-fixed text-[11px] sm:text-sm">
            <thead>
              <tr className="border-b border-navy-700">
                {/* Hidden on mobile */}
                <th className="hidden md:table-cell w-[18%] px-3 py-3 text-left text-[10px] uppercase tracking-wider text-navy-400 font-semibold">
                  Payment ID
                </th>

                <th className="w-[35%] md:w-[28%] px-2 sm:px-3 py-3 text-left text-[10px] sm:text-xs uppercase tracking-wider text-navy-400 font-semibold">
                  Tenant
                </th>

                <th className="w-[25%] md:w-[19%] px-2 sm:px-3 py-3 text-right text-[10px] sm:text-xs uppercase tracking-wider text-navy-400 font-semibold">
                  Amount
                </th>

                <th className="w-[20%] md:w-[17%] px-1 sm:px-3 py-3 text-center text-[9px] sm:text-xs uppercase tracking-wider text-navy-400 font-semibold">
                  Date
                </th>

                <th className="w-[20%] md:w-[18%] px-1 sm:px-3 py-3 text-center text-[9px] sm:text-xs uppercase tracking-wider text-navy-400 font-semibold">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredPayments.map(
                (payment) => {
                  const tenant = tenants.find(
                    (item) =>
                      item.id ===
                      payment.tenant_id
                  );

                  return (
                    <tr
                      key={payment.id}
                      className="border-b border-navy-700/50 hover:bg-navy-700/20 transition-colors"
                    >
                      {/* Payment ID */}
                      <td className="hidden md:table-cell px-3 py-3 font-mono text-blue-300 font-semibold truncate">
                        #
                        {payment.payment_display_id ||
                          "—"}
                      </td>

                      {/* Tenant */}
                      <td className="px-2 sm:px-3 py-3 min-w-0">
                        <button
                          type="button"
                          className="block max-w-full text-left"
                          onClick={() =>
                            setReceiptPayment(
                              payment
                            )
                          }
                        >
                          <div className="text-white font-semibold text-[14px] sm:text-sm truncate">
                            {tenant?.full_name ||
                              "Unknown"}
                          </div>

                          {payment.reference_number && (
                            <div className="text-[9px] sm:text-xs text-navy-500 font-mono truncate">
                              {
                                payment.reference_number
                              }
                            </div>
                          )}
                        </button>
                      </td>

                      {/* Amount */}
                      <td className="px-2 sm:px-3 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className="font-mono font-bold text-emerald-400 hover:underline"
                          onClick={() =>
                            setReceiptPayment(
                              payment
                            )
                          }
                        >
                          {formatINR(
                            Number(
                              payment.amount || 0
                            )
                          )}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="px-1 sm:px-2 py-3 text-center text-navy-400 whitespace-nowrap">
                        {payment.paid_date
                          ? new Date(
                              payment.paid_date
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "2-digit",
                                month: "2-digit",
                              }
                            )
                          : "—"}
                      </td>

                      {/* Status */}
                      <td className="px-1 sm:px-2 py-3 text-center">
                        <StatusBadge
                          status={
                            payment.status
                          }
                        />
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================
          RECORD PAYMENT MODAL
         ========================= */}
      <Modal
        open={showModal}
        onClose={() => {
          if (!submitting) {
            setShowModal(false);
          }
        }}
        title="Record Manual Payment"
      >
        <form
          onSubmit={handleRecordPayment}
          className="flex flex-col gap-4"
        >
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg px-3 py-2 text-xs text-blue-300">
            This records a manual payment.
          </div>

          {/* PROPERTY FIRST */}
          <Select
            label="Property"
            value={form.property_id}
            onChange={(event) => {
              const propertyId =
                event.target.value;

              setForm((current) => ({
                ...current,
                property_id: propertyId,
                tenant_id: "",
              }));
            }}
            options={[
              {
                value: "",
                label: "Select property",
              },
              ...properties.map((property) => ({
                value: property.id,
                label: property.name,
              })),
            ]}
            required
          />

          {/* TENANT SECOND
              ONLY "Select tenant" + real tenants */}
          <Select
            label="Tenant"
            value={form.tenant_id}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                tenant_id:
                  event.target.value,
              }));
            }}
            options={[
              {
                value: "",
                label: "Select tenant",
              },
              ...recordPaymentTenants.map(
                (tenant) => ({
                  value: tenant.id,
                  label:
                    tenant.full_name,
                })
              ),
            ]}
            disabled={!form.property_id}
            required
          />

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount (₹)"
              type="number"
              min="1"
              value={form.amount}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  amount:
                    event.target.value,
                }))
              }
              placeholder="18000"
              required
            />

            <Input
              label="Payment date"
              type="date"
              value={form.paid_date}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  paid_date:
                    event.target.value,
                }))
              }
              required
            />
          </div>

          {/* Payment Method */}
          <Select
            label="Payment method"
            value={form.payment_method}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                payment_method:
                  event.target
                    .value as PaymentMethod,
              }))
            }
            options={
              PAYMENT_METHODS
            }
          />

          {/* Reference */}
          <Input
            label="Reference / Transaction ID"
            value={
              form.reference_number
            }
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                reference_number:
                  event.target.value,
              }))
            }
            placeholder="UPI ref / bank ref"
          />

          {/* Notes */}
          <Textarea
            label="Notes"
            value={form.notes}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                notes:
                  event.target.value,
              }))
            }
            placeholder="Any additional notes..."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setShowModal(false)
              }
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={submitting}
            >
              Record Payment
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================
          PUSH PAYMENT MODAL
         ========================= */}
      <Modal
        open={showPushModal}
        onClose={() => {
          if (!pushSubmitting) {
            setShowPushModal(false);
          }
        }}
        title="Push Payment Request"
      >
        <form
          onSubmit={handlePushPayment}
          className="flex flex-col gap-4"
        >
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg px-3 py-2 text-xs text-blue-300">
            Send a payment request to a tenant.
          </div>

          {/* PROPERTY FIRST */}
          <Select
            label="Property"
            value={pushForm.property_id}
            onChange={(event) => {
              const propertyId =
                event.target.value;

              setPushForm((current) => ({
                ...current,
                property_id:
                  propertyId,
                tenant_id: "",
              }));
            }}
            options={[
              {
                value: "",
                label: "Select property",
              },
              ...properties.map((property) => ({
                value: property.id,
                label: property.name,
              })),
            ]}
            required
          />

          {/* TENANT SECOND
              ONLY "Select tenant" + real tenants */}
          <Select
            label="Tenant"
            value={pushForm.tenant_id}
            onChange={(event) => {
              setPushForm((current) => ({
                ...current,
                tenant_id:
                  event.target.value,
              }));
            }}
            options={[
              {
                value: "",
                label: "Select tenant",
              },
              ...pushPaymentTenants.map(
                (tenant) => ({
                  value: tenant.id,
                  label:
                    tenant.full_name,
                })
              ),
            ]}
            disabled={!pushForm.property_id}
            required
          />

          {/* Amount */}
          <Input
            label="Amount (₹)"
            type="number"
            min="1"
            value={pushForm.amount}
            onChange={(event) =>
              setPushForm((current) => ({
                ...current,
                amount:
                  event.target.value,
              }))
            }
            placeholder="15000"
            required
          />

          {/* Remarks */}
          <Textarea
            label="Remarks"
            value={pushForm.remarks}
            onChange={(event) =>
              setPushForm((current) => ({
                ...current,
                remarks:
                  event.target.value,
              }))
            }
            placeholder="Optional remarks for the tenant..."
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setShowPushModal(false)
              }
              disabled={pushSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={pushSubmitting}
            >
              <Send size={15} />
              Push
            </Button>
          </div>
        </form>
      </Modal>

      {/* =========================
          PAYMENT RECEIPT MODAL
         ========================= */}
      {receiptPayment && (
        <Modal
          open={true}
          onClose={() =>
            setReceiptPayment(null)
          }
          title="Payment Receipt"
        >
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600">
              <Receipt
                size={28}
                className="text-white"
              />
            </div>

            <div className="font-display text-xl font-bold text-white">
              Payment Confirmed
            </div>

            <div className="text-sm text-navy-400">
              RENFLIX Receipt
            </div>
          </div>

          <div className="bg-navy-900 rounded-xl p-4 flex flex-col gap-3 text-sm font-mono">
            <ReceiptLine
              label="Amount"
              value={formatINR(
                Number(
                  receiptPayment.amount ||
                    0
                )
              )}
            />

            <ReceiptLine
              label="Tenant"
              value={
                tenants.find(
                  (tenant) =>
                    tenant.id ===
                    receiptPayment.tenant_id
                )?.full_name || "—"
              }
            />

            <ReceiptLine
              label="Method"
              value={
                receiptPayment.payment_method ||
                "—"
              }
            />

            <ReceiptLine
              label="Date"
              value={
                receiptPayment.paid_date
                  ? new Date(
                      receiptPayment.paid_date
                    ).toLocaleDateString(
                      "en-IN"
                    )
                  : "—"
              }
            />

            {receiptPayment.reference_number && (
              <ReceiptLine
                label="Reference"
                value={
                  receiptPayment.reference_number
                }
              />
            )}

            <ReceiptLine
              label="Status"
              value={
                receiptPayment.status
              }
            />
          </div>

          {receiptPayment.notes && (
            <div className="mt-3 text-xs text-navy-500">
              {receiptPayment.notes}
            </div>
          )}

          <Button
            variant="ghost"
            className="w-full mt-4"
            onClick={() =>
              setReceiptPayment(null)
            }
          >
            Close
          </Button>
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() =>
            setToast(null)
          }
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
    <div className="flex items-center justify-between border-b border-navy-800 pb-2 last:border-0 last:pb-0">
      <span className="text-navy-500">
        {label}
      </span>

      <span className="font-semibold text-white text-right ml-3">
        {value}
      </span>
    </div>
  );
}