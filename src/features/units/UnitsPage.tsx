import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { DoorOpen, Plus, Search } from "lucide-react";
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
  Unit,
  UnitStatus,
  Property,
} from "../../lib/types";

const UNIT_STATUSES: {
  value: UnitStatus;
  label: string;
}[] = [
  {
    value: "AVAILABLE",
    label: "Available",
  },
  {
    value: "OCCUPIED",
    label: "Occupied",
  },
  {
    value: "MAINTENANCE",
    label: "Under Maintenance",
  },
  {
    value: "RESERVED",
    label: "Reserved",
  },
  {
    value: "BLOCKED",
    label: "Blocked",
  },
];

interface UnitWithProperty extends Unit {
  tenant_count?: number;
  property?: {
    name: string;
  };
}

interface UnitForm {
  property_id: string;
  number_of_units: string;
  floor: string;
  tenant_capacity: string;
  unit_number: string;
  unit_type: string;
  monthly_rent: string;
  security_deposit: string;
  status: UnitStatus;
}

const defaultForm: UnitForm = {
  property_id: "",
  number_of_units: "",
  floor: "",
  tenant_capacity: "1",
  unit_number: "",
  unit_type: "",
  monthly_rent: "",
  security_deposit: "",
  status: "AVAILABLE",
};

