import { useEffect, useState } from "react";

import {
  Building2,
  Users,
  CreditCard,
  Wrench,
  TrendingUp,
  AlertTriangle,
  FileText,
  DoorOpen,
} from "lucide-react";

import {
  useNavigate,
} from "react-router";

import {
  Link,
} from "react-router";

import {
  supabase,
} from "../../lib/supabase";

import {
  useAuth,
} from "../../hooks/useAuth";

import {
  StatCard,
  Card,
  StatusBadge,
  Skeleton,
  PageHeader,
  EmptyState,
} from "../../components/ui";

import type {
  DashboardMetrics,
  MaintenanceRequest,
  Payment,
} from "../../lib/types";

function formatINR(
  amount: number
): string {
  if (
    amount >= 10000000
  ) {
    return `₹${(
      amount / 10000000
    ).toFixed(1)}Cr`;
  }

  if (
    amount >= 100000
  ) {
    return `₹${(
      amount / 100000
    ).toFixed(1)}L`;
  }

  if (
    amount >= 1000
  ) {
    return `₹${(
      amount / 1000
    ).toFixed(0)}K`;
  }

  return `₹${amount.toLocaleString(
    "en-IN"
  )}`;
}

export default function DashboardPage() {
  const {
    profile,
  } = useAuth();

  const navigate =
    useNavigate();

  const [
    metrics,
    setMetrics,
  ] =
    useState<DashboardMetrics | null>(
      null
    );

  const [
    recentMaintenance,
    setRecentMaintenance,
  ] =
    useState<
      MaintenanceRequest[]
    >([]);

  const [
    recentPayments,
    setRecentPayments,
  ] =
    useState<Payment[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  // ------------------------------------------------------------
  // Fetch dashboard data
  // ------------------------------------------------------------

  useEffect(() => {
    if (
      profile?.organization_id
    ) {
      fetchAll(
        profile.organization_id
      );
    } else if (
      profile &&
      !profile.organization_id
    ) {
      setLoading(false);
    }
  }, [
    profile,
  ]);

  async function fetchAll(
    orgId: string
  ) {
    try {
      const propertyIds =
        await getPropertyIds(
          orgId
        );

      const [
        propRes,
        unitRes,
        tenantRes,
        payRes,
        maintRes,
      ] =
        await Promise.all([
          supabase
            .from(
              "properties"
            )
            .select(
              "id",
              {
                count:
                  "exact",
              }
            )
            .eq(
              "organization_id",
              orgId
            )
            .eq(
              "status",
              "ACTIVE"
            ),

          propertyIds.length >
          0
            ? supabase
                .from(
                  "units"
                )
                .select(
                  "id, status, property_id, monthly_rent"
                )
                .in(
                  "property_id",
                  propertyIds
                )
            : Promise.resolve({
                data: [],
                error: null,
              }),

          supabase
            .from(
              "tenants"
            )
            .select(
              "id",
              {
                count:
                  "exact",
              }
            )
            .eq(
              "organization_id",
              orgId
            )
            .eq(
              "status",
              "ACTIVE"
            ),

          supabase
            .from(
              "payments"
            )
            .select("*")
            .eq(
              "organization_id",
              orgId
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(5),

          supabase
            .from(
              "maintenance_requests"
            )
            .select("*")
            .eq(
              "organization_id",
              orgId
            )
            .order(
              "created_at",
              {
                ascending:
                  false,
              }
            )
            .limit(5),
        ]);

      if (
        propRes.error
      ) {
        throw propRes.error;
      }

      if (
        unitRes.error
      ) {
        throw unitRes.error;
      }

      if (
        tenantRes.error
      ) {
        throw tenantRes.error;
      }

      if (
        payRes.error
      ) {
        throw payRes.error;
      }

      if (
        maintRes.error
      ) {
        throw maintRes.error;
      }

      const units =
        unitRes.data ||
        [];

      const occupied =
        units.filter(
          (unit) =>
            unit.status ===
            "OCCUPIED"
        ).length;

      const now =
        new Date();

      const firstOfMonth =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString();

      const paymentsThisMonth =
        (
          payRes.data ||
          []
        ).filter(
          (payment) =>
            payment.created_at >=
              firstOfMonth &&
            payment.status ===
              "PAID"
        );

      const collectedThisMonth =
        paymentsThisMonth.reduce(
          (
            total,
            payment
          ) =>
            total +
            (payment.amount ||
              0),
          0
        );

      const overdue =
        (
          payRes.data ||
          []
        ).filter(
          (payment) =>
            payment.status ===
            "OVERDUE"
        );

      const overdueTotal =
        overdue.reduce(
          (
            total,
            payment
          ) =>
            total +
            (payment.amount ||
              0),
          0
        );

      const activeMaint =
        (
          maintRes.data ||
          []
        ).filter(
          (maintenance) =>
            ![
              "COMPLETED",
              "CLOSED",
              "VERIFIED",
            ].includes(
              maintenance.status
            )
        ).length;

      const urgentMaint =
        (
          maintRes.data ||
          []
        ).filter(
          (maintenance) =>
            maintenance.priority ===
              "URGENT" &&
            ![
              "COMPLETED",
              "CLOSED",
              "VERIFIED",
            ].includes(
              maintenance.status
            )
        ).length;

      const monthlyRevenue =
        units
          .filter(
            (unit) =>
              unit.status ===
              "OCCUPIED"
          )
          .reduce(
            (
              total,
              unit
            ) =>
              total +
              (unit.monthly_rent ||
                0),
            0
          );

      setMetrics({
        total_properties:
          propRes.count ||
          0,

        total_units:
          units.length,

        occupied_units:
          occupied,

        total_tenants:
          tenantRes.count ||
          0,

        monthly_revenue:
          monthlyRevenue,

        collected_this_month:
          collectedThisMonth,

        pending_rent:
          0,

        overdue_rent:
          overdueTotal,

        active_maintenance:
          activeMaint,

        urgent_maintenance:
          urgentMaint,

        leases_expiring_soon:
          0,
      });

      setRecentMaintenance(
        maintRes.data ||
          []
      );

      setRecentPayments(
        payRes.data ||
          []
      );
    } catch (error) {
      console.error(
        "RENFLIX dashboard fetch error:",
        error
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  async function getPropertyIds(
    orgId: string
  ): Promise<
    string[]
  > {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "properties"
        )
        .select(
          "id"
        )
        .eq(
          "organization_id",
          orgId
        )
        .eq(
          "status",
          "ACTIVE"
        );

    if (error) {
      console.error(
        "Property ID fetch error:",
        error
      );

      return [];
    }

    return (
      data ||
      []
    ).map(
      (
        property
      ) =>
        property.id
    );
  }

  // ------------------------------------------------------------
  // Occupancy
  // ------------------------------------------------------------

  const occupancyPct =
    metrics
      ? metrics.total_units >
        0
        ? Math.round(
            (metrics.occupied_units /
              metrics.total_units) *
              100
          )
        : 0
      : 0;

  // ------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------

  if (loading) {
    return (
      <div>
        <Skeleton className="w-48 h-7 mb-2" />

        <Skeleton className="w-72 h-4 mb-8" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            ...Array(8),
          ].map(
            (
              _,
              index
            ) => (
              <Skeleton
                key={
                  index
                }
                className="h-28"
              />
            )
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // No organization
  // ------------------------------------------------------------

  if (
    !profile?.organization_id
  ) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          subtitle={`Welcome, ${
            profile?.full_name ||
            "there"
          }`}
        />

        <Card>
          <EmptyState
            icon={
              <Building2
                size={28}
              />
            }
            title="Set up your organization"
            description="Create an organization to start managing properties."
          />
        </Card>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Dashboard
  // ------------------------------------------------------------

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={`Good ${getGreeting()}, ${
          profile?.full_name?.split(
            " "
          )[0] ||
          "there"
        }`}
        subtitle="Here's your portfolio at a glance"
      />

      {/* ====================================================== */}
      {/* STAT CARDS                                              */}
      {/* ====================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Properties */}

        <StatCard
          label="Properties"
          value={
            metrics?.total_properties ??
            0
          }
          icon={
            <Building2
              size={18}
              className="text-blue-400"
            />
          }
          color="blue"
          onClick={() =>
            navigate(
              "/properties"
            )
          }
        />

        {/* Occupied spaces */}

        <StatCard
          label="Occupied spaces"
          value={`${occupancyPct}%`}
          sub={`${metrics?.occupied_units || 0} / ${
            metrics?.total_units ||
            0
          } units`}
          icon={
            <DoorOpen
              size={18}
              className="text-emerald-400"
            />
          }
          color="emerald"
          onClick={() =>
            navigate(
              "/units"
            )
          }
        />

        {/* Active tenants */}

        <StatCard
          label="Active tenants"
          value={
            metrics?.total_tenants ??
            0
          }
          icon={
            <Users
              size={18}
              className="text-violet-400"
            />
          }
          color="violet"
          onClick={() =>
            navigate(
              "/tenants"
            )
          }
        />

        {/* Monthly rent roll */}

        <StatCard
          label="Monthly rent roll"
          value={formatINR(
            metrics?.monthly_revenue ??
              0
          )}
          icon={
            <TrendingUp
              size={18}
              className="text-blue-400"
            />
          }
          color="blue"
          onClick={() =>
            navigate(
              "/payments"
            )
          }
        />

        {/* Collected */}

        <StatCard
          label="Collected this month"
          value={formatINR(
            metrics?.collected_this_month ??
              0
          )}
          icon={
            <CreditCard
              size={18}
              className="text-emerald-400"
            />
          }
          color="emerald"
          onClick={() =>
            navigate(
              "/payments"
            )
          }
        />

        {/* Rent still to collect */}

        <StatCard
          label="Rent still to collect"
          value={formatINR(
            metrics?.overdue_rent ??
              0
          )}
          icon={
            <AlertTriangle
              size={18}
              className="text-red-400"
            />
          }
          color="red"
          onClick={() =>
            navigate(
              "/payments"
            )
          }
        />

        {/* Maintenance */}

        <StatCard
          label="Open maintenance"
          value={
            metrics?.active_maintenance ??
            0
          }
          sub={
            metrics?.urgent_maintenance
              ? `${metrics.urgent_maintenance} urgent`
              : undefined
          }
          icon={
            <Wrench
              size={18}
              className="text-orange-400"
            />
          }
          color="orange"
          onClick={() =>
            navigate(
              "/maintenance"
            )
          }
        />

        {/* Lease expiries */}

        <StatCard
          label="Lease expiries"
          value={
            metrics?.leases_expiring_soon ??
            0
          }
          sub="Next 30 days"
          icon={
            <FileText
              size={18}
              className="text-amber-400"
            />
          }
          color="amber"
          onClick={() =>
            navigate(
              "/leases"
            )
          }
        />
      </div>

      {/* ====================================================== */}
      {/* ATTENTION + RECENT                                    */}
      {/* ====================================================== */}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Maintenance */}

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white">
              Recent Maintenance
            </h3>

            <Link
              to="/maintenance"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View all →
            </Link>
          </div>

          {recentMaintenance.length ===
          0 ? (
            <EmptyState
              icon={
                <Wrench
                  size={20}
                />
              }
              title="No maintenance requests"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {recentMaintenance.map(
                (
                  req
                ) => (
                  <div
                    key={
                      req.id
                    }
                    className="flex items-start justify-between gap-3 py-2.5 border-b border-navy-700 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-navy-200 truncate">
                        {
                          req.title
                        }
                      </div>

                      <div className="text-xs text-navy-500">
                        {
                          req.category
                        }
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge
                        status={
                          req.priority
                        }
                      />

                      <StatusBadge
                        status={
                          req.status
                        }
                      />
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </Card>

        {/* Recent Payments */}

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white">
              Recent Payments
            </h3>

            <Link
              to="/payments"
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View all →
            </Link>
          </div>

          {recentPayments.length ===
          0 ? (
            <EmptyState
              icon={
                <CreditCard
                  size={20}
                />
              }
              title="No payments yet"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {recentPayments.map(
                (
                  pay
                ) => (
                  <div
                    key={
                      pay.id
                    }
                    className="flex items-center justify-between py-2.5 border-b border-navy-700 last:border-0"
                  >
                    <div>
                      <div className="text-sm font-semibold text-navy-200">
                        {formatINR(
                          pay.amount
                        )}
                      </div>

                      <div className="text-xs text-navy-500">
                        {
                          pay.payment_method
                        }{" "}
                        ·{" "}
                        {new Date(
                          pay.created_at
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </div>
                    </div>

                    <StatusBadge
                      status={
                        pay.status
                      }
                    />
                  </div>
                )
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function getGreeting() {
  const h =
    new Date().getHours();

  if (h < 12) {
    return "morning";
  }

  if (h < 17) {
    return "afternoon";
  }

  return "evening";
}