export interface SelectOption {
  value: number;
  label: string;
}

export interface TabConfig<T extends string> {
  key: T;
  label: string;
  description: string;
}

export interface AccessoryFormState {
  ZTID: string;
  HWID: string;
  HSID: string;
  ModID: string;
  Beschreibung: string;
}

export interface MovementFormState {
  ZTID: string;
  Menge: string;
  direction: "IN" | "OUT";
  date: string;
}

export interface AssignmentFormState {
  BenutzerID: string;
  ZubehoerID: string;
  GerID: string;
  Start: string;
  Ende: string;
}

export interface CatalogFilterState {
  search: string;
  type: string;
}

export interface DropdownFilterState {
  typeFilter?: string;
  hwFilter: string;
  hsFilter: string;
  modFilter: string;
}

export interface AssignmentFilterState {
  status: "all" | "active" | "returned";
  search: string;
}

export type TabKey = "types" | "catalog" | "inventory" | "assignments";
