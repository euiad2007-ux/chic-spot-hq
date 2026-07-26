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

export interface Service {
  id: string;
  name: string;
  category: string;
  price: number;
  durationMin: number;
  active: boolean;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  phone: string;
  commissionPct: number;
  services: string[]; // service ids
  active: boolean;
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
}

export interface Booking {
  id: string;
  code: string;
  customerId: string;
  staffId: string;
  serviceIds: string[];
  startsAt: string; // ISO
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

export interface SalonState {
  services: Service[];
  staff: Staff[];
  customers: Customer[];
  bookings: Booking[];
  invoices: Invoice[];
}

const STORAGE_KEY = "lamsa_salon_v1";

const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): SalonState {
  const svc = (name: string, category: string, price: number, durationMin: number): Service => ({
    id: uid(), name, category, price, durationMin, active: true,
  });
  const services: Service[] = [
    svc("قص شعر", "الشعر", 80, 30),
    svc("صبغة شعر", "الشعر", 350, 90),
    svc("تسريحة", "الشعر", 200, 60),
    svc("مكياج سهرة", "المكياج", 400, 75),
    svc("تنظيف بشرة", "البشرة", 250, 60),
    svc("مناكير", "الأظافر", 90, 45),
    svc("بديكير", "الأظافر", 110, 45),
    svc("حمام مغربي", "العناية", 180, 60),
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
  let counter = 125;
  const mkCode = () => `BK-${now.getFullYear()}-${String(counter++).padStart(6, "0")}`;

  const bookings: Booking[] = [
    { id: uid(), code: mkCode(), customerId: customers[0].id, staffId: staff[0].id, serviceIds: [services[1].id, services[2].id], startsAt: at(11), durationMin: 150, price: 550, discount: 50, status: "confirmed", payStatus: "partial", createdAt: iso(now) },
    { id: uid(), code: mkCode(), customerId: customers[1].id, staffId: staff[1].id, serviceIds: [services[3].id], startsAt: at(13, 30), durationMin: 75, price: 400, discount: 0, status: "checked_in", payStatus: "unpaid", createdAt: iso(now) },
    { id: uid(), code: mkCode(), customerId: customers[2].id, staffId: staff[2].id, serviceIds: [services[4].id], startsAt: at(16), durationMin: 60, price: 250, discount: 0, status: "new", payStatus: "unpaid", createdAt: iso(now) },
    { id: uid(), code: mkCode(), customerId: customers[3].id, staffId: staff[3].id, serviceIds: [services[5].id, services[6].id], startsAt: at(18, 30), durationMin: 90, price: 200, discount: 0, status: "new", payStatus: "unpaid", createdAt: iso(now) },
    { id: uid(), code: mkCode(), customerId: customers[0].id, staffId: staff[0].id, serviceIds: [services[0].id], startsAt: at(9), durationMin: 30, price: 80, discount: 0, status: "completed", payStatus: "paid", createdAt: iso(now) },
  ];

  const invoices: Invoice[] = [
    {
      id: uid(), number: "INV-000042", bookingId: bookings[4].id, customerId: bookings[4].customerId,
      subtotal: 80, discount: 0, vat: 12, total: 92, paid: 92, method: "mada", createdAt: iso(now),
    },
  ];

  return { services, staff, customers, bookings, invoices };
}

function load(): SalonState {
  if (typeof window === "undefined") return { services: [], staff: [], customers: [], bookings: [], invoices: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SalonState;
  } catch {}
  const s = seed();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  return s;
}

let state: SalonState = { services: [], staff: [], customers: [], bookings: [], invoices: [] };
let initialized = false;
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
  ensureInit();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => selector(state),
    () => selector(state),
  );
}

export function getState(): SalonState {
  ensureInit();
  return state;
}

// Mutations
export const actions = {
  reset() { state = seed(); persist(); },
  addService(s: Omit<Service, "id">) { state = { ...state, services: [...state.services, { ...s, id: uid() }] }; persist(); },
  updateService(id: string, patch: Partial<Service>) {
    state = { ...state, services: state.services.map((x) => x.id === id ? { ...x, ...patch } : x) }; persist();
  },
  removeService(id: string) { state = { ...state, services: state.services.filter((x) => x.id !== id) }; persist(); },
  addStaff(s: Omit<Staff, "id">) { state = { ...state, staff: [...state.staff, { ...s, id: uid() }] }; persist(); },
  updateStaff(id: string, patch: Partial<Staff>) {
    state = { ...state, staff: state.staff.map((x) => x.id === id ? { ...x, ...patch } : x) }; persist();
  },
  removeStaff(id: string) { state = { ...state, staff: state.staff.filter((x) => x.id !== id) }; persist(); },
  addCustomer(c: Omit<Customer, "id" | "visits" | "totalSpent" | "createdAt">) {
    const newC: Customer = { ...c, id: uid(), visits: 0, totalSpent: 0, createdAt: new Date().toISOString() };
    state = { ...state, customers: [...state.customers, newC] }; persist();
    return newC;
  },
  removeCustomer(id: string) { state = { ...state, customers: state.customers.filter((x) => x.id !== id) }; persist(); },
  addBooking(b: Omit<Booking, "id" | "code" | "createdAt" | "status" | "payStatus">) {
    const year = new Date().getFullYear();
    const nextNum = state.bookings.length + 200;
    const nb: Booking = {
      ...b,
      id: uid(),
      code: `BK-${year}-${String(nextNum).padStart(6, "0")}`,
      status: "confirmed",
      payStatus: "unpaid",
      createdAt: new Date().toISOString(),
    };
    state = { ...state, bookings: [...state.bookings, nb] }; persist();
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
    state = {
      ...state,
      invoices: [...state.invoices, inv],
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
