"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import TabsShell from "./components/TabsShell";
import TypesTab from "./components/TypesTab";
import CatalogTab from "./components/CatalogTab";
import InventoryTab from "./components/InventoryTab";
import AssignmentsTab from "./components/AssignmentsTab";
import type {
  AccessoryFormState,
  AssignmentFilterState,
  AssignmentFormState,
  CatalogFilterState,
  DropdownFilterState,
  MovementFormState,
  SelectOption,
  TabConfig,
  TabKey,
} from "./types";
import type {
  AccessoryAssignmentSummary,
  AccessoryItemSummary,
  AccessoryOverviewPayload,
} from "@/lib/accessories";

interface TableResponse<T> {
  data: T[];
}

interface HWRow {
  HWID: number;
  HWName: string | null;
}

interface HSRow {
  HSID: number;
  HSName: string | null;
}

interface MODRow {
  ModID: number;
  ModName: string | null;
  ModellNummer: string | null;
}

interface BenutzerRow {
  BenutzerID: number;
  BenutzerName: string | null;
}

interface GERRow {
  GerID: number;
  SNO: string | null;
}

interface HsModRelation {
  HSID: number;
  ModID: number;
  HWID: number | null;
}

const tabs: TabConfig<TabKey>[] = [
  { key: "types", label: "Stammdaten", description: "Zubehör-Typen pflegen" },
  { key: "catalog", label: "Zubehör-Katalog", description: "Zubehör mit Hardware-Bezug verwalten" },
  { key: "inventory", label: "Inventar", description: "Zugänge und Abgänge dokumentieren" },
  { key: "assignments", label: "Zuordnungen", description: "Zubehörnutzungen je Benutzer" },
];

const today = () => new Date().toISOString().split("T")[0];

async function jsonFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Fehler beim Laden der Daten");
  }
  return response.json();
}

