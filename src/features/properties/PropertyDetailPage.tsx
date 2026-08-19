import { useEffect, useState } from "react";
import {
  useParams,
  useNavigate,
} from "react-router";

import {
  Building2,
  Users,
  CreditCard,
  Wrench,
  TrendingUp,
  AlertTriangle,
  FileText,
  DoorOpen,
  Edit,
  Archive,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";

import {
  Button,
  Card,
  StatusBadge,
  PageHeader,
  EmptyState,
  StatCard,
  Modal,
  Input,
  Select,
  Textarea,
  Toast,
  Skeleton,
} from "../../components/ui";

import type {
  Property,
  PropertyType,
  PropertyStatus,
  MaintenanceRequest,
  Payment,
  Tenant,
  Unit,
} from "../../lib/types";

const PROPERTY_TYPES: {
  value: PropertyType;
  label: string;
}[] = [
  {
    value: "HOUSE",
    label: "House",
  },
  {
    value: "APARTMENT",
    label: "Apartment",
  },
  {
    value: "PG",
    label: "PG (Paying Guest)",
  },
  {
    value: "HOSTEL",
    label: "Hostel",
  },
  {
    value: "COLIVING",
    label: "Co-living",
  },
  {
    value: "VILLA",
    label: "Villa",
  },
  {
    value: "GATED_COMMUNITY",
    label: "Gated Community",
  },
  {
    value: "COMMERCIAL",
    label: "Commercial",
  },
  {
    value: "SHOP",
    label: "Shop",
  },
  {
    value: "OFFICE",
    label: "Office",
  },
  {
    value: "WAREHOUSE",
    label: "Warehouse",
  },
  {
    value: "PLOT",
    label: "Plot",
  },
  {
    value: "LAND",
    label: "Land",
  },
  {
    value: "MIXED",
    label: "Mixed Use",
  },
];

const PROPERTY_STATUSES: {
  value: PropertyStatus;
  label: string;
}[] = [
  {
    value: "ACTIVE",
    label: "Active",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
  },
];

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

export default function PropertyDetailPage() {
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, []);
  const { profile } =
    useAuth();

  const navigate =
    useNavigate();

  const {
    propertyDisplayId,
  } =
    useParams<{
      propertyDisplayId: string;
    }>();

  const [
    property,
    setProperty,
  ] =
    useState<Property | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    relatedLoading,
    setRelatedLoading,
  ] = useState(false);

  // ------------------------------------------------------------
  // Related data
  // ------------------------------------------------------------

  const [
    units,
    setUnits,
  ] = useState<Unit[]>([]);

  const [
    tenants,
    setTenants,
  ] = useState<Tenant[]>([]);

  const [
    leases,
    setLeases,
  ] = useState<any[]>([]);

  const [
    payments,
    setPayments,
  ] = useState<Payment[]>(
    []
  );

  const [
    maintenance,
    setMaintenance,
  ] = useState<
    MaintenanceRequest[]
  >([]);

  // ------------------------------------------------------------
  // Edit / archive
  // ------------------------------------------------------------

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    editForm,
    setEditForm,
  ] =
    useState<Partial<Property> | null>(
      null
    );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    toast,
    setToast,
  ] =
    useState<{
      msg: string;
      type:
        | "success"
        | "error";
    } | null>(
      null
    );

  // ------------------------------------------------------------
  // Fetch property
  // ------------------------------------------------------------

  useEffect(() => {
    if (
      !propertyDisplayId ||
      propertyDisplayId === ""
    ) {
      setLoading(false);
      return;
    }

    fetchProperty(
      propertyDisplayId
    );
  }, [
    propertyDisplayId,
  ]);

  async function fetchProperty(
    displayId: string
  ) {
    setLoading(true);

    try {
      let query = supabase
        .from("properties")
        .select("*")
        .eq("property_display_id", displayId)
        .limit(1);

      if (profile?.organization_id) {
        query = query.eq("organization_id", profile.organization_id);
      }

      const { data: displayData, error: displayError } = await query.maybeSingle();

      if (!displayError && displayData) {
        setProperty(displayData);
        return;
      }

      // Notifications store entity UUIDs. Fall back to the real row ID.
      let idQuery = supabase
        .from("properties")
        .select("*")
        .eq("id", displayId)
        .limit(1);

      if (profile?.organization_id) {
        idQuery = idQuery.eq("organization_id", profile.organization_id);
      }

      const { data: idData, error: idError } = await idQuery.maybeSingle();
      if (idError) throw idError;
      if (!idData) throw new Error("Property not found.");

      setProperty(idData);
    } catch (err) {
      console.error(
        "Error fetching property:",
        err
      );

      setProperty(null);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------
  // Fetch related data when property changes
  // ------------------------------------------------------------

  useEffect(() => {
    if (
      property?.id
    ) {
      fetchAllRelated(
        property.id
      );
    }
  }, [
    property?.id,
  ]);

  async function fetchAllRelated(
    propertyId: string
  ) {
    setRelatedLoading(
      true
    );

    try {
      // --------------------------------------------------------
      // 1. Get all units belonging to this property.
      // --------------------------------------------------------

      const {
        data: unitsData,
        error: unitsError,
      } =
        await supabase
          .from("units")
          .select("*")
          .eq(
            "property_id",
            propertyId
          )
          .order(
            "unit_number",
            {
              ascending: true,
            }
          );

      if (unitsError) {
        throw unitsError;
      }

      const propertyUnits =
        (unitsData ||
          []) as Unit[];

      setUnits(
        propertyUnits
      );

      // --------------------------------------------------------
      // 2. Extract unit IDs.
      //
      // A tenant is related to the property through:
      //
      // tenants.unit_id -> units.property_id
      // --------------------------------------------------------

      const unitIds =
        propertyUnits
          .map(
            (unit) =>
              unit.id
          )
          .filter(
            Boolean
          );

      // --------------------------------------------------------
      // 3. Fetch property-level data.
      // --------------------------------------------------------

      const [
        leasesRes,
        paymentsRes,
        maintenanceRes,
      ] =
        await Promise.all([
          supabase
            .from("leases")
            .select("*")
            .eq(
              "property_id",
              propertyId
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),

          supabase
            .from("payments")
            .select("*")
            .eq(
              "property_id",
              propertyId
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),

          supabase
            .from(
              "maintenance_requests"
            )
            .select("*")
            .eq(
              "property_id",
              propertyId
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            ),
        ]);

      if (
        leasesRes.error
      ) {
        console.error(
          "Property leases error:",
          leasesRes.error
        );
      }

      if (
        paymentsRes.error
      ) {
        console.error(
          "Property payments error:",
          paymentsRes.error
        );
      }

      if (
        maintenanceRes.error
      ) {
        console.error(
          "Property maintenance error:",
          maintenanceRes.error
        );
      }

      setLeases(
        leasesRes.data ||
          []
      );

      setPayments(
        paymentsRes.data ||
          []
      );

      setMaintenance(
        maintenanceRes.data ||
          []
      );

      // --------------------------------------------------------
      // 4. Fetch tenants through unit_id.
      // --------------------------------------------------------

      if (
        unitIds.length ===
        0
      ) {
        setTenants([]);
      } else {
        const {
          data: tenantsData,
          error: tenantsError,
        } =
          await supabase
            .from("tenants")
            .select("*")
            .in(
              "unit_id",
              unitIds
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            );

        if (
          tenantsError
        ) {
          throw tenantsError;
        }

        setTenants(
          (tenantsData ||
            []) as Tenant[]
        );
      }
    } catch (err) {
      console.error(
        "Error fetching property related data:",
        err
      );

      /*
       * Don't leave stale data from a previously opened property
       * if the new property's related query fails.
       */
      setUnits([]);
      setTenants([]);
      setLeases([]);
      setPayments([]);
      setMaintenance([]);
    } finally {
      setRelatedLoading(
        false
      );
    }
  }

  // ------------------------------------------------------------
  // Metrics
  // ------------------------------------------------------------

  const occupiedUnits =
    units.filter(
      (unit) =>
        unit.status ===
        "OCCUPIED"
    ).length;

  const totalUnits =
    units.length;

  const occupancyPct =
    totalUnits > 0
      ? Math.round(
          (occupiedUnits /
            totalUnits) *
            100
        )
      : 0;

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

  const now =
    new Date();

  const firstOfMonth =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).toISOString();

  const paymentsThisMonth =
    payments.filter(
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

  const overduePayments =
    payments.filter(
      (payment) =>
        payment.status ===
        "OVERDUE"
    );

  const overdueTotal =
    overduePayments.reduce(
      (
        total,
        payment
      ) =>
        total +
        (payment.amount ||
          0),
      0
    );

  const activeMaintenance =
    maintenance.filter(
      (item) =>
        ![
          "COMPLETED",
          "CLOSED",
          "VERIFIED",
        ].includes(
          item.status
        )
    ).length;

  const urgentMaintenance =
    maintenance.filter(
      (item) =>
        item.priority ===
          "URGENT" &&
        ![
          "COMPLETED",
          "CLOSED",
          "VERIFIED",
        ].includes(
          item.status
        )
    ).length;

  const activeLeases =
    leases.filter(
      (lease) =>
        lease.status ===
        "ACTIVE"
    ).length;

  const expiringLeases =
    leases.filter(
      (lease) => {
        if (
          lease.status !==
          "ACTIVE"
        ) {
          return false;
        }

        const endDate =
          new Date(
            lease.end_date
          );

        const thirtyDaysFromNow =
          new Date();

        thirtyDaysFromNow.setDate(
          thirtyDaysFromNow.getDate() +
            30
        );

        return (
          endDate <=
            thirtyDaysFromNow &&
          endDate >= now
        );
      }
    ).length;

  // ------------------------------------------------------------
  // Edit
  // ------------------------------------------------------------

  function openEdit() {
    if (!property) {
      return;
    }

    setEditForm({
      name: property.name,
      property_type:
        property.property_type,
      description:
        property.description ||
        "",
      address:
        property.address,
      city: property.city,
      state: property.state,
      country:
        property.country,
      postal_code:
        property.postal_code ||
        "",
      status:
        property.status,
    });

    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditForm(null);
  }

  // ------------------------------------------------------------
  // Update property
  // ------------------------------------------------------------

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !property ||
      !editForm
    ) {
      return;
    }

    setSubmitting(true);

    try {
      const {
        error,
      } =
        await supabase
          .from("properties")
          .update({
            ...editForm,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            property.id
          );

      if (error) {
        throw error;
      }

      setToast({
        msg:
          "Property updated!",
        type:
          "success",
      });

      closeModal();

      const {
        data,
      } =
        await supabase
          .from(
            "properties"
          )
          .select("*")
          .eq(
            "id",
            property.id
          )
          .single();

      if (data) {
        setProperty(data);

        /*
         * Re-fetch related entities too, in case the update
         * changed something relevant to the property view.
         */
        await fetchAllRelated(
          data.id
        );
      }
    } catch (err) {
      setToast({
        msg:
          err instanceof Error
            ? err.message
            : "Failed to update property",
        type:
          "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ------------------------------------------------------------
  // Archive property
  // ------------------------------------------------------------

  async function archiveProperty() {
    if (!property) {
      return;
    }

    if (
      !confirm(
        "Archive this property? This will remove it from active listings."
      )
    ) {
      return;
    }

    try {
      const {
        error,
      } =
        await supabase
          .from("properties")
          .update({
            status:
              "ARCHIVED",
            archived_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            property.id
          );

      if (error) {
        throw error;
      }

      setToast({
        msg:
          "Property archived",
        type:
          "success",
      });

      window.setTimeout(
        () =>
          navigate(
            "/properties"
          ),
        1500
      );
    } catch (err) {
      setToast({
        msg:
          err instanceof Error
            ? err.message
            : "Failed to archive property",
        type:
          "error",
      });
    }
  }

  // ------------------------------------------------------------
  // Loading
  // ------------------------------------------------------------

  if (loading) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Property Details"
          subtitle="Loading property..."
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            ...Array(8),
          ].map(
            (_, index) => (
              <div
                key={index}
                className="skeleton h-28"
              />
            )
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="h-80">
            <Skeleton className="h-full" />
          </Card>

          <Card className="h-80">
            <Skeleton className="h-full" />
          </Card>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // Property not found
  // ------------------------------------------------------------

  if (!property) {
    return (
      <div className="animate-fade-in">
        <PageHeader
          title="Property Details"
          subtitle="Property not found"
        />

        <EmptyState
          icon={
            <Building2
              size={28}
            />
          }
          title="Property not found"
          description="The property you're looking for may have been archived or deleted."
        />
      </div>
    );
  }

  // ------------------------------------------------------------
  // Recent items
  // ------------------------------------------------------------

  const recentPayments =
    payments.slice(
      0,
      5
    );

  const recentMaintenance =
    maintenance.slice(
      0,
      5
    );

  // ------------------------------------------------------------
  // Tenant lookup helper
  // ------------------------------------------------------------

  function getUnitForTenant(
    tenant: Tenant
  ) {
    return units.find(
      (unit) =>
        unit.id ===
        tenant.unit_id
    );
  }

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <div className="animate-fade-in">
      {/* Back */}

      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            navigate(
              "/properties"
            )
          }
          className="flex items-center gap-2"
        >
          <ArrowLeft
            size={16}
          />
          Back to Properties
        </Button>
      </div>

     {/* ====================================================== */}
{/* PROPERTY HERO                                          */}
{/* ====================================================== */}

<div className="relative h-[300px] sm:h-[320px] md:h-72 bg-navy-700 overflow-hidden rounded-2xl mb-6">

  {/* Property image */}
  <img
    src={
      property.image_url ||
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop&auto=format"
    }
    alt={property.name}
    className="absolute inset-0 w-full h-full object-cover object-center"
    loading="lazy"
  />

  {/* Dark gradient */}
  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/95 via-navy-950/45 to-transparent" />

  {/* Hero content */}
  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 md:p-6">

    <div className="flex items-end justify-between gap-3">

      {/* ================================================= */}
      {/* LEFT — PROPERTY INFORMATION                      */}
      {/* ================================================= */}

      <div className="min-w-0 flex-1">

        {/* Status / type / ID */}

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">

          <StatusBadge
            status={property.status}
          />

          <span className="text-[9px] sm:text-[10px] md:text-xs text-navy-300 font-mono uppercase bg-navy-950/45 rounded-md px-1.5 sm:px-2 py-1">
            {property.property_type.replace(
              /_/g,
              " "
            )}
          </span>

          {property.property_display_id && (
            <span className="hidden">
              ID:{" "}
              {
                property.property_display_id
              }
            </span>
          )}

        </div>

        {/* Property name */}
<h1 className="font-display text-2xl sm:text-3xl md:text-3xl font-bold text-white leading-tight break-words">
  {property.name}
</h1>

        {/* Address */}

        <div className="flex items-start gap-1.5 sm:gap-2 text-navy-300 mt-1.5 sm:mt-2 max-w-[90%]">

          <Building2
            size={13}
            className="mt-0.5 flex-shrink-0 sm:w-4 sm:h-4"
          />

          <span className="text-[10px] sm:text-xs md:text-sm leading-relaxed break-words">
            {property.address},{" "}
            {property.city},{" "}
            {property.state}
          </span>

        </div>

      </div>

      {/* ================================================= */}
      {/* RIGHT — ACTIONS                                   */}
      {/* ================================================= */}

      <div className="flex items-center gap-2 flex-shrink-0">

        <Button
          variant="secondary"
          onClick={openEdit}
        >
          <Edit
            size={16}
          />
        </Button>

        <Button
          variant="danger"
          onClick={archiveProperty}
        >
          <Archive
            size={16}
          />
        </Button>

      </div>

    </div>

  </div>

</div>

      {/* ====================================================== */}
      {/* STATS                                                    */}
      {/* ====================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Units"
          value={
            totalUnits
          }
          icon={
            <Building2
              size={18}
              className="text-blue-400"
            />
          }
          color="blue"
        />

        <StatCard
          label="Occupied"
          value={`${occupancyPct}%`}
          sub={`${occupiedUnits} / ${totalUnits} units`}
          icon={
            <DoorOpen
              size={18}
              className="text-emerald-400"
            />
          }
          color="emerald"
        />

        <StatCard
          label="Active Tenants"
          value={
            tenants.filter(
              (tenant) =>
                tenant.status ===
                "ACTIVE"
            ).length
          }
          // sub={`${tenants.length} tenant record${
          //   tenants.length ===
          //   1
          //     ? ""
          //     : "s"
          // } in this property`}
          icon={
            <Users
              size={18}
              className="text-violet-400"
            />
          }
          color="violet"
        />

        <StatCard
          label="Monthly Rent Roll"
          value={formatINR(
            monthlyRevenue
          )}
          icon={
            <TrendingUp
              size={18}
              className="text-blue-400"
            />
          }
          color="blue"
        />

        <StatCard
          label="Collected This Month"
          value={formatINR(
            collectedThisMonth
          )}
          icon={
            <CreditCard
              size={18}
              className="text-emerald-400"
            />
          }
          color="emerald"
        />

        <StatCard
          label="Overdue Rent"
          value={formatINR(
            overdueTotal
          )}
          icon={
            <AlertTriangle
              size={18}
              className="text-red-400"
            />
          }
          color="red"
        />

        <StatCard
          label="Open Maintenance"
          value={
            activeMaintenance
          }
          sub={
            urgentMaintenance
              ? `${urgentMaintenance} urgent`
              : undefined
          }
          icon={
            <Wrench
              size={18}
              className="text-orange-400"
            />
          }
          color="orange"
        />

        <StatCard
          label="Active Leases"
          value={
            activeLeases
          }
          sub={
            expiringLeases
              ? `${expiringLeases} expiring soon`
              : undefined
          }
          icon={
            <FileText
              size={18}
              className="text-amber-400"
            />
          }
          color="amber"
        />
      </div>

      {/* ====================================================== */}
      {/* TENANTS                                                  */}
      {/* ====================================================== */}

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-white">
              Tenants in this property
            </h3>

           {/* <p className="text-xs text-navy-500 mt-1">
              Tenants are linked to properties through their
              assigned units.
            </p>*/}
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/tenants"
              )
            }
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            View all →
          </button>
        </div>

        {relatedLoading ? (
          <div className="flex flex-col gap-2">
            {[
              ...Array(3),
            ].map(
              (_, index) => (
                <Skeleton
                  key={index}
                  className="h-16"
                />
              )
            )}
          </div>
        ) : tenants.length ===
          0 ? (
          <EmptyState
            icon={
              <Users
                size={20}
              />
            }
            title="No tenants assigned"
            // description="Add a tenant to one of this property's units and they will appear here."
          />
        ) : (
          <div className="flex flex-col">
            {tenants.map(
              (tenant) => {
                const unit =
                  getUnitForTenant(
                    tenant
                  );

                return (
                  <button
                    key={
                      tenant.id
                    }
                    type="button"
                    onClick={() =>
                      navigate(
                        `/tenants/${
                          tenant.tenant_display_id ||
                          tenant.id
                        }`
                      )
                    }
                    className="w-full flex items-center justify-between gap-4 py-3 border-b border-navy-700 last:border-0 text-left hover:bg-navy-800/50 rounded-lg px-2 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">
                          {tenant.full_name
                            .trim()
                            .charAt(
                              0
                            )
                            .toUpperCase()}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">
                          {
                            tenant.full_name
                          }
                        </div>

                        <div className="text-xs text-navy-500 truncate">
                          {tenant.phone ||
                            tenant.email ||
                            "No contact information"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs text-navy-300">
                          {unit
                            ? `Unit ${unit.unit_number}`
                            : "No unit"}
                        </div>

                        <div className="text-[10px] text-navy-600">
                          {
                            tenant.status
                          }
                        </div>
                      </div>

                      <ArrowRight
                        size={14}
                        className="text-navy-600"
                      />
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </Card>

      {/* ====================================================== */}
      {/* MAINTENANCE + PAYMENTS                                  */}
      {/* ====================================================== */}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Maintenance */}

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-bold text-white">
              Recent Maintenance
            </h3>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/maintenance"
                )
              }
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View all →
            </button>
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
                (req) => (
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

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/payments"
                )
              }
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              View all →
            </button>
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
                (payment) => (
                  <div
                    key={
                      payment.id
                    }
                    className="flex items-center justify-between py-2.5 border-b border-navy-700 last:border-0"
                  >
                    <div>
                      <div className="text-sm font-semibold text-navy-200">
                        {formatINR(
                          payment.amount
                        )}
                      </div>

                      <div className="text-xs text-navy-500">
                        {payment.payment_method ||
                          "Manual"}{" "}
                        ·{" "}
                        {new Date(
                          payment.created_at
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </div>
                    </div>

                    <StatusBadge
                      status={
                        payment.status
                      }
                    />
                  </div>
                )
              )}
            </div>
          )}
        </Card>
      </div>

      {/* ====================================================== */}
      {/* EDIT PROPERTY                                          */}
      {/* ====================================================== */}

      <Modal
        open={
          showModal
        }
        onClose={
          closeModal
        }
        title="Edit Property"
        width="max-w-xl"
      >
        <form
          onSubmit={
            handleSubmit
          }
          className="flex flex-col gap-4"
        >
          <Input
            label="Property name"
            placeholder="e.g., Green Residency"
            value={
              editForm?.name ||
              ""
            }
            onChange={(
              e
            ) =>
              setEditForm(
                (current) => ({
                  ...current,
                  name:
                    e.target.value,
                })
              )
            }
            required
          />

          <Select
            label="Property type"
            value={
              editForm?.property_type ||
              ""
            }
            onChange={(
              e
            ) =>
              setEditForm(
                (current) => ({
                  ...current,
                  property_type:
                    e.target
                      .value as PropertyType,
                })
              )
            }
            options={
              PROPERTY_TYPES
            }
          />

          <Textarea
            className="hidden"
            label="Description"
            placeholder="Brief description..."
            value={
              editForm?.description ||
              ""
            }
            onChange={(
              e
            ) =>
              setEditForm(
                (current) => ({
                  ...current,
                  description:
                    e.target.value,
                })
              )
            }
          />

          <Input
            label="Address"
            placeholder="Plot 12, Road 3"
            value={
              editForm?.address ||
              ""
            }
            onChange={(
              e
            ) =>
              setEditForm(
                (current) => ({
                  ...current,
                  address:
                    e.target.value,
                })
              )
            }
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              value={
                editForm?.city ||
                ""
              }
              onChange={(
                e
              ) =>
                setEditForm(
                  (current) => ({
                    ...current,
                    city:
                      e.target
                        .value,
                  })
                )
              }
              required
            />

            <Input
              label="State"
              value={
                editForm?.state ||
                ""
              }
              onChange={(
                e
              ) =>
                setEditForm(
                  (current) => ({
                    ...current,
                    state:
                      e.target
                        .value,
                  })
                )
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Postal code"
              value={
                editForm?.postal_code ||
                ""
              }
              onChange={(
                e
              ) =>
                setEditForm(
                  (current) => ({
                    ...current,
                    postal_code:
                      e.target.value,
                  })
                )
              }
            />

            <Select
              label="Status"
              value={
                editForm?.status ||
                "ACTIVE"
              }
              onChange={(
                e
              ) =>
                setEditForm(
                  (current) => ({
                    ...current,
                    status:
                      e.target
                        .value as PropertyStatus,
                  })
                )
              }
              options={
                PROPERTY_STATUSES
              }
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={
                closeModal
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              loading={
                submitting
              }
            >
              Update Property
            </Button>
          </div>
        </form>
      </Modal>

      {toast && (
        <Toast
          message={
            toast.msg
          }
          type={
            toast.type
          }
          onClose={() =>
            setToast(
              null
            )
          }
        />
      )}
    </div>
  );
}