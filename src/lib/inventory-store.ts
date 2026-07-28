import { useSyncExternalStore } from "react";

/* -------- Types -------- */
export interface InventoryCategory {
  id: string;
  name: string;
}

export interface StockMovement {
  id: string;
  type: "in" | "out" | "adjust" | "sale";
  qty: number; // in base units (small units)
  note: string;
  at: number;
  ref?: string; // e.g. invoice number
}

export interface InventoryItem {
  id: string;
  code: string; // auto number e.g. P-0001
  categoryId: string;
  name: string;
  description: string;
  // Packaging
  unit: string; // e.g. "علبة", "زجاجة"
  packQty: number; // quantity per pack
  smallUnit: string; // e.g. "مل", "جم"
  // Stock (in packs)
  quantity: number; // number of packs in stock
  // Pricing
  unitPrice: number; // price per pack (cost)
  // Alerts
  lowStockThreshold: number; // in packs
  // History
  movements: StockMovement[];
  createdAt: number;
  updatedAt: number;
}

export interface InventorySettings {
  alertsEnabled: boolean;
  defaultThreshold: number;
  notifyPhone: string;
}

interface InventoryState {
  categories: InventoryCategory[];
  items: InventoryItem[];
  settings: InventorySettings;
  counter: number; // for auto code
}

/* -------- Defaults -------- */
const KEY = "lamsa_inventory_v1";

const DEFAULT_CATEGORIES: InventoryCategory[] = [
  { id: "cat_store", name: "قسم المتجر" },
  { id: "cat_clean", name: "قسم النظافة" },
  { id: "cat_hair", name: "العناية بالشعر" },
  { id: "cat_nails", name: "العناية بالأظافر" },
  { id: "cat_body", name: "العناية بالجسم" },
];

const DEFAULT_SETTINGS: InventorySettings = {
  alertsEnabled: true,
  defaultThreshold: 5,
  notifyPhone: "",
};

const DEFAULT: InventoryState = {
  categories: DEFAULT_CATEGORIES,
  items: [],
  settings: DEFAULT_SETTINGS,
  counter: 0,
};

/* -------- Store -------- */
let state: InventoryState = DEFAULT;
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
      state = {
        categories: Array.isArray(parsed?.categories) && parsed.categories.length
          ? parsed.categories
          : DEFAULT_CATEGORIES,
        items: Array.isArray(parsed?.items) ? parsed.items : [],
        settings: { ...DEFAULT_SETTINGS, ...(parsed?.settings || {}) },
        counter: Number(parsed?.counter) || 0,
      };
    }
  } catch (err) {
    console.error("inventory-store: load failed", err);
  }
}

function persist() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.error("inventory-store: persist failed", err);
    }
  }
  listeners.forEach((l) => {
    try { l(); } catch (err) { console.error(err); }
  });
}

function subscribe(l: () => void) {
  ensure();
  listeners.add(l);
  if (!hydrated) {
    hydrated = true;
    queueMicrotask(() => listeners.forEach((x) => x()));
  }
  return () => listeners.delete(l);
}

export function useInventory(): InventoryState {
  return useSyncExternalStore(
    subscribe,
    () => (hydrated ? state : DEFAULT),
    () => DEFAULT,
  );
}

