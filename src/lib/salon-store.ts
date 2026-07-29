import { useSyncExternalStore } from "react";

export type BookingStatus =
  | "new"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "no_show"
  | "cancelled";

export type PayStatus = "unpaid" | "partial" | "paid";

export interface ServiceMaterial {
  itemId: string;
  qty: number;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMin: number;
  prepMin: number;
  cleanupMin: number;
  materials: ServiceMaterial[];
  active: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;          // package label (e.g. "قنينة", "علبة", "أنبوب")
  stock: number;         // number of packages available
  minStock: number;
  costPerUnit: number;   // price per package
  measure: string;       // base measure code: "count" | "g" | "mg" | "ml" | "l" | custom
  sizePerUnit: number;   // how many base units per one package
}

export const DEFAULT_MEASURES: { code: string; label: string }[] = [
  { code: "count", label: "عدد" },
  { code: "g", label: "جرام" },
  { code: "mg", label: "ملي جرام" },
  { code: "ml", label: "ملليلتر" },
  { code: "l", label: "لتر" },
  { code: "cm", label: "سنتيمتر" },
];

const MEASURES_KEY = "lamsa_custom_measures_v1";
export function loadMeasures(): { code: string; label: string }[] {
  if (typeof window === "undefined") return DEFAULT_MEASURES;
  try {
    const raw = localStorage.getItem(MEASURES_KEY);
    const custom = raw ? (JSON.parse(raw) as { code: string; label: string }[]) : [];
    const seen = new Set(DEFAULT_MEASURES.map((m) => m.code));
    return [...DEFAULT_MEASURES, ...custom.filter((c) => c.code && !seen.has(c.code))];
  } catch { return DEFAULT_MEASURES; }
}
export function addCustomMeasure(m: { code: string; label: string }) {
  if (typeof window === "undefined") return;
  const cur = loadMeasures();
  if (cur.find((x) => x.code === m.code)) return;
  const custom = cur.filter((x) => !DEFAULT_MEASURES.find((d) => d.code === x.code));
  localStorage.setItem(MEASURES_KEY, JSON.stringify([...custom, m]));
}
export function measureLabel(code: string) {
  return loadMeasures().find((m) => m.code === code)?.label ?? code;
}


export interface StaffAllowance {
  id: string;
  label: string;
  amount: number;
}
export interface StaffNote {
  id: string;
  text: string;
  at: string;
}
export interface StaffPointLog {
  id: string;
  delta: number;
  reason: string;
  at: string;
}
export interface StaffLeave {
  id: string;
  from: string;      // YYYY-MM-DD
  to: string;        // YYYY-MM-DD
  days: number;
  reason?: string;
  at: string;
}
export interface Staff {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  hireDate?: string;
  commissionPct: number;
  salary?: number;
  allowances?: StaffAllowance[];
  notes?: StaffNote[];
  points?: number;
  pointsLog?: StaffPointLog[];
  services: string[];
  active: boolean;
  // Personal (optional, backward compatible)
  gender?: "female" | "male";
  nationalId?: string;
  birthDate?: string;
  nationality?: string;
  address?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  jobTitle?: string;
  contractType?: "full_time" | "part_time" | "contract";
  // Leaves
  annualLeaveDays?: number;   // yearly entitlement
  leaves?: StaffLeave[];
}

export interface LoyaltyLog {
  id: string;
  delta: number;      // + earned, - redeemed
  reason: string;
  at: string;
}
export interface WalletLog {
  id: string;
  delta: number;      // + top-up/refund, - deduction
  reason: string;
  at: string;
}
export interface Customer {
  id: string;
  name: string;
  phone: string;
  gender?: "female" | "male";
  notes?: string;
  visits: number;
  totalSpent: number;
  createdAt: string;
  // Personal
  birthDate?: string;
  address?: string;
  email?: string;
  // Wallet & loyalty
  walletBalance?: number;
  walletLog?: WalletLog[];
  loyaltyPoints?: number;
  loyaltyLog?: LoyaltyLog[];
  // Referral marketing
  referralCode?: string;
  referredBy?: string;         // referral code that referred this customer
  referralEarnings?: number;   // total SAR earned from referrals
}

