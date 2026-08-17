import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Building2,
  CalendarDays,
  CreditCard,
  DoorOpen,
  Pencil,
  Save,
  X,
  ShieldCheck,
  ArrowUpRight,
  UserRound,
  Wrench,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import type {
  Payment,
  Tenant,
  Unit,
  Property,
  MaintenanceRequest,
} from "../../lib/types";
import {
  Button,
  Card,
  Input,
  PageHeader,
  StatusBadge,
  Toast,
  StatCard,
  EmptyState,
} from "../../components/ui";

function formatINR(amount: number) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

export default function TenantDashboardPage() {
  const { user, profile } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [recentMaintenance, setRecentMaintenance] = useState<MaintenanceRequest[]>([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_email: "",
  });
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);

    const { data: t, error: tenantError } = await supabase
      .from("tenants")
      .select("*")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (tenantError) {
      setToast({ msg: tenantError.message, type: "error" });
      setLoading(false);
      return;
    }

    if (!t) {
      setLoading(false);
      return;
    }

    const tenantData = t as Tenant;
    setTenant(tenantData);
    setForm({
      emergency_contact_name: tenantData.emergency_contact_name || "",
      emergency_contact_phone: tenantData.emergency_contact_phone || "",
      emergency_email: tenantData.emergency_email || "",
    });

    let propertyData: Property | null = null;

    if (tenantData.unit_id) {
      const { data: u } = await supabase
        .from("units")
        .select("*")
        .eq("id", tenantData.unit_id)
        .maybeSingle();

      if (u) {
        const unitData = u as Unit;
        setUnit(unitData);

        const { data: p } = await supabase
          .from("properties")
          .select("*")
          .eq("id", unitData.property_id)
          .maybeSingle();

        if (p) {
          propertyData = p as Property;
          setProperty(propertyData);
        }
      }
    }

    const [{ data: payments }, { data: maintenance }] = await Promise.all([
      supabase
        .from("payments")
        .select("*")
        .eq("tenant_id", tenantData.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("maintenance_requests")
        .select("*")
        .eq("tenant_id", tenantData.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    setRecentPayments((payments || []) as Payment[]);
    setRecentMaintenance((maintenance || []) as MaintenanceRequest[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user?.id]);

  async function saveEmergency() {
    if (!tenant) return;
    setSaving(true);

    const { error } = await supabase
      .from("tenants")
      .update({
        emergency_contact_name:
          form.emergency_contact_name.trim() || null,
        emergency_contact_phone:
          form.emergency_contact_phone.trim() || null,
        emergency_email:
          form.emergency_email.trim().toLowerCase() || null,
      })
      .eq("id", tenant.id);

    setSaving(false);

    if (error) {
      setToast({ msg: error.message, type: "error" });
    } else {
      setEditing(false);
      setToast({ msg: "Emergency contact updated.", type: "success" });
      load();
    }
  }

  const monthlyRent = unit?.monthly_rent || 0;
  const moveInDate = tenant?.move_in_date
    ? new Date(tenant.move_in_date).toLocaleDateString("en-IN")
    : "—";

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Welcome back, ${profile?.full_name?.split(" ")[0] || "Tenant"}`}
        // subtitle="A simple view of your home, rent and account."
      />

      {/* ====================================================== */}
      {/* MY RESIDENCE                                           */}
      {/* ====================================================== */}
      <Card className="overflow-hidden mb-5">
        <div className="relative -mx-5 -mt-5 mb-5 px-5 pt-6 pb-5 bg-gradient-to-r from-blue-600/15 via-violet-600/10 to-transparent border-b border-navy-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-blue-300 font-semibold">
                My residence
              </p>
              <h2 className="font-display text-2xl font-bold text-white mt-1">
                {property?.name || "Your property"}
              </h2>
              <p className="text-sm text-navy-400 mt-1">
                {unit?.unit_type || "Residential unit"} · Unit {unit?.unit_number || "—"}
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Building2 className="text-blue-300" size={23} />
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Info label="Full name" value={tenant?.full_name || profile?.full_name || "—"} />
          <Info
            label="Tenant ID"
            value={tenant?.tenant_display_id || tenant?.id?.slice(0, 8).toUpperCase() || "—"}
          />
          <Info label="Email" value={tenant?.email || profile?.email || "—"} />
          <Info label="Phone" value={tenant?.phone || profile?.phone || "—"} />
          <Info
            label="Address"
            value={property ? `${property.address}, ${property.city}` : "—"}
          />
          <Info
            label="Security deposit"
            value={
              unit?.security_deposit != null
                ? formatINR(unit.security_deposit)
                : "—"
            }
          />
        </div>

        <div className="mt-5 pt-5 border-t border-navy-700">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display font-bold text-white">Emergency contact</h3>
             {/* <p className="text-xs text-navy-500 mt-1">
                Only these details can be changed from your profile.
              </p>*/}
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? (
                <>
                  <X size={14} /> Cancel
                </>
              ) : (
                <>
                  <Pencil size={14} /> Edit
                </>
              )}
            </Button>
          </div>

          {!editing ? (
            <div className="grid sm:grid-cols-3 gap-4">
              <Info label="Contact" value={tenant?.emergency_contact_name || "Not added"} />
              <Info label="Phone" value={tenant?.emergency_contact_phone || "Not added"} />
              <Info label="Email" value={tenant?.emergency_email || "Not added"} />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Input
                label="Emergency contact"
                value={form.emergency_contact_name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    emergency_contact_name: e.target.value,
                  }))
                }
              />
              <Input
                label="Emergency phone"
                type="tel"
                value={form.emergency_contact_phone}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    emergency_contact_phone: e.target.value,
                  }))
                }
              />
              <Input
                label="Emergency email"
                type="email"
                value={form.emergency_email}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    emergency_email: e.target.value,
                  }))
                }
              />
              <div className="flex items-end">
                <Button onClick={saveEmergency} loading={saving}>
                  <Save size={15} /> Save changes
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ====================================================== */}
      {/* RENT + MOVE-IN — SAME STAT CARD STYLE AS OWNER         */}
      {/* ====================================================== */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <StatCard
          label="Monthly rent"
          value={formatINR(monthlyRent)}
          // sub="Current monthly rent"
          icon={<CreditCard size={18} className="text-emerald-400" />}
          color="emerald"
        />
        <StatCard
          label="Move-in date"
          value={moveInDate}
          // sub="Residence start date"
          icon={<CalendarDays size={18} className="text-amber-400" />}
          color="amber"
        />
      </div>

      {/* ====================================================== */}
      {/* RECENT MAINTENANCE + PAYMENTS — OWNER DASHBOARD STYLE  */}
      {/* ====================================================== */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
         <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white">Recent Payments</h3>
            <Link
              to="/payments"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-navy-800/60 animate-pulse" />
              ))}
            </div>
          ) : recentPayments.length === 0 ? (
            <EmptyState icon={<CreditCard size={20} />} title="No payments yet" />
          ) : (
            <div className="flex flex-col gap-2">
              {recentPayments.map((pay) => (
                <div
                  key={pay.id}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-navy-700 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy-200">
                      {formatINR(pay.amount)}
                    </div>
                    <div className="text-xs text-navy-500 truncate">
                      #{pay.payment_display_id || "—"} · {pay.payment_method || "Payment"} · {new Date(pay.created_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <StatusBadge status={pay.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white">Recent Maintenance</h3>
            <Link
              to="/maintenance"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-navy-800/60 animate-pulse" />
              ))}
            </div>
          ) : recentMaintenance.length === 0 ? (
            <EmptyState icon={<Wrench size={20} />} title="No maintenance requests" />
          ) : (
            <div className="flex flex-col gap-2">
              {recentMaintenance.map((req) => (
                <div
                  key={req.id}
                  className="flex items-start justify-between gap-3 py-2.5 border-b border-navy-700 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-navy-200 truncate">
                      {req.title}
                    </div>
                    <div className="text-xs text-navy-500">
                      {req.category} · {new Date(req.created_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={req.priority} />
                    <StatusBadge status={req.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

       
      </div>

      {/* ====================================================== */}
      {/* ACCOUNT PROTECTED — LAST                              */}
      {/* ====================================================== */}
      {/*<Card>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <ShieldCheck size={20} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display font-bold text-white">Account protected</h3>
            <p className="text-xs text-navy-500 mt-1">
              Your property and rent details are managed by the owner.
            </p>
            <div className="text-sm text-navy-300 flex items-center gap-2 mt-2">
              <UserRound size={15} /> {profile?.full_name || "Tenant"} · Tenant
            </div>
          </div>
        </div>
      </Card>*/}

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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-navy-500 mb-1">{label}</p>
      <p className="text-white font-medium break-words">{value}</p>
    </div>
  );
}