function uid() {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {}
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function nextCode(): string {
  state.counter = (state.counter || 0) + 1;
  return `P-${String(state.counter).padStart(4, "0")}`;
}

/* -------- Derived helpers -------- */
export function costPerSmallUnit(item: InventoryItem): number {
  const total = item.packQty * (item.quantity > 0 ? 1 : 1); // per single pack
  const smallUnits = item.packQty || 1;
  if (smallUnits <= 0) return 0;
  return (item.unitPrice || 0) / smallUnits;
}

export function totalValue(item: InventoryItem): number {
  return (item.quantity || 0) * (item.unitPrice || 0);
}

export function totalSmallUnits(item: InventoryItem): number {
  return (item.quantity || 0) * (item.packQty || 0);
}

export function isLowStock(item: InventoryItem, settings: InventorySettings): boolean {
  if (!settings.alertsEnabled) return false;
  const th = item.lowStockThreshold > 0 ? item.lowStockThreshold : settings.defaultThreshold;
  return item.quantity <= th;
}

/* -------- Actions -------- */
export const inventoryActions = {
  /* Categories */
  addCategory(name: string) {
    const n = name.trim();
    if (!n) return;
    if (state.categories.some((c) => c.name === n)) return;
    state = { ...state, categories: [...state.categories, { id: uid(), name: n }] };
    persist();
  },
  updateCategory(id: string, name: string) {
    state = {
      ...state,
      categories: state.categories.map((c) => (c.id === id ? { ...c, name } : c)),
    };
    persist();
  },
  removeCategory(id: string) {
    state = {
      ...state,
      categories: state.categories.filter((c) => c.id !== id),
      items: state.items.map((i) => (i.categoryId === id ? { ...i, categoryId: "" } : i)),
    };
    persist();
  },

  /* Settings */
  updateSettings(patch: Partial<InventorySettings>) {
    state = { ...state, settings: { ...state.settings, ...patch } };
    persist();
  },

  /* Items */
  emptyItem(categoryId = ""): InventoryItem {
    const now = Date.now();
    return {
      id: uid(),
      code: "",
      categoryId,
      name: "",
      description: "",
      unit: "علبة",
      packQty: 1,
      smallUnit: "مل",
      quantity: 0,
      unitPrice: 0,
      lowStockThreshold: 0,
      movements: [],
      createdAt: now,
      updatedAt: now,
    };
  },
  createItem(partial: Partial<InventoryItem>): InventoryItem {
    const base = inventoryActions.emptyItem(partial.categoryId || "");
    const rec: InventoryItem = {
      ...base,
      ...partial,
      id: uid(),
      code: partial.code || nextCode(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state = { ...state, items: [...state.items, rec] };
    persist();
    return rec;
  },
  updateItem(id: string, patch: Partial<InventoryItem>) {
    state = {
      ...state,
      items: state.items.map((i) => (i.id === id ? { ...i, ...patch, id: i.id, updatedAt: Date.now() } : i)),
    };
    persist();
  },
  removeItem(id: string) {
    state = { ...state, items: state.items.filter((i) => i.id !== id) };
    persist();
  },

  /* Stock movements */
  stockIn(id: string, packs: number, note = "") {
    if (!(packs > 0)) return;
    state = {
      ...state,
      items: state.items.map((i) =>
        i.id === id
          ? {
              ...i,
              quantity: i.quantity + packs,
              updatedAt: Date.now(),
              movements: [
                { id: uid(), type: "in", qty: packs * i.packQty, note, at: Date.now() },
                ...i.movements,
              ],
            }
          : i,
      ),
    };
    persist();
  },
  stockOut(id: string, packs: number, note = "") {
    if (!(packs > 0)) return;
    state = {
      ...state,
      items: state.items.map((i) =>
        i.id === id
          ? {
              ...i,
              quantity: Math.max(0, i.quantity - packs),
              updatedAt: Date.now(),
              movements: [
                { id: uid(), type: "out", qty: packs * i.packQty, note, at: Date.now() },
                ...i.movements,
              ],
            }
          : i,
      ),
    };
    persist();
  },
  /** Deduct small units (e.g. from a customer invoice/service). */
  deductSmallUnits(id: string, smallUnits: number, ref = "") {
    if (!(smallUnits > 0)) return;
    state = {
      ...state,
      items: state.items.map((i) => {
        if (i.id !== id) return i;
        const perPack = i.packQty || 1;
        const totalSmall = i.quantity * perPack - smallUnits;
        const remainingPacks = Math.max(0, totalSmall / perPack);
        return {
          ...i,
          quantity: remainingPacks,
          updatedAt: Date.now(),
          movements: [
            { id: uid(), type: "sale", qty: smallUnits, note: "خصم فاتورة", at: Date.now(), ref },
            ...i.movements,
          ],
        };
      }),
    };
    persist();
  },
  /** Physical stock count update (adjust). */
  adjustQuantity(id: string, newPackQuantity: number, note = "جرد") {
    state = {
      ...state,
      items: state.items.map((i) => {
        if (i.id !== id) return i;
        const diff = newPackQuantity - i.quantity;
        return {
          ...i,
          quantity: Math.max(0, newPackQuantity),
          updatedAt: Date.now(),
          movements: [
            {
              id: uid(),
              type: "adjust",
              qty: Math.abs(diff) * (i.packQty || 1),
              note: `${note} (${diff >= 0 ? "+" : ""}${diff})`,
              at: Date.now(),
            },
            ...i.movements,
          ],
        };
      }),
    };
    persist();
  },
};

/* -------- Common units -------- */
export const COMMON_UNITS = ["علبة", "زجاجة", "أنبوب", "كيس", "قطعة", "كرتون", "عبوة"];
export const COMMON_SMALL_UNITS = ["مل", "جم", "كجم", "قطعة", "لتر", "مل جم"];