// Loyalty & referral defaults (can be adjusted later via settings)
export const LOYALTY_RATE = 0.1;         // points per SAR spent
export const LOYALTY_REDEEM_RATE = 1;    // SAR value per point when redeemed
export const REFERRAL_COMMISSION_PCT = 5; // % of invoice total awarded to referrer's wallet

function genReferralCode(name: string) {
  const base = (name || "REF").replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3).toUpperCase() || "REF";
  const n = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}${n}`;
}


export interface Booking {
  id: string;
  code: string;              // "GLOBAL-BRANCH-DAILY" e.g. "000125-000042-0001"
  globalNo: number;
  branchNo: number;
  dailyNo: number;
  bookingDate: string;       // "YYYY-MM-DD"
  serviceQueue: Record<string, number>; // per-service daily queue number
  customerId: string;
  staffId: string;
  serviceIds: string[];
  startsAt: string;
  durationMin: number;
  price: number;
  discount: number;
  status: BookingStatus;
  payStatus: PayStatus;
  notes?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  number: string;
  bookingId: string;
  customerId: string;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  paid: number;
  method: "cash" | "mada" | "card" | "apple_pay" | "transfer";
  createdAt: string;
}

export interface BookingCounters {
  global: number;
  branch: number;
  byDay: Record<string, number>;
  byServiceDay: Record<string, number>;
}

export interface SalonState {
  services: Service[];
  staff: Staff[];
  customers: Customer[];
  bookings: Booking[];
  invoices: Invoice[];
  inventory: InventoryItem[];
  counters: BookingCounters;
}

const STORAGE_KEY = "lamsa_salon_v2";

const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): SalonState {
  const mkItem = (
    name: string, unit: string, stock: number, minStock: number, costPerUnit: number,
    measure: string, sizePerUnit: number,
  ): InventoryItem => ({ id: uid(), name, unit, stock, minStock, costPerUnit, measure, sizePerUnit });
  const inventory: InventoryItem[] = [
    mkItem("صبغة شعر", "أنبوب", 30, 8, 25, "ml", 60),
    mkItem("شامبو احترافي", "قنينة", 10, 2, 40, "ml", 500),
    mkItem("بلسم", "قنينة", 8, 2, 32, "ml", 500),
    mkItem("طلاء أظافر", "قنينة", 40, 10, 12, "ml", 15),
    mkItem("مزيل طلاء", "قنينة", 6, 2, 20, "ml", 500),
    mkItem("قناع بشرة", "قطعة", 25, 6, 18, "count", 1),
    mkItem("قفازات", "زوج", 200, 40, 1.2, "count", 1),
    mkItem("مناديل", "علبة", 60, 15, 6, "count", 100),
  ];

  const [dye, shampoo, conditioner, polish, remover, mask, gloves, tissues] = inventory;

  const svc = (
    name: string, category: string, price: number, durationMin: number,
    prepMin: number, cleanupMin: number, materials: ServiceMaterial[],
  ): Service => ({
    id: uid(), name, category, price, durationMin, prepMin, cleanupMin, materials, active: true,
  });
  const services: Service[] = [
    svc("قص شعر", "الشعر", 80, 30, 5, 5, [{ itemId: shampoo.id, qty: 30 }, { itemId: tissues.id, qty: 0.2 }]),
    svc("صبغة شعر", "الشعر", 350, 90, 10, 10, [{ itemId: dye.id, qty: 1 }, { itemId: shampoo.id, qty: 40 }, { itemId: conditioner.id, qty: 30 }, { itemId: gloves.id, qty: 1 }]),
    svc("تسريحة", "الشعر", 200, 60, 5, 5, [{ itemId: shampoo.id, qty: 20 }]),
    svc("مكياج سهرة", "المكياج", 400, 75, 10, 10, [{ itemId: tissues.id, qty: 0.3 }]),
    svc("تنظيف بشرة", "البشرة", 250, 60, 10, 10, [{ itemId: mask.id, qty: 1 }, { itemId: tissues.id, qty: 0.4 }, { itemId: gloves.id, qty: 1 }]),
    svc("مناكير", "الأظافر", 90, 45, 5, 5, [{ itemId: polish.id, qty: 0.2 }, { itemId: remover.id, qty: 15 }]),
    svc("بديكير", "الأظافر", 110, 45, 5, 5, [{ itemId: polish.id, qty: 0.2 }, { itemId: remover.id, qty: 15 }]),
    svc("حمام مغربي", "العناية", 180, 60, 10, 15, [{ itemId: shampoo.id, qty: 50 }, { itemId: tissues.id, qty: 0.5 }]),
  ];
  const staff: Staff[] = [
    { id: uid(), name: "سارة العتيبي", role: "مصففة شعر", phone: "0501111111", commissionPct: 20, services: [services[0].id, services[1].id, services[2].id], active: true },
    { id: uid(), name: "منى الحربي", role: "خبيرة مكياج", phone: "0502222222", commissionPct: 25, services: [services[3].id], active: true },
    { id: uid(), name: "ريم القحطاني", role: "أخصائية بشرة", phone: "0503333333", commissionPct: 20, services: [services[4].id, services[7].id], active: true },
    { id: uid(), name: "لينا الشمري", role: "فنية أظافر", phone: "0504444444", commissionPct: 18, services: [services[5].id, services[6].id], active: true },
  ];
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const customers: Customer[] = [
    { id: uid(), name: "نورة الفهد", phone: "0551000001", gender: "female", visits: 8, totalSpent: 2100, createdAt: iso(new Date(now.getTime() - 60 * 86400000)) },
    { id: uid(), name: "هند الدوسري", phone: "0551000002", gender: "female", visits: 3, totalSpent: 720, createdAt: iso(new Date(now.getTime() - 20 * 86400000)) },
    { id: uid(), name: "شهد المطيري", phone: "0551000003", gender: "female", visits: 12, totalSpent: 4300, createdAt: iso(new Date(now.getTime() - 180 * 86400000)) },
    { id: uid(), name: "دانة العنزي", phone: "0551000004", gender: "female", visits: 1, totalSpent: 200, createdAt: iso(now) },
  ];

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const at = (h: number, m: number = 0) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m).toISOString();
  const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const total = (ids: string[]) => ids.reduce((a, id) => {
    const s = services.find((x) => x.id === id)!;
    return a + s.prepMin + s.durationMin + s.cleanupMin;
  }, 0);

  const counters: BookingCounters = { global: 120, branch: 40, byDay: {}, byServiceDay: {} };
  const bookings: Booking[] = [];
  const mkBooking = (
    customerId: string, staffId: string, serviceIds: string[],
    startsAt: string, price: number, discount: number,
    status: BookingStatus, payStatus: PayStatus,
  ): Booking => {
    counters.global += 1;
    counters.branch += 1;
    counters.byDay[dateKey] = (counters.byDay[dateKey] ?? 0) + 1;
    const serviceQueue: Record<string, number> = {};
    for (const sid of serviceIds) {
      const k = `${dateKey}|${sid}`;
      counters.byServiceDay[k] = (counters.byServiceDay[k] ?? 0) + 1;
      serviceQueue[sid] = counters.byServiceDay[k];
    }
    const code = `${String(counters.global).padStart(6, "0")}-${String(counters.branch).padStart(6, "0")}-${String(counters.byDay[dateKey]).padStart(4, "0")}`;
    return {
      id: uid(), code,
      globalNo: counters.global, branchNo: counters.branch, dailyNo: counters.byDay[dateKey],
      bookingDate: dateKey, serviceQueue,
      customerId, staffId, serviceIds, startsAt,
      durationMin: total(serviceIds), price, discount,
      status, payStatus, createdAt: iso(now),
    };
  };
  bookings.push(
    mkBooking(customers[0].id, staff[0].id, [services[1].id, services[2].id], at(11), 550, 50, "confirmed", "partial"),
    mkBooking(customers[1].id, staff[1].id, [services[3].id], at(13, 30), 400, 0, "checked_in", "unpaid"),
    mkBooking(customers[2].id, staff[2].id, [services[4].id], at(16), 250, 0, "new", "unpaid"),
    mkBooking(customers[3].id, staff[3].id, [services[5].id, services[6].id], at(18, 30), 200, 0, "new", "unpaid"),
    mkBooking(customers[0].id, staff[0].id, [services[0].id], at(9), 80, 0, "completed", "paid"),
  );

  const invoices: Invoice[] = [
    {
      id: uid(), number: "INV-000042", bookingId: bookings[4].id, customerId: bookings[4].customerId,
      subtotal: 80, discount: 0, vat: 12, total: 92, paid: 92, method: "mada", createdAt: iso(now),
    },
  ];

  return { services, staff, customers, bookings, invoices, inventory, counters };
}

const emptyCounters: BookingCounters = { global: 0, branch: 0, byDay: {}, byServiceDay: {} };
const empty: SalonState = { services: [], staff: [], customers: [], bookings: [], invoices: [], inventory: [], counters: emptyCounters };

function load(): SalonState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SalonState>;
      const bookings = (parsed.bookings ?? []).map((b: any) => ({
        globalNo: 0, branchNo: 0, dailyNo: 0, bookingDate: (b.startsAt ?? "").slice(0, 10), serviceQueue: {},
        ...b,
      })) as Booking[];
      let counters = parsed.counters as BookingCounters | undefined;
      if (!counters) {
        counters = { global: 0, branch: 0, byDay: {}, byServiceDay: {} };
        for (const b of bookings) {
          counters.global = Math.max(counters.global, b.globalNo || 0);
          counters.branch = Math.max(counters.branch, b.branchNo || 0);
          if (b.bookingDate) counters.byDay[b.bookingDate] = Math.max(counters.byDay[b.bookingDate] ?? 0, b.dailyNo || 0);
        }
      }
      // Normalize + dedupe customers by phone; recompute visits/totalSpent from invoices
      const normPhone = (p: string) => (p ?? "").replace(/\D/g, "");
      const rawCustomers = (parsed.customers ?? []) as any[];
      const byPhone = new Map<string, Customer>();
      const idRemap = new Map<string, string>();
      for (const c of rawCustomers) {
        const key = normPhone(c.phone) || c.id;
        const existing = byPhone.get(key);
        if (existing) {
          idRemap.set(c.id, existing.id);
          // Merge: keep richer fields
          existing.name = existing.name || c.name;
          existing.email = existing.email || c.email;
          existing.address = existing.address || c.address;
          existing.notes = existing.notes || c.notes;
          existing.birthDate = existing.birthDate || c.birthDate;
          existing.walletBalance = (existing.walletBalance ?? 0) + (c.walletBalance ?? 0);
          existing.loyaltyPoints = (existing.loyaltyPoints ?? 0) + (c.loyaltyPoints ?? 0);
          existing.referralEarnings = (existing.referralEarnings ?? 0) + (c.referralEarnings ?? 0);
        } else {
          byPhone.set(key, {
            id: c.id,
            name: c.name ?? "",
            phone: c.phone ?? "",
            gender: c.gender,
            notes: c.notes,
            visits: 0,
            totalSpent: 0,
            createdAt: c.createdAt ?? new Date().toISOString(),
            birthDate: c.birthDate,
            address: c.address,
            email: c.email,
            walletBalance: c.walletBalance ?? 0,
            walletLog: c.walletLog ?? [],
            loyaltyPoints: c.loyaltyPoints ?? 0,
            loyaltyLog: c.loyaltyLog ?? [],
            referralCode: c.referralCode ?? genReferralCode(c.name ?? ""),
            referredBy: c.referredBy,
            referralEarnings: c.referralEarnings ?? 0,
          });
        }
      }
      // Remap bookings/invoices to merged customer ids
      const remap = (id: string) => idRemap.get(id) ?? id;
      const remappedBookings = bookings.map((b) => ({ ...b, customerId: remap(b.customerId) }));
      const remappedInvoices = (parsed.invoices ?? []).map((i: any) => ({ ...i, customerId: remap(i.customerId) }));
      // Recompute visits/totalSpent from invoices
      const stats = new Map<string, { visits: number; total: number }>();
      for (const inv of remappedInvoices) {
        const cur = stats.get(inv.customerId) ?? { visits: 0, total: 0 };
        cur.visits += 1; cur.total += inv.total ?? 0;
        stats.set(inv.customerId, cur);
      }
      const customers = Array.from(byPhone.values()).map((c) => {
        const s = stats.get(c.id);
        return { ...c, visits: s?.visits ?? 0, totalSpent: Math.round((s?.total ?? 0) * 100) / 100 };
      });

      // Normalize staff with new optional fields
      const staff = (parsed.staff ?? []).map((s: any) => ({
        annualLeaveDays: 21,
        leaves: [],
        ...s,
      })) as Staff[];

      return {
        services: (parsed.services ?? []).map((s: any) => ({
          prepMin: 0, cleanupMin: 0, materials: [], ...s,
        })),
        staff,
        customers,
        bookings: remappedBookings,
        invoices: remappedInvoices,
        inventory: (parsed.inventory ?? []).map((i: any) => ({
          measure: i.measure ?? "count", sizePerUnit: i.sizePerUnit ?? 1, ...i,
        })),
        counters,
      };

    }
  } catch {}
  const s = seed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  return s;
}

let state: SalonState = empty;
let initialized = false;
let hydrated = false;
const listeners = new Set<() => void>();

function ensureInit() {
  if (!initialized && typeof window !== "undefined") {
    state = load();
    initialized = true;
  }
}

function persist() {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
  listeners.forEach((l) => l());
}

export function useSalon<T>(selector: (s: SalonState) => T): T {
  return useSyncExternalStore(
    (l) => {
      ensureInit();
      listeners.add(l);
      if (!hydrated) {
        hydrated = true;
        // notify all subscribers after mount so first paint matches SSR (empty)
        queueMicrotask(() => listeners.forEach((x) => x()));
      }
      return () => listeners.delete(l);
    },
    () => selector(hydrated ? state : empty),
    () => selector(empty),
  );
}

export function getState(): SalonState {
  ensureInit();
  return state;
}

// ============ Time helpers ============
export function serviceTotalMin(s: Pick<Service, "durationMin" | "prepMin" | "cleanupMin">) {
  return (s.prepMin || 0) + s.durationMin + (s.cleanupMin || 0);
}

export function totalDurationFor(serviceIds: string[], services: Service[]) {
  return serviceIds.reduce((a, id) => {
    const s = services.find((x) => x.id === id);
    return s ? a + serviceTotalMin(s) : a;
  }, 0);
}

// ============ Inventory helpers ============
export function materialsForBooking(serviceIds: string[], services: Service[]): ServiceMaterial[] {
  const map = new Map<string, number>();
  for (const sid of serviceIds) {
    const s = services.find((x) => x.id === sid);
    if (!s) continue;
    for (const m of s.materials ?? []) {
      map.set(m.itemId, (map.get(m.itemId) ?? 0) + m.qty);
    }
  }
  return Array.from(map.entries()).map(([itemId, qty]) => ({ itemId, qty }));
}

export function eligibleStaffFor(serviceIds: string[], staff: Staff[]): Staff[] {
  if (!serviceIds.length) return staff.filter((s) => s.active);
  return staff.filter((s) => s.active && serviceIds.every((sid) => s.services.includes(sid)));
}

export function costPerBase(item: Pick<InventoryItem, "costPerUnit" | "sizePerUnit">): number {
  const size = item.sizePerUnit || 1;
  return item.costPerUnit / size;
}

export function serviceMaterialsCost(materials: ServiceMaterial[] | undefined, inventory: InventoryItem[]): number {
  if (!materials) return 0;
  return materials.reduce((a, m) => {
    const it = inventory.find((x) => x.id === m.itemId);
    return it ? a + costPerBase(it) * m.qty : a;
  }, 0);
}

// Mutations
export const actions = {
  reset() { state = seed(); persist(); },

  // Services
  addService(s: Omit<Service, "id">) {
    const id = uid();
    state = { ...state, services: [...state.services, { ...s, id }] }; persist();
    return id;
  },
  updateService(id: string, patch: Partial<Service>) {
    state = { ...state, services: state.services.map((x) => x.id === id ? { ...x, ...patch } : x) }; persist();
  },
  removeService(id: string) { state = { ...state, services: state.services.filter((x) => x.id !== id) }; persist(); },

  // Inventory
  addInventory(i: Omit<InventoryItem, "id">) { state = { ...state, inventory: [...state.inventory, { ...i, id: uid() }] }; persist(); },
  updateInventory(id: string, patch: Partial<InventoryItem>) {
    state = { ...state, inventory: state.inventory.map((x) => x.id === id ? { ...x, ...patch } : x) }; persist();
  },
  removeInventory(id: string) {
    state = {
      ...state,
      inventory: state.inventory.filter((x) => x.id !== id),
      services: state.services.map((s) => ({ ...s, materials: (s.materials ?? []).filter((m) => m.itemId !== id) })),
    };
    persist();
  },
  adjustStock(id: string, delta: number) {
    state = {
      ...state,
      inventory: state.inventory.map((x) => x.id === id ? { ...x, stock: Math.max(0, x.stock + delta) } : x),
    };
    persist();
  },

  // Staff
  addStaff(s: Omit<Staff, "id">) { state = { ...state, staff: [...state.staff, { ...s, id: uid() }] }; persist(); },
  updateStaff(id: string, patch: Partial<Staff>) {
    state = { ...state, staff: state.staff.map((x) => x.id === id ? { ...x, ...patch } : x) }; persist();
  },
  removeStaff(id: string) { state = { ...state, staff: state.staff.filter((x) => x.id !== id) }; persist(); },
  addStaffNote(id: string, text: string) {
    const note: StaffNote = { id: uid(), text, at: new Date().toISOString() };
    state = { ...state, staff: state.staff.map((x) => x.id === id ? { ...x, notes: [note, ...(x.notes ?? [])] } : x) };
    persist();
  },
  removeStaffNote(id: string, noteId: string) {
    state = { ...state, staff: state.staff.map((x) => x.id === id ? { ...x, notes: (x.notes ?? []).filter((n) => n.id !== noteId) } : x) };
    persist();
  },
  addStaffPoints(id: string, delta: number, reason: string) {
    const log: StaffPointLog = { id: uid(), delta, reason, at: new Date().toISOString() };
    state = { ...state, staff: state.staff.map((x) => x.id === id ? { ...x, points: (x.points ?? 0) + delta, pointsLog: [log, ...(x.pointsLog ?? [])] } : x) };
    persist();
  },
  addStaffAllowance(id: string, label: string, amount: number) {
    const a: StaffAllowance = { id: uid(), label, amount };
    state = { ...state, staff: state.staff.map((x) => x.id === id ? { ...x, allowances: [...(x.allowances ?? []), a] } : x) };
    persist();
  },
  removeStaffAllowance(id: string, allowanceId: string) {
    state = { ...state, staff: state.staff.map((x) => x.id === id ? { ...x, allowances: (x.allowances ?? []).filter((a) => a.id !== allowanceId) } : x) };
    persist();
  },
  setServiceStaff(serviceId: string, staffIds: string[]) {
    const set = new Set(staffIds);
    state = {
      ...state,
      staff: state.staff.map((st) => {
        const has = st.services.includes(serviceId);
        const should = set.has(st.id);
        if (has === should) return st;
        const services = should
          ? [...st.services, serviceId]
          : st.services.filter((x) => x !== serviceId);
        return { ...st, services };
      }),
    };
    persist();
  },

  // Customers
  addCustomer(c: Omit<Customer, "id" | "visits" | "totalSpent" | "createdAt" | "referralCode"> & { referralCode?: string }) {
    // Dedupe by phone
    const normPhone = (p: string) => (p ?? "").replace(/\D/g, "");
    const key = normPhone(c.phone);
    if (key) {
      const existing = state.customers.find((x) => normPhone(x.phone) === key);
      if (existing) return existing;
    }
    const newC: Customer = {
      ...c,
      id: uid(),
      visits: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      walletBalance: c.walletBalance ?? 0,
      walletLog: c.walletLog ?? [],
      loyaltyPoints: c.loyaltyPoints ?? 0,
      loyaltyLog: c.loyaltyLog ?? [],
      referralCode: c.referralCode ?? genReferralCode(c.name),
      referralEarnings: c.referralEarnings ?? 0,
    };
    state = { ...state, customers: [...state.customers, newC] }; persist();
    return newC;
  },
  updateCustomer(id: string, patch: Partial<Customer>) {
    state = { ...state, customers: state.customers.map((x) => x.id === id ? { ...x, ...patch } : x) };
    persist();
  },
  removeCustomer(id: string) { state = { ...state, customers: state.customers.filter((x) => x.id !== id) }; persist(); },

  // Wallet
  walletAdjust(customerId: string, delta: number, reason: string) {
    if (!delta) return;
    const log: WalletLog = { id: uid(), delta, reason, at: new Date().toISOString() };
    state = {
      ...state,
      customers: state.customers.map((c) => c.id === customerId ? {
        ...c,
        walletBalance: Math.max(0, (c.walletBalance ?? 0) + delta),
        walletLog: [log, ...(c.walletLog ?? [])],
      } : c),
    };
    persist();
  },

  // Loyalty
  loyaltyAdjust(customerId: string, delta: number, reason: string) {
    if (!delta) return;
    const log: LoyaltyLog = { id: uid(), delta, reason, at: new Date().toISOString() };
    state = {
      ...state,
      customers: state.customers.map((c) => c.id === customerId ? {
        ...c,
        loyaltyPoints: Math.max(0, (c.loyaltyPoints ?? 0) + delta),
        loyaltyLog: [log, ...(c.loyaltyLog ?? [])],
      } : c),
    };
    persist();
  },
  redeemLoyalty(customerId: string, points: number) {
    const c = state.customers.find((x) => x.id === customerId);
    if (!c) return 0;
    const p = Math.min(points, c.loyaltyPoints ?? 0);
    if (p <= 0) return 0;
    const value = p * LOYALTY_REDEEM_RATE;
    const lLog: LoyaltyLog = { id: uid(), delta: -p, reason: `استبدال ${p} نقطة`, at: new Date().toISOString() };
    const wLog: WalletLog = { id: uid(), delta: value, reason: `استبدال ${p} نقطة ولاء`, at: new Date().toISOString() };
    state = {
      ...state,
      customers: state.customers.map((x) => x.id === customerId ? {
        ...x,
        loyaltyPoints: (x.loyaltyPoints ?? 0) - p,
        loyaltyLog: [lLog, ...(x.loyaltyLog ?? [])],
        walletBalance: (x.walletBalance ?? 0) + value,
        walletLog: [wLog, ...(x.walletLog ?? [])],
      } : x),
    };
    persist();
    return value;
  },

  // Staff leaves
  addStaffLeave(id: string, leave: Omit<StaffLeave, "id" | "at">) {
    const l: StaffLeave = { ...leave, id: uid(), at: new Date().toISOString() };
    state = { ...state, staff: state.staff.map((x) => x.id === id ? { ...x, leaves: [l, ...(x.leaves ?? [])] } : x) };
    persist();
  },
  removeStaffLeave(id: string, leaveId: string) {
    state = { ...state, staff: state.staff.map((x) => x.id === id ? { ...x, leaves: (x.leaves ?? []).filter((l) => l.id !== leaveId) } : x) };
    persist();
  },


  // Bookings
  addBooking(b: Omit<Booking, "id" | "code" | "createdAt" | "status" | "payStatus" | "globalNo" | "branchNo" | "dailyNo" | "bookingDate" | "serviceQueue">) {
    const startsAt = b.startsAt ? new Date(b.startsAt) : new Date();
    const dateKey = `${startsAt.getFullYear()}-${String(startsAt.getMonth() + 1).padStart(2, "0")}-${String(startsAt.getDate()).padStart(2, "0")}`;
    const c = state.counters ?? { global: 0, branch: 0, byDay: {}, byServiceDay: {} };
    const nextCounters: BookingCounters = {
      global: c.global + 1,
      branch: c.branch + 1,
      byDay: { ...c.byDay, [dateKey]: (c.byDay[dateKey] ?? 0) + 1 },
      byServiceDay: { ...c.byServiceDay },
    };
    const serviceQueue: Record<string, number> = {};
    for (const sid of b.serviceIds) {
      const k = `${dateKey}|${sid}`;
      nextCounters.byServiceDay[k] = (nextCounters.byServiceDay[k] ?? 0) + 1;
      serviceQueue[sid] = nextCounters.byServiceDay[k];
    }
    const code = `${String(nextCounters.global).padStart(6, "0")}-${String(nextCounters.branch).padStart(6, "0")}-${String(nextCounters.byDay[dateKey]).padStart(4, "0")}`;
    const nb: Booking = {
      ...b,
      id: uid(),
      code,
      globalNo: nextCounters.global,
      branchNo: nextCounters.branch,
      dailyNo: nextCounters.byDay[dateKey],
      bookingDate: dateKey,
      serviceQueue,
      status: "confirmed",
      payStatus: "unpaid",
      createdAt: new Date().toISOString(),
    };
    state = { ...state, bookings: [...state.bookings, nb], counters: nextCounters };
    persist();
    return nb;
  },
  updateBooking(id: string, patch: Partial<Booking>) {
    state = { ...state, bookings: state.bookings.map((x) => x.id === id ? { ...x, ...patch } : x) }; persist();
  },
  removeBooking(id: string) { state = { ...state, bookings: state.bookings.filter((x) => x.id !== id) }; persist(); },

  createInvoice(bookingId: string, method: Invoice["method"]) {
    const b = state.bookings.find((x) => x.id === bookingId);
    if (!b) return null;
    const subtotal = b.price;
    const discount = b.discount;
    const taxable = subtotal - discount;
    const vat = Math.round(taxable * 0.15 * 100) / 100;
    const total = Math.round((taxable + vat) * 100) / 100;
    const num = `INV-${String(state.invoices.length + 100).padStart(6, "0")}`;
    const inv: Invoice = {
      id: uid(), number: num, bookingId, customerId: b.customerId,
      subtotal, discount, vat, total, paid: total, method, createdAt: new Date().toISOString(),
    };
    // Deduct materials
    const consumed = materialsForBooking(b.serviceIds, state.services);
    const nextInv = state.inventory.map((it) => {
      const used = consumed.find((c) => c.itemId === it.id);
      return used ? { ...it, stock: Math.max(0, it.stock - used.qty) } : it;
    });
    state = {
      ...state,
      invoices: [...state.invoices, inv],
      inventory: nextInv,
      bookings: state.bookings.map((x) => x.id === bookingId ? { ...x, status: "completed", payStatus: "paid" } : x),
      customers: state.customers.map((c) => c.id === b.customerId ? { ...c, visits: c.visits + 1, totalSpent: c.totalSpent + total } : c),
    };
    persist();
    return inv;
  },
};

// helpers
export const STATUS_LABEL: Record<BookingStatus, string> = {
  new: "جديد",
  confirmed: "مؤكد",
  checked_in: "حضر",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  no_show: "لم يحضر",
  cancelled: "ملغي",
};

export const PAY_LABEL: Record<PayStatus, string> = {
  unpaid: "غير مدفوع",
  partial: "جزئي",
  paid: "مدفوع",
};

export const STATUS_TONE: Record<BookingStatus, string> = {
  new: "bg-primary/15 text-primary border-primary/30",
  confirmed: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  checked_in: "bg-warning/15 text-warning border-warning/30",
  in_progress: "bg-accent/15 text-accent border-accent/30",
  completed: "bg-success/15 text-success border-success/30",
  no_show: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

export function formatSAR(n: number) {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(n);
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("ar-SA", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long", day: "numeric" }).format(new Date(iso));
}

export function formatDateShort(iso: string) {
  return new Intl.DateTimeFormat("ar-SA", { month: "short", day: "numeric" }).format(new Date(iso));
}

export function isToday(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}