export default function UnitsPage() {
  const { profile } = useAuth();

  const [units, setUnits] = useState<
    UnitWithProperty[]
  >([]);

  const [properties, setProperties] =
    useState<Property[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [filterProp, setFilterProp] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editUnit, setEditUnit] =
    useState<Unit | null>(null);

  const [form, setForm] =
    useState<UnitForm>(
      defaultForm
    );

  const [submitting, setSubmitting] =
    useState(false);

  /*
   * Selection mode.
   *
   * false:
   *   Checkboxes are hidden.
   *
   * true:
   *   Checkboxes are visible.
   */
  const [selectionMode, setSelectionMode] =
    useState(false);

  /*
   * Stores selected unit IDs.
   */
  const [selectedUnits, setSelectedUnits] =
    useState<Set<string>>(
      new Set()
    );

  const [deletingSelected, setDeletingSelected] =
    useState(false);

  const [toast, setToast] =
    useState<{
      msg: string;
      type: "success" | "error";
    } | null>(null);

  /*
   * =====================================================
   * LOAD DATA
   * =====================================================
   */

  useEffect(() => {
    if (profile?.organization_id) {
      fetchAll();
    } else {
      setLoading(false);
    }
  }, [profile]);

  async function fetchAll() {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      /*
       * Fetch active properties.
       */
      const {
        data: props,
        error: propertiesError,
      } = await supabase
        .from("properties")
        .select("id, name")
        .eq(
          "organization_id",
          profile.organization_id
        )
        .eq("status", "ACTIVE")
        .order("name", {
          ascending: true,
        });

      if (propertiesError) {
        throw propertiesError;
      }

      const activeProperties =
        (props || []) as Property[];

      setProperties(
        activeProperties
      );

      if (
        activeProperties.length ===
        0
      ) {
        setUnits([]);
        setSelectedUnits(
          new Set()
        );
        return;
      }

      const propertyIds =
        activeProperties.map(
          (property) =>
            property.id
        );

      /*
       * Fetch units.
       */
      const {
        data,
        error: unitsError,
      } = await supabase
        .from("units")
        .select(
          "*, property:property_id(name)"
        )
        .in(
          "property_id",
          propertyIds
        )
        .order("created_at", {
          ascending: false,
        });

      if (unitsError) {
        throw unitsError;
      }

      const loadedUnits = (data || []) as UnitWithProperty[];
      const unitIds = loadedUnits.map(u => u.id);
      if (unitIds.length) {
        const { data: tenantRows } = await supabase.from("tenants").select("unit_id").in("unit_id", unitIds).eq("status", "ACTIVE");
        const counts = new Map<string, number>();
        (tenantRows || []).forEach((row: any) => counts.set(row.unit_id, (counts.get(row.unit_id) || 0) + 1));
        loadedUnits.forEach(u => { u.tenant_count = counts.get(u.id) || 0; });
      }
      setUnits(loadedUnits);

      /*
       * Remove selected IDs that no longer exist.
       */
      setSelectedUnits(
        (current) => {
          const existingIds =
            new Set(
              (data || []).map(
                (unit) =>
                  unit.id
              )
            );

          return new Set(
            Array.from(
              current
            ).filter((id) =>
              existingIds.has(
                id
              )
            )
          );
        }
      );
    } catch (error) {
      console.error(
        "Failed to load units:",
        error
      );

      setToast({
        msg:
          error instanceof Error
            ? error.message
            : "Failed to load units.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  /*
   * =====================================================
   * ADD UNIT
   * =====================================================
   */

  function openAdd() {
    setEditUnit(null);

    setForm({
      ...defaultForm,
      property_id:
        properties[0]?.id || "",
    });

    setShowModal(true);
  }

  /*
   * =====================================================
   * EDIT UNIT
   * =====================================================
   */

  function openEdit(
    unit: Unit
  ) {
    setEditUnit(unit);

    setForm({
      property_id:
        unit.property_id,

      number_of_units: "",

      floor: "",

      unit_number:
        unit.unit_number,

      unit_type:
        unit.unit_type || "",

      monthly_rent:
        unit.monthly_rent?.toString() ||
        "",

      security_deposit:
        unit.security_deposit?.toString() ||
        "",

      status:
        unit.status,
    });

    setShowModal(true);
  }

  function closeModal() {
    if (submitting) {
      return;
    }

    setShowModal(false);
    setEditUnit(null);
    setForm(defaultForm);
  }

  /*
   * =====================================================
   * NUMERIC INPUT
   * =====================================================
   */

  function handleNumericChange(
    field:
      | "number_of_units"
      | "floor"
      | "monthly_rent"
      | "security_deposit",
    value: string
  ) {
    const digitsOnly =
      value.replace(
        /\D/g,
        ""
      );

    setForm(
      (current) => ({
        ...current,
        [field]:
          digitsOnly,
      })
    );
  }

  function preventNonNumericKeys(
    event: KeyboardEvent<HTMLInputElement>
  ) {
    if (
      [
        "e",
        "E",
        "+",
        "-",
        ".",
        ",",
      ].includes(event.key)
    ) {
      event.preventDefault();
    }
  }

  /*
   * =====================================================
   * GENERATE UNIT NUMBERS
   * =====================================================
   *
   * Floor 1 + 5 units:
   *
   * 101
   * 102
   * 103
   * 104
   * 105
   *
   * Floor 2 + 5 units:
   *
   * 201
   * 202
   * 203
   * 204
   * 205
   *
   * Floor 10 + 5 units:
   *
   * 1001
   * 1002
   * 1003
   * 1004
   * 1005
   */

  async function generateUnitNumbers(
    propertyId: string,
    floor: number,
    count: number
  ): Promise<string[]> {
    const {
      data,
      error,
    } = await supabase
      .from("units")
      .select(
        "unit_number"
      )
      .eq(
        "property_id",
        propertyId
      );

    if (error) {
      throw error;
    }

    const existingNumbers =
      new Set<string>(
        (data || [])
          .map((unit) =>
            String(
              unit.unit_number
            )
          )
          .filter(Boolean)
      );

    const floorPrefix =
      String(floor);

    const usedSequenceNumbers =
      new Set<number>();

    existingNumbers.forEach(
      (unitNumber) => {
        const expectedLength =
          floorPrefix.length +
          2;

        if (
          unitNumber.length ===
            expectedLength &&
          unitNumber.startsWith(
            floorPrefix
          )
        ) {
          const sequencePart =
            unitNumber.slice(
              floorPrefix.length
            );

          const sequence =
            Number(
              sequencePart
            );

          if (
            Number.isInteger(
              sequence
            ) &&
            sequence >= 1 &&
            sequence <= 99
          ) {
            usedSequenceNumbers.add(
              sequence
            );
          }
        }
      }
    );

    const generated: string[] =
      [];

    let sequence = 1;

    while (
      generated.length <
      count
    ) {
      if (
        !usedSequenceNumbers.has(
          sequence
        )
      ) {
        const unitNumber =
          floorPrefix +
          String(
            sequence
          ).padStart(2, "0");

        generated.push(
          unitNumber
        );
      }

      sequence++;
    }

    return generated;
  }

  /*
   * =====================================================
   * ADD / UPDATE
   * =====================================================
   */

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    if (
      !profile?.organization_id
    ) {
      setToast({
        msg:
          "Your organization could not be identified.",
        type: "error",
      });

      return;
    }

    /*
     * ===================================================
     * UPDATE EXISTING UNIT
     * ===================================================
     */

    if (editUnit) {
      if (!form.property_id) {
        setToast({
          msg:
            "Please select a property.",
          type: "error",
        });

        return;
      }

      if (
        !form.unit_type.trim()
      ) {
        setToast({
          msg:
            "Please enter the unit type.",
          type: "error",
        });

        return;
      }

      const monthlyRent =
        Number(
          form.monthly_rent
        );

      const advance =
        form.security_deposit
          ? Number(
              form.security_deposit
            )
          : null;

      if (
        !Number.isFinite(
          monthlyRent
        ) ||
        monthlyRent < 0
      ) {
        setToast({
          msg:
            "Please enter a valid monthly rent.",
          type: "error",
        });

        return;
      }

      if (
        advance !== null &&
        (!Number.isFinite(
          advance
        ) ||
          advance < 0)
      ) {
        setToast({
          msg:
            "Please enter a valid advance.",
          type: "error",
        });

        return;
      }

      setSubmitting(true);

      try {
        const {
          error,
        } = await supabase
          .from("units")
          .update({
            property_id:
              form.property_id,

            unit_type:
              form.unit_type.trim(),

            monthly_rent:
              monthlyRent,

            security_deposit:
              advance,

            metadata: {
              ...(editUnit.metadata || {}),
              floor: form.floor ? Number(form.floor) : (editUnit.metadata as any)?.floor ?? null,
              tenant_capacity: Math.max(1, Number(form.tenant_capacity) || 1),
            },

            status:
              form.status,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            editUnit.id
          );

        if (error) {
          throw error;
        }

        setToast({
          msg: `Unit ${editUnit.unit_number} updated successfully.`,
          type: "success",
        });

        setShowModal(false);
        setEditUnit(null);
        setForm(defaultForm);

        await fetchAll();
      } catch (error) {
        console.error(
          "Failed to update unit:",
          error
        );

        setToast({
          msg:
            error instanceof Error
              ? error.message
              : "Failed to update unit.",
          type: "error",
        });
      } finally {
        setSubmitting(false);
      }

      return;
    }

    /*
     * ===================================================
     * ADD MULTIPLE UNITS
     * ===================================================
     */

    if (!form.property_id) {
      setToast({
        msg:
          "Please select a property.",
        type: "error",
      });

      return;
    }

    const numberOfUnits =
      Number(
        form.number_of_units
      );

    const floor = Number(form.floor);
    const tenantCapacity = Number(form.tenant_capacity);

    const monthlyRent =
      Number(
        form.monthly_rent
      );

    const advance =
      form.security_deposit
        ? Number(
            form.security_deposit
          )
        : null;

    /*
     * Number of units:
     * 1 - 20
     */
    if (
      !Number.isInteger(
        numberOfUnits
      ) ||
      numberOfUnits < 1 ||
      numberOfUnits > 20
    ) {
      setToast({
        msg:
          "Number of units must be between 1 and 20.",
        type: "error",
      });

      return;
    }

    /*
     * Floor:
     * 1 - 10
     */
    if (!Number.isInteger(floor) || floor < 1 || floor > 100) {
      setToast({
        msg:
          "Floor must be between 1 and 10.",
        type: "error",
      });

      return;
    }

    if (!Number.isInteger(tenantCapacity) || tenantCapacity < 1 || tenantCapacity > 50) {
      setToast({ msg: "Tenants/unit must be between 1 and 50.", type: "error" });
      return;
    }

    if (
      !form.unit_type.trim()
    ) {
      setToast({
        msg:
          "Please enter the unit type.",
        type: "error",
      });

      return;
    }

    if (
      !Number.isFinite(
        monthlyRent
      ) ||
      monthlyRent < 0
    ) {
      setToast({
        msg:
          "Please enter a valid monthly rent.",
        type: "error",
      });

      return;
    }

    if (
      advance !== null &&
      (!Number.isFinite(
        advance
      ) ||
        advance < 0)
    ) {
      setToast({
        msg:
          "Please enter a valid advance.",
        type: "error",
      });

      return;
    }

    setSubmitting(true);

    try {
      const unitNumbers =
        await generateUnitNumbers(
          form.property_id,
          floor,
          numberOfUnits
        );

      const payload =
        unitNumbers.map(
          (
            unitNumber
          ) => ({
            property_id:
              form.property_id,

            unit_number:
              unitNumber,

            name: null,

            unit_type:
              form.unit_type.trim(),

            area: null,

            monthly_rent:
              monthlyRent,

            security_deposit:
              advance,

            status:
              form.status,

            organization_id:
              profile.organization_id,

            metadata: {
              floor,
              tenant_capacity: tenantCapacity,
            },
          })
        );

      const {
        error,
      } = await supabase
        .from("units")
        .insert(
          payload
        );

      if (error) {
        throw error;
      }

      setToast({
        msg: `${numberOfUnits} unit${
          numberOfUnits >
          1
            ? "s"
            : ""
        } added successfully.`,
        type: "success",
      });

      setShowModal(false);
      setEditUnit(null);
      setForm(defaultForm);

      await fetchAll();
    } catch (error) {
      console.error(
        "Failed to add units:",
        error
      );

      setToast({
        msg:
          error instanceof Error
            ? error.message
            : "Failed to add units.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  /*
   * =====================================================
   * SEARCH / FILTER
   *
   * IMPORTANT:
   * filtered is declared BEFORE anything
   * that uses filtered.
   * =====================================================
   */

  const searchQuery =
    search
      .trim()
      .toLowerCase();

  const filtered =
    units.filter(
      (unit) => {
        const matchSearch =
          !searchQuery ||
          unit.unit_number
            .toLowerCase()
            .includes(
              searchQuery
            ) ||
          (unit.name || "")
            .toLowerCase()
            .includes(
              searchQuery
            ) ||
          (unit.unit_type ||
            "")
            .toLowerCase()
            .includes(
              searchQuery
            );

        const matchProperty =
          !filterProp ||
          unit.property_id ===
            filterProp;

        return (
          matchSearch &&
          matchProperty
        );
      }
    );

  /*
   * =====================================================
   * SELECT ALL
   * =====================================================
   */

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every(
      (unit) =>
        selectedUnits.has(
          unit.id
        )
    );

  /*
   * =====================================================
   * TOGGLE INDIVIDUAL UNIT
   * =====================================================
   */

  function toggleUnitSelection(
    unitId: string
  ) {
    setSelectedUnits(
      (current) => {
        const next =
          new Set(
            current
          );

        if (
          next.has(unitId)
        ) {
          next.delete(
            unitId
          );
        } else {
          next.add(
            unitId
          );
        }

        return next;
      }
    );
  }

  /*
   * =====================================================
   * SELECT ALL / UNSELECT ALL
   * =====================================================
   */

  function toggleSelectAll() {
    if (
      filtered.length ===
      0
    ) {
      return;
    }

    setSelectedUnits(
      (current) => {
        const next =
          new Set(
            current
          );

        if (
          allFilteredSelected
        ) {
          filtered.forEach(
            (unit) => {
              next.delete(
                unit.id
              );
            }
          );
        } else {
          filtered.forEach(
            (unit) => {
              next.add(
                unit.id
              );
            }
          );
        }

        return next;
      }
    );
  }

  /*
   * =====================================================
   * SELECTION MODE
   * =====================================================
   *
   * First click:
   *
   * SELECT
   *   ↓
   * DELETE
   *
   * Second click:
   *
   * DELETE
   *   ↓
   * delete selected units
   *
   * If nothing is selected:
   *
   * DELETE
   *   ↓
   * exit selection mode
   */

  function handleSelectDeleteButton() {
    /*
     * If we aren't currently selecting,
     * enter selection mode.
     */
    if (!selectionMode) {
      setSelectionMode(true);
      return;
    }

    /*
     * If selection mode is active but
     * no units have been selected,
     * simply leave selection mode.
     */
    if (
      selectedUnits.size ===
      0
    ) {
      setSelectionMode(false);
      return;
    }

    /*
     * Otherwise delete the selected units.
     */
    handleDeleteSelected();
  }

  /*
   * =====================================================
   * DELETE SELECTED UNITS
   * =====================================================
   */

  async function handleDeleteSelected() {
    const ids =
      Array.from(
        selectedUnits
      );

    if (
      ids.length ===
      0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete ${ids.length} selected unit${
          ids.length >
          1
            ? "s"
            : ""
        }?\n\nThis action cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingSelected(
      true
    );

    try {
      const {
        error,
      } = await supabase
        .from("units")
        .delete()
        .in(
          "id",
          ids
        );

      if (error) {
        throw error;
      }

      /*
       * Remove deleted units from UI.
       */
      setUnits(
        (current) =>
          current.filter(
            (unit) =>
              !selectedUnits.has(
                unit.id
              )
          )
      );

      /*
       * Clear selections.
       */
      setSelectedUnits(
        new Set()
      );

      /*
       * Exit selection mode.
       */
      setSelectionMode(
        false
      );

      setToast({
        msg: `${ids.length} unit${
          ids.length >
          1
            ? "s"
            : ""
        } deleted successfully.`,
        type: "success",
      });
    } catch (error) {
      console.error(
        "Failed to delete selected units:",
        error
      );

      setToast({
        msg:
          error instanceof Error
            ? error.message
            : "Unable to delete selected units. They may be linked to leases, tenants, payments, or maintenance records.",
        type: "error",
      });
    } finally {
      setDeletingSelected(
        false
      );
    }
  }

  /*
   * =====================================================
   * PROPERTY OPTIONS
   * =====================================================
   */

  const propOptions = [
    {
      value: "",
      label:
        "All properties",
    },

    ...properties.map(
      (property) => ({
        value:
          property.id,

        label:
          property.name,
      })
    ),
  ];

  /*
   * =====================================================
   * PAGE
   * =====================================================
   */

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Units"
        subtitle="Manage all your rental units"
        action={
          <div className="flex items-center gap-2">
            {/*
             * SELECT / DELETE BUTTON
             *
             * Initial:
             * Select
             *
             * After clicking:
             * Delete
             */}
            <Button
              variant={
                selectionMode
                  ? "danger"
                  : "secondary"
              }
              size="sm"
              onClick={
                handleSelectDeleteButton
              }
              loading={
                deletingSelected
              }
            >
              {selectionMode
                ? selectedUnits.size >
                  0
                  ? `Delete (${selectedUnits.size})`
                  : "Delete"
                : "Select"}
            </Button>

            {/* Add Unit */}
            <Button
              onClick={openAdd}
              size="sm"
              disabled={
                properties.length ===
                0
              }
            >
              <Plus
                size={16}
              />
              Add Unit
            </Button>
          </div>
        }
      />

      {/* =================================================
          SEARCH + PROPERTY FILTER
          ================================================= */}

      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-500"
          />

          <input
            className="w-full bg-navy-800 border border-navy-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-navy-100 placeholder-navy-500 focus:outline-none focus:ring-2 focus:ring-blue-electric"
            placeholder="Search units..."
            value={
              search
            }
            onChange={(
              event
            ) =>
              setSearch(
                event.target
                  .value
              )
            }
          />
        </div>

        <select
          className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2.5 text-sm text-navy-100 focus:outline-none focus:ring-2 focus:ring-blue-electric min-w-[160px]"
          value={
            filterProp
          }
          onChange={(
            event
          ) =>
            setFilterProp(
              event.target
                .value
            )
          }
        >
          {propOptions.map(
            (option) => (
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
      </div>

      {/* =================================================
          LOADING
          ================================================= */}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[...Array(8)].map(
            (_, index) => (
              <Skeleton
                key={
                  index
                }
                className="h-16"
              />
            )
          )}
        </div>
      ) : filtered.length ===
        0 ? (
        <Card>
          <EmptyState
            icon={
              <DoorOpen
                size={28}
              />
            }
            title="No units found"
            description={
              properties.length ===
              0
                ? "Add a property first, then add units."
                : search ||
                    filterProp
                  ? "No units match your current search or filter."
                  : "Add your first unit."
            }
            action={
              properties.length >
                0 &&
              !search &&
              !filterProp ? (
                <Button
                  onClick={
                    openAdd
                  }
                  size="sm"
                >
                  <Plus
                    size={14}
                  />
                  Add Unit
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        /*
         * =================================================
         * UNIT TABLE
         * =================================================
         */

        <div className="bg-navy-800 border border-navy-700 rounded-xl overflow-hidden">
          <div className="w-full">
            <table className="w-full table-fixed text-[15px] sm:text-sm">
              <thead>
                <tr className="border-b border-navy-700">
                  {/*
                   * Checkbox column appears ONLY
                   * while selection mode is active.
                   */}
                  {selectionMode && (
                    <th className="w-12 px-2 sm:px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={
                          allFilteredSelected
                        }
                        onChange={
                          toggleSelectAll
                        }
                        className="h-4 w-4 accent-blue-500 cursor-pointer"
                        aria-label="Select all visible units"
                      />
                    </th>
                  )}

                  <th className="w-[22%] text-left px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">
                    Unit
                  </th>

                  <th className="hidden md:table-cell text-left px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">
                    Type
                  </th>
                   {/*<th className="text-left px-2 sm:px-4 py-3 text-xs font-semibold text-navy-400 font-display uppercase tracking-wider ">
                    Property
                  </th>*/}

                  <th className="w-[22%] text-right px-2 sm:px-4 py-3 text-[10px] sm:text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">
                    Rent
                  </th>

                  <th className="w-[22%] text-center px-1 sm:px-4 py-3 text-[10px] sm:text-xs font-semibold text-navy-400 font-display uppercase tracking-wider">
                    Status
                  </th>

                  <th className="w-[22%] px-1 sm:px-3 py-3" />
                </tr>
              </thead>

              <tbody>
                {filtered.map(
                  (unit) => {
                    const isSelected =
                      selectedUnits.has(
                        unit.id
                      );

                    return (
                      <tr
                        key={
                          unit.id
                        }
                        className={`border-b border-navy-700/50 transition-colors ${
                          isSelected
                            ? "bg-blue-500/10"
                            : "hover:bg-navy-700/30"
                        }`}
                      >
                        {/*
                         * Checkbox appears ONLY
                         * in selection mode.
                         */}
                        {selectionMode && (
                          <td className="px-2 sm:px-4 py-3">
                            <input
                              type="checkbox"
                              checked={
                                isSelected
                              }
                              onChange={() =>
                                toggleUnitSelection(
                                  unit.id
                                )
                              }
                              className="h-4 w-4 accent-blue-500 cursor-pointer"
                              aria-label={`Select unit ${unit.unit_number}`}
                            />
                          </td>
                        )}

                        {/* Unit */}
                        <td className="px-2 sm:px-4 py-3">
                          <div className="font-semibold text-white">
                            {
                              unit.unit_number
                            }
                          </div>

                          {unit.name && (
                            <div className="text-xs text-navy-500">
                              {
                                unit.name
                              }
                            </div>
                          )}
                          {/*<div className="text-[11px] text-navy-500 mt-1">{unit.tenant_count || 0} tenant{unit.tenant_count === 1 ? "" : "s"}</div>*/}
                        </td>

                        {/* Property */}
                        {/*<td className="px-2 sm:px-4 py-3 text-navy-300">
                          {
                            unit
                              .property
                              ?.name ||
                            "—"
                          }
                        </td>*/}

                        {/* Type */}
                        <td className="px-2 sm:px-4 py-3 text-navy-400 font-mono text-xs hidden md:table-cell">
                          {
                            unit.unit_type ||
                            "—"
                          }
                        </td>

                        {/* Rent */}
                        <td className="px-2 sm:px-4 py-3 text-right font-mono text-emerald-400 font-semibold">
                          ₹
                          {Number(
                            unit.monthly_rent ||
                              0
                          ).toLocaleString(
                            "en-IN"
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-2 sm:px-4 py-3 text-center">
                          <StatusBadge
                            status={
                              unit.status
                            }
                          />
                        </td>

                        {/* Edit */}
                        <td className="px-1 sm:px-3 py-3 text-center">
                          <Button className="px-2 sm:px-3"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              openEdit(
                                unit
                              )
                            }
                            disabled={
                              selectionMode ||
                              deletingSelected
                            }
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================
          ADD / EDIT MODAL
          ================================================= */}

      <Modal
        open={
          showModal
        }
        onClose={
          closeModal
        }
        title={
          editUnit
            ? "Edit Unit"
            : "Add Units"
        }
      >
        <form
          onSubmit={
            handleSubmit
          }
          className="flex flex-col gap-4"
        >
          {/* Property */}
          <Select
            label="Property"
            value={
              form.property_id
            }
            onChange={(
              event
            ) =>
              setForm(
                (
                  current
                ) => ({
                  ...current,
                  property_id:
                    event
                      .target
                      .value,
                })
              )
            }
            options={properties.map(
              (
                property
              ) => ({
                value:
                  property.id,
                label:
                  property.name,
              })
            )}
            required
          />

          {/* =================================================
              ADD MODE
              ================================================= */}

          {!editUnit ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                

                {/* Floor */}
                <Input
                  label="Floor"
                  type="number"
                  className="order-1"
                  min="1"
                  max="10"
                  step="1"
                  inputMode="numeric"
                  placeholder="1 - 10"
                  value={
                    form.floor
                  }
                  onKeyDown={
                    preventNonNumericKeys
                  }
                  onChange={(
                    event
                  ) =>
                    handleNumericChange(
                      "floor",
                      event
                        .target
                        .value
                    )
                  }
                  required
                />
                {/* Number of units */}
                <Input
                  label="No. of Units"
                  type="number"
                  className="order-2"
                  min="1"
                  max="20"
                  step="1"
                  inputMode="numeric"
                  placeholder="1 - 20"
                  value={
                    form.number_of_units
                  }
                  onKeyDown={
                    preventNonNumericKeys
                  }
                  onChange={(
                    event
                  ) =>
                    handleNumericChange(
                      "number_of_units",
                      event
                        .target
                        .value
                    )
                  }
                  required
                />
              </div>
              <Input
                label="Tenants / Unit"
                type="number"
                min="1"
                max="50"
                step="1"
                inputMode="numeric"
                placeholder="How many tenants can live in each unit"
                value={form.tenant_capacity}
                onKeyDown={preventNonNumericKeys}
                onChange={(event) => handleNumericChange("tenant_capacity", event.target.value)}
                required
              />

              {/*<div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
                <p className="text-xs text-blue-300">
                  Unit numbers are
                  generated
                  automatically.
                </p>

                <p className="text-xs text-navy-500 mt-1">
                  Example:
                  Floor 1 with
                  5 units
                  creates 101,
                  102, 103,
                  104 and
                  105.
                </p>
              </div>*/}
            </>
          ) : (
            /*
             * EDIT MODE
             */
            <Input
              label="Unit number"
              value={
                form.unit_number
              }
              readOnly
              className="opacity-70 cursor-not-allowed"
            />
          )}

          <Input
            label="Type"
            placeholder="Enter type"
            value={form.unit_type}
            onChange={(event) => setForm(current => ({ ...current, unit_type: event.target.value }))}
            required
          />

          {/* Rent + Advance */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Monthly rent (₹)"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="15000"
              value={
                form.monthly_rent
              }
              onKeyDown={
                preventNonNumericKeys
              }
              onChange={(
                event
              ) =>
                handleNumericChange(
                  "monthly_rent",
                  event
                    .target
                    .value
                )
              }
              required
            />

            <Input
              label="Advance (₹)"
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              placeholder="50000"
              value={
                form.security_deposit
              }
              onKeyDown={
                preventNonNumericKeys
              }
              onChange={(
                event
              ) =>
                handleNumericChange(
                  "security_deposit",
                  event
                    .target
                    .value
                )
              }
            />
          </div>

          {/* Status */}
          <Select
            label="Status"
            value={
              form.status
            }
            onChange={(
              event
            ) =>
              setForm(
                (
                  current
                ) => ({
                  ...current,
                  status:
                    event
                      .target
                      .value as UnitStatus,
                })
              )
            }
            options={
              UNIT_STATUSES
            }
            required
          />

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={
                closeModal
              }
              disabled={
                submitting
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
              {editUnit
                ? "Update Unit"
                : "Add Unit"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* =================================================
          TOAST
          ================================================= */}

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