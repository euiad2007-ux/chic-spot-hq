import { useSyncExternalStore } from "react";

/* -------- Types -------- */
export type CustomerGender = "female" | "male";
export type CustomerStatus = "active" | "vip" | "inactive" | "blocked";

export interface WalletTx {
  id: string;
  type: "topup" | "charge" | "refund" | "adjust";
  amount: number;          // positive number
  note: string;
  at: number;              // timestamp
}

export interface VisitLog {
  id: string;
  date: string;            // yyyy-mm-dd
  service: string;
  amount: number;
  staffName: string;
  note: string;
  at: number;
}

export interface Customer {
  id: string;
  // Personal
  name: string;
  gender: CustomerGender;
  phone: string;
  email: string;
  birthDate: string;       // yyyy-mm-dd
  address: string;
  photoUrl: string;
  // Account
  code: string;            // customer number/code
  status: CustomerStatus;
  joinDate: string;        // yyyy-mm-dd
  notes: string;
  tags: string[];
  // Wallet
  walletBalance: number;
  walletTx: WalletTx[];
  // Loyalty
  points: number;
  // Visits (used for stats)
  visits: VisitLog[];
  // Meta
  createdAt: number;
  updatedAt: number;
}

/* -------- Store -------- */
const KEY = "lamsa_customers_v1";
const DEFAULT: Customer[] = [];

let state: Customer[] = DEFAULT;
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
    console.error("customer-store: failed to load", err);
  }
}

function persist() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.error("customer-store: failed to persist", err);
    }
  }
  listeners.forEach((l) => {
    try { l(); } catch (err) { console.error(err); }
  });
}

export function useCustomers(): Customer[] {
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
  const nums = state
    .map((c) => Number((c.code || "").replace(/[^0-9]/g, "")))
    .filter((n) => !Number.isNaN(n) && n > 0);
  const max = nums.length ? Math.max(...nums) : 0;
  return `C-${String(max + 1).padStart(4, "0")}`;
}

function emptyCustomer(): Customer {
  const now = Date.now();
  return {
    id: uid(),
    name: "",
    gender: "female",
    phone: "",
    email: "",
    birthDate: "",
    address: "",
    photoUrl: "",
    code: nextCode(),
    status: "active",
    joinDate: new Date().toISOString().slice(0, 10),
    notes: "",
    tags: [],
    walletBalance: 0,
    walletTx: [],
    points: 0,
    visits: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const customerActions = {
  empty: emptyCustomer,
  create(partial: Partial<Customer> = {}): Customer {
    const rec: Customer = {
      ...emptyCustomer(),
      ...partial,
      id: uid(),
      code: partial.code || nextCode(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    state = [...state, rec];
    persist();
    return rec;
  },
  update(id: string, patch: Partial<Customer>) {
    state = state.map((c) =>
      c.id === id ? { ...c, ...patch, id: c.id, updatedAt: Date.now() } : c,
    );
    persist();
  },
  remove(id: string) {
    state = state.filter((c) => c.id !== id);
    persist();
  },
  /* Wallet */
  walletTopup(id: string, amount: number, note = "") {
    if (!(amount > 0)) return;
    const tx: WalletTx = { id: uid(), type: "topup", amount, note, at: Date.now() };
    state = state.map((c) =>
      c.id === id
        ? { ...c, walletBalance: c.walletBalance + amount, walletTx: [tx, ...c.walletTx], updatedAt: Date.now() }
        : c,
    );
    persist();
  },
  walletCharge(id: string, amount: number, note = "") {
    if (!(amount > 0)) return;
    const tx: WalletTx = { id: uid(), type: "charge", amount, note, at: Date.now() };
    state = state.map((c) =>
      c.id === id
        ? { ...c, walletBalance: c.walletBalance - amount, walletTx: [tx, ...c.walletTx], updatedAt: Date.now() }
        : c,
    );
    persist();
  },
  walletAdjust(id: string, delta: number, note = "") {
    if (!delta) return;
    const tx: WalletTx = {
      id: uid(),
      type: delta > 0 ? "refund" : "adjust",
      amount: Math.abs(delta),
      note,
      at: Date.now(),
    };
    state = state.map((c) =>
      c.id === id
        ? { ...c, walletBalance: c.walletBalance + delta, walletTx: [tx, ...c.walletTx], updatedAt: Date.now() }
        : c,
    );
    persist();
  },
  removeWalletTx(id: string, txId: string) {
    state = state.map((c) => {
      if (c.id !== id) return c;
      const tx = c.walletTx.find((t) => t.id === txId);
      if (!tx) return c;
      const sign = tx.type === "topup" || tx.type === "refund" ? -1 : 1;
      // reverse effect
      const delta = sign * tx.amount;
      return {
        ...c,
        walletBalance: c.walletBalance + delta,
        walletTx: c.walletTx.filter((t) => t.id !== txId),
        updatedAt: Date.now(),
      };
    });
    persist();
  },
  /* Visits */
  addVisit(id: string, visit: Omit<VisitLog, "id" | "at">) {
    const v: VisitLog = { ...visit, id: uid(), at: Date.now() };
    state = state.map((c) =>
      c.id === id ? { ...c, visits: [v, ...c.visits], updatedAt: Date.now() } : c,
    );
    persist();
  },
  removeVisit(id: string, visitId: string) {
    state = state.map((c) =>
      c.id === id ? { ...c, visits: c.visits.filter((v) => v.id !== visitId), updatedAt: Date.now() } : c,
    );
    persist();
  },
  /* Points */
  addPoints(id: string, delta: number) {
    state = state.map((c) =>
      c.id === id ? { ...c, points: Math.max(0, c.points + delta), updatedAt: Date.now() } : c,
    );
    persist();
  },
};

/* -------- Derived stats -------- */
export function customerStats(c: Customer) {
  const totalSpent = c.visits.reduce((s, v) => s + (Number(v.amount) || 0), 0);
  const visitsCount = c.visits.length;
  const avgTicket = visitsCount > 0 ? totalSpent / visitsCount : 0;
  const lastVisit = c.visits[0]?.date || "";
  const now = Date.now();
  const monthAgo = now - 30 * 86400_000;
  const last30 = c.visits.filter((v) => v.at >= monthAgo);
  const spent30 = last30.reduce((s, v) => s + (Number(v.amount) || 0), 0);
  return { totalSpent, visitsCount, avgTicket, lastVisit, visits30: last30.length, spent30 };
}

export const STATUS_LABELS: Record<CustomerStatus, string> = {
  active: "نشط",
  vip: "VIP",
  inactive: "غير نشط",
  blocked: "محظور",
};

export const STATUS_STYLES: Record<CustomerStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  vip: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  inactive: "bg-muted text-muted-foreground border-border",
  blocked: "bg-rose-500/15 text-rose-600 border-rose-500/30",
};