export default function AccessoriesManager() {
  const [activeTab, setActiveTab] = useState<TabKey>("types");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  const { data: overview, error, isLoading, isValidating, mutate } = useSWR<AccessoryOverviewPayload>(
    "/api/accessories/overview",
    jsonFetcher,
    { revalidateOnFocus: false },
  );

  const { data: hwTable } = useSWR<TableResponse<HWRow>>("/api/tables/HW", jsonFetcher);
  const { data: hsTable } = useSWR<TableResponse<HSRow>>("/api/tables/HS", jsonFetcher);
  const { data: modTable } = useSWR<TableResponse<MODRow>>("/api/tables/MOD", jsonFetcher);
  const { data: userTable } = useSWR<TableResponse<BenutzerRow>>("/api/tables/Benutzer", jsonFetcher);
  const { data: gerTable } = useSWR<TableResponse<GERRow>>("/api/tables/GER", jsonFetcher);
  const { data: hsModTable } = useSWR<{ data: HsModRelation[] }>("/api/tables/HS_MOD", jsonFetcher);

  const hsModRelations = useMemo<HsModRelation[]>(
    () => (hsModTable?.data ?? []).map((row) => ({
      HSID: Number(row.HSID),
      ModID: Number(row.ModID),
      HWID: row.HWID === null || row.HWID === undefined ? null : Number(row.HWID),
    })),
    [hsModTable?.data],
  );

  const hwOptions = useMemo<SelectOption[]>(
    () =>
      (hwTable?.data ?? []).map((row) => ({
        value: row.HWID,
        label: row.HWName?.trim() || `Hardware ${row.HWID}`,
      })),
    [hwTable?.data],
  );

  const hsOptions = useMemo<SelectOption[]>(
    () =>
      (hsTable?.data ?? []).map((row) => ({
        value: row.HSID,
        label: row.HSName?.trim() || `Hersteller ${row.HSID}`,
      })),
    [hsTable?.data],
  );

  const modOptions = useMemo<SelectOption[]>(
    () =>
      (modTable?.data ?? []).map((row) => ({
        value: row.ModID,
        label: [row.ModName, row.ModellNummer].filter(Boolean).join(" · ") || `Modell ${row.ModID}`,
      })),
    [modTable?.data],
  );

  const userOptions = useMemo<SelectOption[]>(
    () =>
      (userTable?.data ?? []).map((row) => ({
        value: row.BenutzerID,
        label: row.BenutzerName?.trim() || `Benutzer ${row.BenutzerID}`,
      })),
    [userTable?.data],
  );

  const deviceOptions = useMemo<SelectOption[]>(
    () =>
      (gerTable?.data ?? []).map((row) => ({
        value: row.GerID,
        label: row.SNO?.trim() || `Gerät #${row.GerID}`,
      })),
    [gerTable?.data],
  );

  const accessoryOptions = useMemo<SelectOption[]>(
    () =>
      (overview?.accessories ?? []).map((item) => ({
        value: item.id,
        label: item.description?.trim() || `Zubehör #${item.id}`,
      })),
    [overview?.accessories],
  );

  const [newTypeName, setNewTypeName] = useState("");
  const [newAccessory, setNewAccessory] = useState<AccessoryFormState>({
    ZTID: "",
    HWID: "",
    HSID: "",
    ModID: "",
    Beschreibung: "",
  });
  const [movementForm, setMovementForm] = useState<MovementFormState>({
    ZubehoerID: "",
    Menge: "1",
    direction: "IN",
    date: "",
  });
  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>({
    BenutzerID: "",
    ZubehoerID: "",
    GerID: "",
    Start: "",
    Ende: "",
  });
  const [catalogFilters, setCatalogFilters] = useState<CatalogFilterState>({ search: "", type: "" });
  const [dropdownFilters, setDropdownFilters] = useState<DropdownFilterState>({ hwFilter: "", hsFilter: "", modFilter: "" });
  const [assignmentFilters, setAssignmentFilters] = useState<AssignmentFilterState>({ status: "all", search: "" });

  useEffect(() => {
    const currentDate = today();
    setMovementForm((prev: MovementFormState) => (prev.date ? prev : { ...prev, date: currentDate }));
    setAssignmentForm((prev: AssignmentFormState) => (prev.Start ? prev : { ...prev, Start: currentDate }));
  }, []);

  // Ausgewählte IDs aus dem Formular
  const selectedHwId = newAccessory.HWID ? Number(newAccessory.HWID) : null;
  const selectedHsId = newAccessory.HSID ? Number(newAccessory.HSID) : null;
  const selectedModId = newAccessory.ModID ? Number(newAccessory.ModID) : null;

  // Berechne erlaubte IDs basierend auf HS_MOD Relationen
  const relationSets = useMemo(() => {
    const allowedHwIds = new Set<number>();
    const allowedHsIds = new Set<number>();
    const allowedModIds = new Set<number>();

    if (hsModRelations.length === 0) {
      return { allowedHwIds, allowedHsIds, allowedModIds };
    }

    hsModRelations.forEach((rel) => {
      if (
        (!selectedHsId && !selectedModId) ||
        ((!selectedHsId || rel.HSID === selectedHsId) && (!selectedModId || rel.ModID === selectedModId))
      ) {
        if (rel.HWID != null) {
          allowedHwIds.add(rel.HWID);
        }
      }

      if (
        (!selectedHwId && !selectedModId) ||
        ((!selectedHwId || rel.HWID === selectedHwId) && (!selectedModId || rel.ModID === selectedModId))
      ) {
        allowedHsIds.add(rel.HSID);
      }

      if (
        (!selectedHwId && !selectedHsId) ||
        ((!selectedHwId || rel.HWID === selectedHwId) && (!selectedHsId || rel.HSID === selectedHsId))
      ) {
        allowedModIds.add(rel.ModID);
      }
    });

    return { allowedHwIds, allowedHsIds, allowedModIds };
  }, [hsModRelations, selectedHwId, selectedHsId, selectedModId]);

  const canFilterByRelations = hsModRelations.length > 0;
  const shouldRestrictHw = canFilterByRelations && (selectedHsId != null || selectedModId != null);
  const shouldRestrictHs = canFilterByRelations && (selectedHwId != null || selectedModId != null);
  const shouldRestrictMod = canFilterByRelations && (selectedHwId != null || selectedHsId != null);

  const optionMatchesSearch = (label: string, value: number, term: string) => {
    if (!term) return true;
    const lower = term.toLowerCase();
    return label.toLowerCase().includes(lower) || String(value).includes(lower);
  };

  const filteredHwOptions = useMemo<SelectOption[]>(() => {
    return hwOptions.filter((o) => {
      if (!optionMatchesSearch(o.label, o.value, dropdownFilters.hwFilter)) {
        return false;
      }
      if (!shouldRestrictHw) {
        return true;
      }
      if (relationSets.allowedHwIds.size === 0) {
        return false;
      }
      return relationSets.allowedHwIds.has(o.value);
    });
  }, [hwOptions, dropdownFilters.hwFilter, shouldRestrictHw, relationSets.allowedHwIds]);

  const filteredHsOptions = useMemo<SelectOption[]>(() => {
    return hsOptions.filter((o) => {
      if (!optionMatchesSearch(o.label, o.value, dropdownFilters.hsFilter)) {
        return false;
      }
      if (!shouldRestrictHs) {
        return true;
      }
      if (relationSets.allowedHsIds.size === 0) {
        return false;
      }
      return relationSets.allowedHsIds.has(o.value);
    });
  }, [hsOptions, dropdownFilters.hsFilter, shouldRestrictHs, relationSets.allowedHsIds]);

  const filteredModOptions = useMemo<SelectOption[]>(() => {
    return modOptions.filter((o) => {
      if (!optionMatchesSearch(o.label, o.value, dropdownFilters.modFilter)) {
        return false;
      }
      if (!shouldRestrictMod) {
        return true;
      }
      if (relationSets.allowedModIds.size === 0) {
        return false;
      }
      return relationSets.allowedModIds.has(o.value);
    });
  }, [modOptions, dropdownFilters.modFilter, shouldRestrictMod, relationSets.allowedModIds]);

  const filteredAccessories = useMemo<AccessoryItemSummary[]>(() => {
    const list = overview?.accessories ?? [];
    const searchTerm = catalogFilters.search.trim().toLowerCase();
    return list.filter((item) => {
      const matchesType = catalogFilters.type ? item.type.id === Number(catalogFilters.type) : true;
      const matchesSearch = searchTerm
        ? [
            item.description,
            item.type.name,
            item.hardware.name,
            item.manufacturer.name,
            item.model.name,
            item.model.modellNummer,
          ]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(searchTerm))
        : true;
      return matchesType && matchesSearch;
    });
  }, [overview?.accessories, catalogFilters]);

  const filteredAssignments = useMemo<AccessoryAssignmentSummary[]>(() => {
    const list = overview?.assignments ?? [];
    const searchTerm = assignmentFilters.search.trim().toLowerCase();
    return list.filter((assignment) => {
      const matchesStatus =
        assignmentFilters.status === "all"
          ? true
          : assignmentFilters.status === "active"
            ? assignment.status === "ACTIVE"
            : assignment.status === "RETURNED";
      const matchesSearch = searchTerm
        ? [assignment.accessoryLabel, assignment.userName].some((value) =>
            value.toLowerCase().includes(searchTerm),
          )
        : true;
      return matchesStatus && matchesSearch;
    });
  }, [overview?.assignments, assignmentFilters]);

  const resetFeedback = () => {
    setGlobalError(null);
    setGlobalSuccess(null);
  };

  const handleAccessoryFormChange = (field: keyof AccessoryFormState, value: string) => {
    setNewAccessory((prev) => ({ ...prev, [field]: value }));
  };

  const handleCatalogFilterChange = (field: keyof CatalogFilterState, value: string) => {
    setCatalogFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleDropdownFilterChange = (field: keyof DropdownFilterState, value: string) => {
    setDropdownFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleMovementFormChange = (field: keyof MovementFormState, value: string) => {
    setMovementForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAssignmentFormChange = (field: keyof AssignmentFormState, value: string) => {
    setAssignmentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAssignmentFilterChange = (field: keyof AssignmentFilterState, value: string) => {
    setAssignmentFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApiCall = async (input: RequestInfo | URL, init: RequestInit, successMessage?: string) => {
    resetFeedback();
    const response = await fetch(input, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...init,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || payload?.details || "Aktion fehlgeschlagen");
    }
    if (successMessage) {
      setGlobalSuccess(successMessage);
    }
    await mutate();
    return payload;
  };

  const handleCreateType = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTypeName.trim()) return;
    try {
      await handleApiCall(
        "/api/tables/ZT",
        { method: "POST", body: JSON.stringify({ ZTName: newTypeName.trim() }) },
        "Zubehör-Typ erstellt",
      );
      setNewTypeName("");
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Aktion fehlgeschlagen");
    }
  };

  const handleCreateAccessory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await handleApiCall(
        "/api/tables/Zubehoer",
        {
          method: "POST",
          body: JSON.stringify({
            ZTID: Number(newAccessory.ZTID),
            HWID: Number(newAccessory.HWID),
            HSID: Number(newAccessory.HSID),
            ModID: Number(newAccessory.ModID),
            Beschreibung: newAccessory.Beschreibung.trim() || null,
          }),
        },
        "Zubehör angelegt",
      );
      setNewAccessory({ ZTID: "", HWID: "", HSID: "", ModID: "", Beschreibung: "" });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Aktion fehlgeschlagen");
    }
  };

  const handleInventoryMovement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await handleApiCall(
        "/api/tables/ZubehoerInventar",
        {
          method: "POST",
          body: JSON.stringify({
            ZubehoerID: Number(movementForm.ZubehoerID),
            Menge: Number(movementForm.Menge),
            Zugang: movementForm.direction === "IN" ? movementForm.date : null,
            Abgang: movementForm.direction === "OUT" ? movementForm.date : null,
          }),
        },
        movementForm.direction === "IN" ? "Zugang gebucht" : "Abgang gebucht",
      );
      setMovementForm((prev) => ({ ...prev, Menge: "1" }));
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Aktion fehlgeschlagen");
    }
  };

  const handleAssignment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assignmentForm.BenutzerID && !assignmentForm.GerID) {
      setGlobalError("Bitte wähle mindestens einen Benutzer oder ein Gerät aus.");
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        ZubehoerID: Number(assignmentForm.ZubehoerID),
        GerID: assignmentForm.GerID ? Number(assignmentForm.GerID) : null,
        Start: assignmentForm.Start,
        Ende: assignmentForm.Ende || null,
      };

      if (assignmentForm.BenutzerID) {
        payload.BenutzerID = assignmentForm.BenutzerID;
      }

      await handleApiCall(
        "/api/relations/accessory-users",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
        "Zuordnung erstellt",
      );
      setAssignmentForm({ BenutzerID: "", ZubehoerID: "", GerID: "", Start: today(), Ende: "" });
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Aktion fehlgeschlagen");
    }
  };

  const handleAssignmentReturn = async (assignment: AccessoryAssignmentSummary) => {
    try {
      await handleApiCall(
        `/api/relations/accessory-users/${assignment.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ Ende: today() }),
        },
        "Zuordnung beendet",
      );
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Aktion fehlgeschlagen");
    }
  };

  const renderGlobalFeedback = () => (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Übersicht konnte nicht geladen werden: {error.message}
        </div>
      )}
      {globalError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{globalError}</div>
      )}
      {globalSuccess && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {globalSuccess}
        </div>
      )}
    </div>
  );

  return (
    <TabsShell tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} isLoading={isLoading || isValidating}>
      {renderGlobalFeedback()}

      {activeTab === "types" && (
        <TypesTab
          types={overview?.types ?? []}
          newTypeName={newTypeName}
          onTypeNameChange={setNewTypeName}
          onCreateType={handleCreateType}
        />
      )}

      {activeTab === "catalog" && (
        <CatalogTab
          items={filteredAccessories}
          types={overview?.types ?? []}
          form={newAccessory}
          filters={catalogFilters}
          dropdownFilters={dropdownFilters}
          hwOptions={filteredHwOptions}
          hsOptions={filteredHsOptions}
          modOptions={filteredModOptions}
          onFormChange={handleAccessoryFormChange}
          onFiltersChange={handleCatalogFilterChange}
          onDropdownFilterChange={handleDropdownFilterChange}
          onSubmit={handleCreateAccessory}
        />
      )}

      {activeTab === "inventory" && (
        <InventoryTab
          accessoryOptions={accessoryOptions}
          movements={overview?.inventoryMovements ?? []}
          form={movementForm}
          onFormChange={handleMovementFormChange}
          onSubmit={handleInventoryMovement}
        />
      )}

      {activeTab === "assignments" && (
        <AssignmentsTab
          assignments={filteredAssignments}
          accessoryOptions={accessoryOptions}
          userOptions={userOptions}
          deviceOptions={deviceOptions}
          form={assignmentForm}
          filters={assignmentFilters}
          onFormChange={handleAssignmentFormChange}
          onFiltersChange={handleAssignmentFilterChange}
          onSubmit={handleAssignment}
          onReturn={handleAssignmentReturn}
        />
      )}
    </TabsShell>
  );
}
