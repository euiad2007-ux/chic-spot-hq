import { useSyncExternalStore } from "react";
import type { InventoryItem } from "./inventory-store";
import { costPerSmallUnit } from "./inventory-store";

/* -------- Types -------- */
export type MaterialUnitType = "large" | "small";

export interface ServiceMaterial {
  id: string;
  itemId: string;          // inventory item id
  unitType: MaterialUnitType; // large (pack) or small (base unit)
  qty: number;
}

export type PriceMode = "auto" | "manual";
export type ProfitMode = "pct" | "amount";

export interface Service {
  id: string;
  name: string;
  description: string;
  materials: ServiceMaterial[];
  /** Percentages applied over materials cost as overhead. */
  vatPct: number;           // نسبة الهاك (ضريبة)
  storePct: number;         // نسبة المتجر
  servicePct: number;       // نسبة الخدمات
  staffSalaryPct: number;   // نسبة راتب الموظف
  profitMode: ProfitMode;
  profitValue: number;
  priceMode: PriceMode;
  manualPrice: number;
  staffIds: string[];       // qualified staff
  createdAt: number;
  updatedAt: number;
}

/* -------- Store -------- */
const KEY = "lamsa_services_v1";
let state: Service[] = [];
let initialized = false;
let hydrated = false;
const listeners = new Set<() => void>();

function ensure() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) state = parsed;
    }
  } catch (err) {
    console.error("services-store: load failed", err);
  }
}

function persist() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.error("services-store: persist failed", err);
    }
  }
  listeners.forEach((l) => { try { l(); } catch (err) { console.error(err); } });
}

export function useServices(): Service[] {
  return useSyncExternalStore(
    (l) => {
      ensure();
      listeners.add(l);
      if (!hydrated) {
        hydrated = true;
        queueMicrotask(() => listeners.forEach((x) => x()));
      }
      return () => listeners.delete(l);
    },
    () => (hydrated ? state : []),
    () => [],
  );
}

function uid() {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {}
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyService(): Service {
  const now = Date.now();
  return {
    id: uid(),
    name: "",
    description: "",
    materials: [],
    vatPct: 15,
    storePct: 0,
    servicePct: 0,
    staffSalaryPct: 0,
    profitMode: "pct",
    profitValue: 30,
    priceMode: "auto",
    manualPrice: 0,
    staffIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const servicesActions = {
  empty: emptyService,
  create(partial: Partial<Service> = {}): Service {
    const rec: Service = { ...emptyService(), ...partial, id: uid(), createdAt: Date.now(), updatedAt: Date.now() };
    state = [...state, rec];
    persist();
    return rec;
  },
  update(id: string, patch: Partial<Service>) {
    state = state.map((s) => (s.id === id ? { ...s, ...patch, id: s.id, updatedAt: Date.now() } : s));
    persist();
  },
  remove(id: string) {
    state = state.filter((s) => s.id !== id);
    persist();
  },
};

/* -------- Cost calculations -------- */
export function materialLineCost(m: ServiceMaterial, item: InventoryItem | undefined): number {
  if (!item) return 0;
  const qty = Number(m.qty) || 0;
  if (m.unitType === "large") return qty * (item.unitPrice || 0);
  return qty * costPerSmallUnit(item);
}

export interface ServiceCosts {
  materialsCost: number;
  vatCost: number;
  storeCost: number;
  serviceCost: number;
  staffCost: number;
  totalCosts: number;
  profitAmount: number;
  autoPrice: number;
  finalPrice: number;
}

export function computeServiceCosts(
  svc: Service,
  itemsById: Map<string, InventoryItem>,
): ServiceCosts {
  const materialsCost = svc.materials.reduce(
    (sum, m) => sum + materialLineCost(m, itemsById.get(m.itemId)),
    0,
  );
  const vatCost = materialsCost * (svc.vatPct || 0) / 100;
  const storeCost = materialsCost * (svc.storePct || 0) / 100;
  const serviceCost = materialsCost * (svc.servicePct || 0) / 100;
  const staffCost = materialsCost * (svc.staffSalaryPct || 0) / 100;
  const totalCosts = materialsCost + vatCost + storeCost + serviceCost + staffCost;
  const profitAmount =
    svc.profitMode === "pct"
      ? totalCosts * (svc.profitValue || 0) / 100
      : (svc.profitValue || 0);
  const autoPrice = totalCosts + profitAmount;
  const finalPrice = svc.priceMode === "manual" ? (svc.manualPrice || 0) : autoPrice;
  return { materialsCost, vatCost, storeCost, serviceCost, staffCost, totalCosts, profitAmount, autoPrice, finalPrice };
}
