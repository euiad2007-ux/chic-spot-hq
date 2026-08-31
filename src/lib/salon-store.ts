import { useSyncExternalStore } from "react";
import { getRewardsSettings } from "@/lib/rewards-settings";
import { getCustomMeasures, setCustomMeasures } from "@/lib/site-settings";

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
  /** Square artwork shown on booking cards. */
  imageUrl?: string | null;
  /** Branch that offers this service. `null` = available in every branch. */
  branchId?: string | null;
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

export function loadMeasures(): { code: string; label: string }[] {
  const custom = getCustomMeasures();
  const seen = new Set(DEFAULT_MEASURES.map((m) => m.code));
  return [...DEFAULT_MEASURES, ...custom.filter((c) => c.code && !seen.has(c.code))];
}
export function addCustomMeasure(m: { code: string; label: string }) {
  if (loadMeasures().find((x) => x.code === m.code)) return;
  setCustomMeasures([...getCustomMeasures(), m]);
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
  /** Branch the employee belongs to. `null` = all branches. */
  branchId?: string | null;

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
  password?: string;            // optional login password

  // Wallet & loyalty
  walletId?: string;           // 2 letters + 10 digits (e.g. "LM1234567890")
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

// Wallet ID: 2 uppercase letters + 10 digits
function genWalletId(existing: Set<string>): string {
  const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  for (let i = 0; i < 20; i++) {
    const a = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const b = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    let d = "";
    for (let k = 0; k < 10; k++) d += Math.floor(Math.random() * 10);
    const id = `${a}${b}${d}`;
    if (!existing.has(id)) { existing.add(id); return id; }
  }
  return `LM${Date.now().toString().slice(-10)}`;
}
export function isValidWalletId(id: string) {
  return /^[A-Z]{2}\d{10}$/.test(id.trim().toUpperCase());
}



export type BookingPaymentMethod =
  | "cash" | "mada" | "card" | "apple_pay" | "google_pay" | "transfer"
  | "wallet"        // pay in full from wallet (needs customer approval when created by admin)
  | "hold";         // client-created reservation without payment; auto-cancel after grace

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
  /** Branch the booking belongs to. `null` = not linked to a specific branch. */
  branchId?: string | null;

  startsAt: string;
  durationMin: number;
  price: number;
  discount: number;
  // Applied coupon (increases discount)
  couponCode?: string;
  couponDiscount?: number;
  // Wallet applied at booking time (deducted from customer wallet at invoice)
  walletUsed?: number;
  status: BookingStatus;
  payStatus: PayStatus;
  notes?: string;
  createdAt: string;
  // New: payment intent + wallet approval + auto-cancel hold
  paymentMethod?: BookingPaymentMethod;
  walletApproved?: boolean;              // customer approved wallet deduction
  walletApprovalRequestedAt?: string;
  holdExpiresAt?: string;                // ISO; auto-cancel after this instant
  // Inventory: true once service materials were deducted (at invoicing).
  // Cancelling a booking only restocks when this is true.
  stockDeducted?: boolean;
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
  /** Branch the invoice belongs to. `null` = not linked to a specific branch. */
  branchId?: string | null;

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

/** Database-safe identifier (UUID v4). */
const uid = () => crypto.randomUUID();

const emptyCounters: BookingCounters = { global: 0, branch: 0, byDay: {}, byServiceDay: {} };
const empty: SalonState = { services: [], staff: [], customers: [], bookings: [], invoices: [], inventory: [], counters: emptyCounters };

let state: SalonState = empty;
let initialized = false;
let hydrated = false;
const listeners = new Set<() => void>();

function ensureInit() {
  initialized = true;
}

function persist() {
  listeners.forEach((l) => l());
  if (typeof window === "undefined") return;
  const current = state;
  void import("@/lib/db/salon-repo").then((m) => m.scheduleSalonSave(current));
}

/** Called once by the data layer after the salon workspace is fetched. */
export function hydrateSalonStore(next: SalonState | null) {
  state = next ?? empty;
  initialized = true;
  hydrated = true;
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
  reset() { state = { ...empty, counters: { global: 0, branch: 0, byDay: {}, byServiceDay: {} } }; persist(); },

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
    const walletIdSet = new Set<string>(state.customers.map((x) => x.walletId).filter(Boolean) as string[]);
    const newC: Customer = {
      ...c,
      id: uid(),
      visits: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
      walletId: c.walletId ?? genWalletId(walletIdSet),
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

  // Transfer wallet balance from one customer to another by wallet ID
  walletTransfer(fromCustomerId: string, toWalletId: string, amount: number, note?: string): { ok: boolean; error?: string } {
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "قيمة غير صحيحة" };
    const from = state.customers.find((c) => c.id === fromCustomerId);
    if (!from) return { ok: false, error: "المرسل غير موجود" };
    const target = (toWalletId || "").trim().toUpperCase();
    if (!isValidWalletId(target)) return { ok: false, error: "رقم المحفظة غير صالح (حرفان + 10 أرقام)" };
    if (from.walletId === target) return { ok: false, error: "لا يمكن التحويل لنفس المحفظة" };
    const to = state.customers.find((c) => (c.walletId ?? "").toUpperCase() === target);
    if (!to) return { ok: false, error: "لا توجد محفظة بهذا الرقم" };
    if ((from.walletBalance ?? 0) < amount) return { ok: false, error: "الرصيد غير كافٍ" };
    const now = new Date().toISOString();
    const outLog: WalletLog = { id: uid(), delta: -amount, reason: `تحويل إلى ${to.name} (${target})${note ? " · " + note : ""}`, at: now };
    const inLog: WalletLog = { id: uid(), delta: amount, reason: `تحويل من ${from.name} (${from.walletId})${note ? " · " + note : ""}`, at: now };
    state = {
      ...state,
      customers: state.customers.map((c) => {
        if (c.id === from.id) return { ...c, walletBalance: (c.walletBalance ?? 0) - amount, walletLog: [outLog, ...(c.walletLog ?? [])] };
        if (c.id === to.id) return { ...c, walletBalance: (c.walletBalance ?? 0) + amount, walletLog: [inLog, ...(c.walletLog ?? [])] };
        return c;
      }),
    };
    persist();
    return { ok: true };
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
    const value = p * getRewardsSettings().loyaltyRedeemRate;
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

  /**
   * Cancels a booking. Inventory is only touched when the booking's materials
   * were actually deducted (i.e. it was invoiced) — cancelling an unpaid or
   * held booking never consumes stock.
   */
  cancelBooking(id: string, reason?: string, restock = true): { ok: boolean; restocked: boolean; error?: string } {
    const b = state.bookings.find((x) => x.id === id);
    if (!b) return { ok: false, restocked: false, error: "الحجز غير موجود" };
    if (b.status === "cancelled") return { ok: false, restocked: false, error: "الحجز ملغي مسبقاً" };

    const shouldRestock = restock && b.stockDeducted === true;
    let nextInventory = state.inventory;
    if (shouldRestock) {
      const consumed = materialsForBooking(b.serviceIds, state.services);
      nextInventory = state.inventory.map((it) => {
        const used = consumed.find((c) => c.itemId === it.id);
        return used ? { ...it, stock: it.stock + used.qty } : it;
      });
    }

    const note = reason ? `إلغاء: ${reason}` : "تم الإلغاء";
    state = {
      ...state,
      inventory: nextInventory,
      bookings: state.bookings.map((x) => x.id === id ? {
        ...x,
        status: "cancelled" as BookingStatus,
        stockDeducted: shouldRestock ? false : x.stockDeducted,
        notes: (x.notes ? x.notes + " · " : "") + note,
      } : x),
    };
    persist();
    return { ok: true, restocked: shouldRestock };
  },


  // Customer approves a wallet-payment booking created by admin
  approveWalletPayment(bookingId: string): { ok: boolean; error?: string } {
    const b = state.bookings.find((x) => x.id === bookingId);
    if (!b) return { ok: false, error: "الحجز غير موجود" };
    if (b.paymentMethod !== "wallet") return { ok: false, error: "هذا الحجز لا يتطلب موافقة" };
    if (b.walletApproved) return { ok: false, error: "تمت الموافقة مسبقاً" };
    const c = state.customers.find((x) => x.id === b.customerId);
    const need = Math.max(0, b.price - b.discount);
    if (!c || (c.walletBalance ?? 0) < need) return { ok: false, error: "الرصيد غير كافٍ" };
    state = { ...state, bookings: state.bookings.map((x) => x.id === bookingId ? { ...x, walletApproved: true, walletUsed: need } : x) };
    persist();
    return { ok: true };
  },
  rejectWalletPayment(bookingId: string) {
    state = { ...state, bookings: state.bookings.map((x) => x.id === bookingId ? { ...x, paymentMethod: undefined, walletApproved: false, walletUsed: undefined } : x) };
    persist();
  },

  // Auto-cancel expired hold bookings (client saves-as-hold that weren't paid)
  cancelExpiredHolds() {
    const now = Date.now();
    let changed = false;
    const bookings = state.bookings.map((b) => {
      if (b.paymentMethod === "hold" && b.status !== "cancelled" && b.status !== "completed" && b.holdExpiresAt) {
        if (new Date(b.holdExpiresAt).getTime() < now) {
          changed = true;
          return { ...b, status: "cancelled" as BookingStatus, notes: (b.notes ? b.notes + " · " : "") + "إلغاء تلقائي (انتهت مهلة الدفع)" };
        }
      }
      return b;
    });
    if (changed) { state = { ...state, bookings }; persist(); }
  },


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
    // Loyalty points earned by the paying customer (uses configurable rate)
    const rewards = getRewardsSettings();
    const earnedPoints = rewards.loyaltyEnabled
      ? Math.round(total * rewards.loyaltyRate * 100) / 100
      : 0;
    const lLog: LoyaltyLog = { id: uid(), delta: earnedPoints, reason: `فاتورة ${num}`, at: new Date().toISOString() };

    // Referral commission → paid into the referrer's wallet (uses configurable %)
    const buyer = state.customers.find((c) => c.id === b.customerId);
    const referrer = (rewards.referralEnabled && buyer?.referredBy)
      ? state.customers.find((c) => c.referralCode === buyer.referredBy)
      : undefined;
    const refAmount = referrer ? Math.round(total * (rewards.referralCommissionPct / 100) * 100) / 100 : 0;

    state = {
      ...state,
      invoices: [...state.invoices, inv],
      inventory: nextInv,
      bookings: state.bookings.map((x) => x.id === bookingId ? { ...x, status: "completed", payStatus: "paid", stockDeducted: true } : x),
      customers: state.customers.map((c) => {
        if (c.id === b.customerId) {
          const walletUsed = Math.max(0, Math.min(b.walletUsed ?? 0, c.walletBalance ?? 0));
          const wLogs = walletUsed > 0
            ? [{ id: uid(), delta: -walletUsed, reason: `دفع فاتورة ${num}`, at: new Date().toISOString() } as WalletLog, ...(c.walletLog ?? [])]
            : (c.walletLog ?? []);
          return {
            ...c,
            visits: c.visits + 1,
            totalSpent: Math.round((c.totalSpent + total) * 100) / 100,
            walletBalance: Math.max(0, (c.walletBalance ?? 0) - walletUsed),
            walletLog: wLogs,
            loyaltyPoints: Math.round(((c.loyaltyPoints ?? 0) + earnedPoints) * 100) / 100,
            loyaltyLog: [lLog, ...(c.loyaltyLog ?? [])],
          };
        }
        if (referrer && c.id === referrer.id && refAmount > 0) {
          const wLog: WalletLog = { id: uid(), delta: refAmount, reason: `عمولة إحالة (فاتورة ${num})`, at: new Date().toISOString() };
          return {
            ...c,
            walletBalance: (c.walletBalance ?? 0) + refAmount,
            walletLog: [wLog, ...(c.walletLog ?? [])],
            referralEarnings: Math.round(((c.referralEarnings ?? 0) + refAmount) * 100) / 100,
          };
        }
        return c;
      }),

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
