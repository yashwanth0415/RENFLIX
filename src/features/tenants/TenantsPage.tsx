import { appConfirm } from "../../lib/appConfirm";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router";

import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  CheckSquare,
  Trash2,
  X,
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
  PageHeader,
  EmptyState,
  Skeleton,
  Toast,
} from "../../components/ui";

import type {
  Tenant,
  TenantStatus,
  Unit,
  Property,
} from "../../lib/types";

const defaultForm = {
  full_name: "",
  email: "",
  phone: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_email: "",
  property_id: "",
  unit_id: "",
  move_in_date: "",
  status: "ACTIVE" as TenantStatus,
};

export default function TenantsPage() {
  const {
    profile,
  } = useAuth();

  const navigate =
    useNavigate();

  // ------------------------------------------------------------
  // Data
  // ------------------------------------------------------------

  const [
    tenants,
    setTenants,
  ] = useState<Tenant[]>(
    []
  );

  const [
    properties,
    setProperties,
  ] = useState<Property[]>(
    []
  );

  const [
    units,
    setUnits,
  ] = useState<Unit[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  // ------------------------------------------------------------
  // List filters
  // ------------------------------------------------------------

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    filterProp,
    setFilterProp,
  ] = useState("");
  const [filterUnit, setFilterUnit] = useState("");

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // ------------------------------------------------------------
  // Modal
  // ------------------------------------------------------------

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    editTenant,
    setEditTenant,
  ] = useState<Tenant | null>(
    null
  );

  const [
    form,
    setForm,
  ] = useState(
    defaultForm
  );

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    toast,
    setToast,
  ] = useState<{
    msg: string;
    type:
      | "success"
      | "error";
  } | null>(
    null
  );

  // ------------------------------------------------------------
  // Fetch all tenant/property/unit data
  // ------------------------------------------------------------

  useEffect(() => {
    if (
      profile?.organization_id
    ) {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [
    profile?.organization_id,
  ]);

  async function fetchAll() {
    if (
      !profile?.organization_id
    ) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // --------------------------------------------------------
      // First load properties belonging to this organization.
      // --------------------------------------------------------

      const {
        data: propertyData,
        error: propertyError,
      } =
        await supabase
          .from("properties")
          .select("*")
          .eq(
            "organization_id",
            profile.organization_id
          )
          .eq(
            "status",
            "ACTIVE"
          )
          .order(
            "name",
            {
              ascending: true,
            }
          );

      if (propertyError) {
        throw propertyError;
      }

      const activeProperties =
        (propertyData ||
          []) as Property[];

      setProperties(
        activeProperties
      );

      // --------------------------------------------------------
      // Property IDs are used to load their units.
      // --------------------------------------------------------

      const propertyIds =
        activeProperties.map(
          (property) =>
            property.id
        );

      let unitsData:
        | Unit[]
        | null = [];

      if (
        propertyIds.length >
        0
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from("units")
            .select("*")
            .in(
              "property_id",
              propertyIds
            )
            .order(
              "unit_number",
              {
                ascending: true,
              }
            );

        if (error) {
          throw error;
        }

        unitsData =
          (data ||
            []) as Unit[];
      }

      setUnits(
        unitsData
      );

      // --------------------------------------------------------
      // Load tenants for the organization.
      // --------------------------------------------------------

      const {
        data: tenantData,
        error: tenantError,
      } =
        await supabase
          .from("tenants")
          .select("*")
          .eq(
            "organization_id",
            profile.organization_id
          )
          .is("archived_at", null)
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

      if (tenantError) {
        throw tenantError;
      }

      setTenants(
        (tenantData ||
          []) as Tenant[]
      );
    } catch (error) {
      console.error(
        "RENFLIX tenants fetch error:",
        error
      );

      setToast({
        msg:
          error instanceof Error
            ? error.message
            : "Unable to load tenants.",
        type:
          "error",
      });
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------
  // Property lookup for a tenant
  // ------------------------------------------------------------
  //
  // tenant.unit_id
  //       ↓
  // units.id
  //       ↓
  // units.property_id
  //
  // ------------------------------------------------------------

  function getPropertyIdForTenant(
    tenant: Tenant
  ): string {
    if (!tenant.unit_id) {
      return "";
    }

    const unit =
      units.find(
        (item) =>
          item.id ===
          tenant.unit_id
      );

    return (
      unit?.property_id ||
      ""
    );
  }

  // ------------------------------------------------------------
  // Unit lookup
  // ------------------------------------------------------------

  function getUnitForTenant(
    tenant: Tenant
  ): Unit | undefined {
    if (!tenant.unit_id) {
      return undefined;
    }

    return units.find(
      (unit) =>
        unit.id ===
        tenant.unit_id
    );
  }

  // ------------------------------------------------------------
  // Property options
  // ------------------------------------------------------------

  const propertyOptions =
    useMemo(
      () => [
        {
          value: "",
          label:
            "All properties",
        },
        ...properties.map(
          (
            property
          ) => ({
            value:
              property.id,
            label:
              property.name,
          })
        ),
      ],
      [properties]
    );

  const unitOptions = useMemo(() => [
    { value: "", label: "All Units" },
    ...units.filter(u => !filterProp || u.property_id === filterProp).map(u => ({ value: u.id, label: u.unit_number }))
  ], [units, filterProp]);

  // ------------------------------------------------------------
  // Filter tenants
  // ------------------------------------------------------------

  const filteredTenants =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      return tenants.filter(
        (tenant) => {
          // ----------------------------------------------
          // Search filter
          // ----------------------------------------------

          const matchesSearch =
            !searchValue ||
            tenant.full_name
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            (
              tenant.phone ||
              ""
            )
              .toLowerCase()
              .includes(
                searchValue
              ) ||
            (
              tenant.email ||
              ""
            )
              .toLowerCase()
              .includes(
                searchValue
              );

          // ----------------------------------------------
          // Property filter
          // ----------------------------------------------

          const tenantPropertyId =
            getPropertyIdForTenant(
              tenant
            );

          const matchesProperty = !filterProp || tenantPropertyId === filterProp;
          const matchesUnit = !filterUnit || tenant.unit_id === filterUnit;

          return (matchesSearch && matchesProperty && matchesUnit);
        }
      );
    }, [
      tenants,
      units,
      search,
      filterProp,
      filterUnit,
    ]);

  // ------------------------------------------------------------
  // Filter units inside Add/Edit modal
  // ------------------------------------------------------------

  const filteredUnits =
    useMemo(() => {
      if (!form.property_id) {
        return [];
      }

      const availableUnits =
        units.filter(
          (unit) =>
            unit.property_id ===
              form.property_id &&
            (
              unit.status ===
                "AVAILABLE" ||
              unit.id ===
                form.unit_id
            )
        );

      return availableUnits;
    }, [
      units,
      form.property_id,
      form.unit_id,
    ]);

  // ------------------------------------------------------------
  // Open Add Tenant
  // ------------------------------------------------------------

  function openAdd() {
    setEditTenant(null);

    setForm({
      ...defaultForm,
      property_id:
        filterProp ||
        "",
      unit_id: "",
    });

    setShowModal(
      true
    );
  }

  // ------------------------------------------------------------
  // Open Edit Tenant
  // ------------------------------------------------------------

  function openEdit(
    tenant: Tenant
  ) {
    setEditTenant(
      tenant
    );

    const propertyId =
      getPropertyIdForTenant(
        tenant
      );

    setForm({
      full_name:
        tenant.full_name,

      email:
        tenant.email ||
        "",

      phone:
        tenant.phone,

      emergency_contact_name:
        tenant.emergency_contact_name ||
        "",

      emergency_contact_phone:
        tenant.emergency_contact_phone ||
        "",

      property_id:
        propertyId,

      unit_id:
        tenant.unit_id ||
        "",

      move_in_date:
        tenant.move_in_date ||
        "",

      status:
        tenant.status,
    });

    setShowModal(
      true
    );
  }

  // ------------------------------------------------------------
  // Handle property change inside modal
  // ------------------------------------------------------------

  function handlePropertyChange(
    propertyId: string
  ) {
    setForm(
      (current) => ({
        ...current,
        property_id:
          propertyId,
        unit_id: "",
      })
    );
  }

  // ------------------------------------------------------------
  // Handle tenant save
  // ------------------------------------------------------------

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !profile?.organization_id
    ) {
      setToast({
        msg:
          "No organization is associated with your account.",
        type:
          "error",
      });

      return;
    }

    setSubmitting(true);
    setToast(null);

    try {
      // --------------------------------------------------------
      // Verify selected unit belongs to selected property.
      // --------------------------------------------------------

      if (
        form.property_id &&
        form.unit_id
      ) {
        const selectedUnit =
          units.find(
            (unit) =>
              unit.id ===
              form.unit_id
          );

        if (
          !selectedUnit ||
          selectedUnit.property_id !==
            form.property_id
        ) {
          throw new Error(
            "The selected unit does not belong to the selected property."
          );
        }
      }

      if (form.unit_id && !editTenant) {
        const selectedUnit = units.find((u) => u.id === form.unit_id);
        const capacity = Number((selectedUnit?.metadata as any)?.tenant_capacity || 1);
        const { count: activeCount } = await supabase.from("tenants").select("id", { count: "exact", head: true }).eq("unit_id", form.unit_id).eq("status", "ACTIVE");
        if (Number(activeCount || 0) >= capacity) {
          throw new Error(`This unit already has ${activeCount || 0} active tenant(s). Its capacity is ${capacity}.`);
        }
      }

      const payload = {
        organization_id:
          profile.organization_id,

        full_name:
          form.full_name.trim(),

        email:
          form.email.trim()
            ? form.email
                .trim()
                .toLowerCase()
            : null,

        phone:
          form.phone.trim(),

        emergency_contact_name:
          form.emergency_contact_name.trim() ||
          null,

        emergency_contact_phone:
          form.emergency_contact_phone.trim() ||
          null,

        emergency_email:
          form.emergency_email.trim().toLowerCase() || null,

        unit_id:
          form.unit_id ||
          null,

        move_in_date:
          form.move_in_date ||
          null,

        status:
          form.status,
      };

      // --------------------------------------------------------
      // Update existing tenant
      // --------------------------------------------------------

      if (
        editTenant
      ) {
        const {
          error,
        } =
          await supabase
            .from("tenants")
            .update({
              ...payload,
              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              editTenant.id
            );

        if (error) {
          throw error;
        }

        // ------------------------------------------------------
        // Mark newly assigned unit occupied
        // ------------------------------------------------------

        if (
          form.unit_id &&
          form.status ===
            "ACTIVE"
        ) {
          await supabase
            .from("units")
            .update({
              status:
                "OCCUPIED",
            })
            .eq(
              "id",
              form.unit_id
            );
        }

        // ------------------------------------------------------
        // Free previous unit if the tenant changed units
        // ------------------------------------------------------

        if (
          editTenant.unit_id &&
          editTenant.unit_id !==
            form.unit_id
        ) {
          await supabase
            .from("units")
            .update({
              status:
                "AVAILABLE",
            })
            .eq(
              "id",
              editTenant.unit_id
            );
        }

        setToast({
          msg:
            "Tenant updated!",
          type:
            "success",
        });
      }

      // --------------------------------------------------------
      // Add new tenant
      // --------------------------------------------------------

      else {
        if (!form.email.trim()) throw new Error("Tenant email is required to create the tenant account.");
        if (!form.phone.trim()) throw new Error("Tenant phone number is required to create the tenant account.");
        const { data: provisioned, error: provisionError } = await supabase.functions.invoke("tenant-provision", {
          body: {
            full_name: form.full_name.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            emergency_contact_name: form.emergency_contact_name.trim() || null,
            emergency_contact_phone: form.emergency_contact_phone.trim() || null,
            emergency_email: form.emergency_email.trim().toLowerCase() || null,
            property_id: form.property_id || null,
            unit_id: form.unit_id || null,
            move_in_date: form.move_in_date || null,
            status: form.status,
          },
        });
        if (provisionError || !provisioned?.success) throw new Error(provisionError?.message || provisioned?.error || "Unable to create tenant account.");
        const password = provisioned.temporary_password;
        setToast({
          msg: `Tenant account created • Login: ${form.email.trim().toLowerCase()} • Password: ${password}`,
          type: "success"
        });
      }

      setShowModal(
        false
      );

      setForm(
        defaultForm
      );

      setEditTenant(
        null
      );

      await fetchAll();
    } catch (error) {
      console.error(
        "RENFLIX tenant save error:",
        error
      );

      setToast({
        msg:
          error instanceof Error
            ? error.message
            : "Unable to save tenant.",
        type:
          "error",
      });
    } finally {
      setSubmitting(
        false
      );
    }
  }

  // ------------------------------------------------------------
  // Select / delete tenants
  // ------------------------------------------------------------

  function toggleTenantSelection(id: string) {
    setSelectedTenantIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    const ids = filteredTenants.map((t) => t.id);
    setSelectedTenantIds((prev) => prev.length === ids.length ? [] : ids);
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedTenantIds([]);
  }

  async function deleteSelectedTenants() {
    if (!selectedTenantIds.length) return;
    const confirmed = await appConfirm(
      `Archive ${selectedTenantIds.length} selected tenant${selectedTenantIds.length > 1 ? "s" : ""}? They will remain in Settings → Archived.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setToast(null);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString(), status: "FORMER" })
        .in("id", selectedTenantIds);
      if (error) throw error;
      setToast({ msg: `${selectedTenantIds.length} tenant(s) archived.`, type: "success" });
      exitSelectionMode();
      await fetchAll();
    } catch (error) {
      setToast({ msg: error instanceof Error ? error.message : "Unable to archive tenants.", type: "error" });
    } finally {
      setDeleting(false);
    }
  }

  function handleSelectDeleteButton() {
    if (!selectionMode) {
      setSelectionMode(true);
      return;
    }
    if (!selectedTenantIds.length) {
      exitSelectionMode();
      return;
    }
    deleteSelectedTenants();
  }

  // ------------------------------------------------------------
  // Active tenant count
  // ------------------------------------------------------------

  const activeTenantCount =
    tenants.filter(
      (tenant) =>
        tenant.status ===
        "ACTIVE"
    ).length;

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tenants"
        subtitle={`${activeTenantCount} active tenants`}
        action={
          <div className="flex items-center gap-2">
            <Button variant={selectionMode ? "danger" : "secondary"} onClick={handleSelectDeleteButton} size="sm" loading={deleting}>
              {selectionMode ? `Delete${selectedTenantIds.length ? ` (${selectedTenantIds.length})` : ""}` : "Select"}
            </Button>
            <Button onClick={openAdd} size="sm" disabled={selectionMode}>
              <Plus size={16} /><span className="hidden sm:inline">Add Tenant</span><span className="sm:hidden">Add</span>
            </Button>
          </div>
        }
      />

      {/* ====================================================== */}
      {/* SEARCH + PROPERTY FILTER                               */}
      {/* ====================================================== */}

      <div className="grid grid-cols-2 lg:grid-cols-[1fr_220px_180px] gap-3 mb-5">
        {/* Search */}

        <div className="relative col-span-2 lg:col-span-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500"
          />

          <input
            className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric"
            placeholder="Search by name, phone, or email..."
            value={
              search
            }
            onChange={(
              e
            ) =>
              setSearch(
                e.target
                  .value
              )
            }
          />
        </div>

        {/* Property filter */}

        <select
          className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-navy-100 focus:outline-none focus:ring-2 focus:ring-blue-electric w-full min-w-0"
          value={
            filterProp
          }
          onChange={(
            e
          ) =>
            setFilterProp(
              e.target
                .value
            )
          }
        >
          {propertyOptions.map(
            (
              option
            ) => (
              <option
                key={
                  option.value
                }
                value={
                  option.value
                }
              >
                {
                  option.label
                }
              </option>
            )
          )}
        </select>

        <select className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-navy-100 focus:outline-none focus:ring-2 focus:ring-blue-electric w-full min-w-0" value={filterUnit} onChange={e => setFilterUnit(e.target.value)}>
          {unitOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>

      {/* ====================================================== */}
      {/* ACTIVE FILTER INDICATOR                                */}
      {/* ====================================================== */}

      {filterProp && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-navy-500">
            Showing tenants in:
          </span>

          <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-3 py-1">
            {
              properties.find(
                (property) =>
                  property.id ===
                  filterProp
              )?.name ||
              "Selected property"
            }
          </span>

          <button
            type="button"
            onClick={() => { setFilterProp(""); setFilterUnit(""); }}
            className="text-xs text-navy-500 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      )}

      {/* ====================================================== */}
      {/* LIST                                                    */}
      {/* ====================================================== */}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[
            ...Array(6),
          ].map(
            (_, index) => (
              <Skeleton
                key={
                  index
                }
                className="h-20"
              />
            )
          )}
        </div>
      ) : filteredTenants.length ===
        0 ? (
        <Card>
          <EmptyState
            icon={
              <Users
                size={28}
              />
            }
            title={
              filterProp
                ? "No tenants in this property"
                : "No tenants yet"
            }
            description={
              filterProp
                ? "No tenant is currently assigned to a unit in the selected property."
                : "Add your first tenant to start tracking rent and maintenance."
            }
            action={
              <Button
                onClick={
                  openAdd
                }
                size="sm"
              >
                <Plus
                  size={14}
                />
                Add Tenant
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTenants.map(
            (
              tenant
            ) => {
              const unit =
                getUnitForTenant(
                  tenant
                );

              const propertyId =
                getPropertyIdForTenant(
                  tenant
                );

              const property =
                properties.find(
                  (
                    item
                  ) =>
                    item.id ===
                    propertyId
                );

              return (
                <div
                  key={tenant.id}
                  className={`bg-navy-800 border border-navy-700 rounded-xl p-4 card-hover group cursor-pointer ${
                    selectedTenantIds.includes(tenant.id) ? "border-blue-500 ring-1 ring-blue-500/40" : ""
                  }`}
                  onClick={() => selectionMode
                    ? toggleTenantSelection(tenant.id)
                    : navigate(`/tenants/${tenant.id}`)
                  }
                >
                  {selectionMode && (
                    <div className="mb-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedTenantIds.includes(tenant.id)}
                        onChange={() => toggleTenantSelection(tenant.id)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <span className="text-xs text-navy-400">Select tenant</span>
                    </div>
                  )}
                  {/* Header */}

                  <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 mb-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-bold text-white">
                        {tenant.full_name
                          .trim()
                          .charAt(
                            0
                          )
                          .toUpperCase()}
                      </span>
                    </div>

                    <div className="min-w-0 flex flex-col gap-1">
                      <div className="font-display font-semibold text-white text-sm sm:text-base truncate">{tenant.full_name}</div>
                      {tenant.phone && <div className="flex items-center gap-2 text-xs text-navy-400"><Phone size={11} /><span className="truncate">{tenant.phone}</span></div>}
                      {tenant.email && <div className="flex items-center gap-2 text-xs text-navy-400"><Mail size={11} /><span className="truncate">{tenant.email}</span></div>}
                    </div>
                    <div className="self-start justify-self-end"><StatusBadge status={tenant.status} /></div>
                  </div>

                  {/* Contact details are intentionally kept in the middle column above on mobile. */}
                  <div className="hidden">
                    {tenant.phone && (
                      <div className="flex items-center gap-2 text-xs text-navy-400">
                        <Phone
                          size={
                            11
                          }
                        />

                        <span>
                          {
                            tenant.phone
                          }
                        </span>
                      </div>
                    )}

                    {tenant.email && (
                      <div className="flex items-center gap-2 text-xs text-navy-400">
                        <Mail
                          size={
                            11
                          }
                        />

                        <span className="truncate">
                          {
                            tenant.email
                          }
                        </span>
                      </div>
                    )}

                    {/* Property */}

                   {/* {property && (
                      <div className="text-xs text-blue-400 mt-1 truncate">
                        Property:{" "}
                        {
                          property.name
                        }
                      </div>
                    )}*/}

                    {/* Unit */}

                   {/* {unit && (
                      <div className="text-xs text-navy-400">
                        Unit:{" "}
                        {
                          unit.unit_number
                        }
                      </div>
                    )}*/}

                   {/* {tenant.tenant_display_id && (
                      <div className="text-xs text-navy-500 font-mono">
                        ID:{" "}
                        {
                          tenant.tenant_display_id
                        }
                      </div>
                    )}*/}

                    {/*{tenant.move_in_date && (
                      <div className="text-xs text-navy-500 mt-1">
                        Move-in:{" "}
                        {new Date(
                          tenant.move_in_date
                        ).toLocaleDateString(
                          "en-IN"
                        )}
                      </div>
                    )}*/}
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* ====================================================== */}
      {/* ADD / EDIT TENANT MODAL                                 */}
      {/* ====================================================== */}

      <Modal
        open={
          showModal
        }
        onClose={() => {
          if (
            !submitting
          ) {
            setShowModal(
              false
            );
          }
        }}
        title={
          editTenant
            ? "Edit Tenant"
            : "Add Tenant"
        }
        width="max-w-lg"
      >
        <form
          onSubmit={
            handleSubmit
          }
          className="flex flex-col gap-4"
        >
          <Input
            label="Full name"
            placeholder="Arjun Kumar"
            value={
              form.full_name
            }
            onChange={(
              e
            ) =>
              setForm(
                (
                  current
                ) => ({
                  ...current,
                  full_name:
                    e.target
                      .value,
                })
              )
            }
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={
                form.phone
              }
              onChange={(
                e
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,
                    phone:
                      e.target
                        .value,
                  })
                )
              }
              required
            />

            <Input
              label="Email"
              type="email"
              placeholder="arjun@email.com"
              value={
                form.email
              }
              onChange={(
                e
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,
                    email:
                      e.target
                        .value,
                  })
                )
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Emergency"
              placeholder="Contact name"
              value={
                form.emergency_contact_name
              }
              onChange={(
                e
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,
                    emergency_contact_name:
                      e.target
                        .value,
                  })
                )
              }
            />

            <Input
              label="Emergency phone"
              placeholder="9876543210"
              type="tel"
              value={
                form.emergency_contact_phone
              }
              onChange={(
                e
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,
                    emergency_contact_phone:
                      e.target
                        .value,
                  })
                )
              }
            />
          </div>

          <Input
            label="Emergency email"
            type="email"
            placeholder="emergency@email.com"
            value={form.emergency_email}
            onChange={(e) =>
              setForm((current) => ({
                ...current,
                emergency_email: e.target.value,
              }))
            }
          />

          {/* Property */}

          {properties.length >
            0 && (
            <Select
              label="Property *"
              value={
                form.property_id
              }
              onChange={(
                e
              ) =>
                handlePropertyChange(
                  e.target
                    .value
                )
              }
              options={[
                {
                  value:
                    "",
                  label:
                    "Select a property",
                },
                ...properties.map(
                  (
                    property
                  ) => ({
                    value:
                      property.id,
                    label:
                      property.name,
                  })
                ),
              ]}
              required
            />
          )}

          {/* Unit */}

          {form.property_id && (
            <Select
              label="Unit *"
              value={
                form.unit_id
              }
              onChange={(
                e
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,
                    unit_id:
                      e.target
                        .value,
                  })
                )
              }
              options={[
                {
                  value:
                    "",
                  label:
                    filteredUnits.length >
                    0
                      ? "Select a unit"
                      : "No available units",
                },
                ...filteredUnits.map(
                  (
                    unit
                  ) => ({
                    value:
                      unit.id,
                    label:
                      `${unit.unit_number}${
                        unit.name
                          ? ` — ${unit.name}`
                          : ""
                      } (₹${unit.monthly_rent?.toLocaleString(
                        "en-IN"
                      )}/mo)`,
                  })
                ),
              ]}
              required
              disabled={
                filteredUnits.length ===
                0
              }
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Move-in date"
              type="date"
              value={
                form.move_in_date
              }
              onChange={(
                e
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,
                    move_in_date:
                      e.target
                        .value,
                  })
                )
              }
            />

            <Select
              label="Status"
              value={
                form.status
              }
              onChange={(
                e
              ) =>
                setForm(
                  (
                    current
                  ) => ({
                    ...current,
                    status:
                      e.target
                        .value as TenantStatus,
                  })
                )
              }
              options={[
                {
                  value:
                    "ACTIVE",
                  label:
                    "Active",
                },
                {
                  value:
                    "INACTIVE",
                  label:
                    "Inactive",
                },
                {
                  value:
                    "FORMER",
                  label:
                    "Former",
                },
              ]}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="ghost"
              type="button"
              disabled={
                submitting
              }
              onClick={() =>
                setShowModal(
                  false
                )
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
              {editTenant
                ? "Update"
                : "Add Tenant"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Toast */}

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
