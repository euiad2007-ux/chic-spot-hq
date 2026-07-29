import { useSyncExternalStore } from "react";
import { getState, type Booking } from "@/lib/salon-store";

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sunday

export interface DaySchedule {
  open: boolean;
  start: string; // "09:00"
  end: string;   // "21:00"
}

export interface BreakWindow {
  id: string;
  label: string;
  days: Weekday[];
  start: string;
  end: string;
  staffId?: string; // optional: applies to a specific staff, otherwise all
}

export interface BookingSettings {
  workDays: Record<Weekday, DaySchedule>;
  breaks: BreakWindow[];
  bufferMin: number;
  slotStepMin: number;
  minLeadMin: number;
  maxDailyBookings: number; // 0 = unlimited
  foundingDate: string;     // "YYYY-MM-DD" — reference for sequential numbering
  holdGraceMin: number;     // minutes past appointment before hold auto-cancels
}

const STORAGE_KEY = "lamsa_booking_settings_v1";

const DAY_LABELS_AR: Record<Weekday, string> = {
  0: "الأحد",
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

export const WEEKDAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
export const dayLabel = (d: Weekday) => DAY_LABELS_AR[d];

function defaults(): BookingSettings {
  const std: DaySchedule = { open: true, start: "10:00", end: "22:00" };
  return {
    workDays: {
      0: std, 1: std, 2: std, 3: std, 4: std,
      5: { open: false, start: "14:00", end: "22:00" },
      6: std,
    },
    breaks: [
      { id: "brk-lunch", label: "استراحة الغداء", days: [0, 1, 2, 3, 4, 6], start: "13:30", end: "14:30" },
    ],
    bufferMin: 10,
    slotStepMin: 15,
    minLeadMin: 0,
    maxDailyBookings: 0,
    foundingDate: new Date().toISOString().slice(0, 10),
    holdGraceMin: 5,
  };
}

function load(): BookingSettings {
  if (typeof window === "undefined") return defaults();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults(), ...JSON.parse(raw) };
  } catch {}
  return defaults();
}

let state: BookingSettings = defaults();
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

export function useBookingSettings<T>(selector: (s: BookingSettings) => T): T {
  ensureInit();
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => selector(state),
    () => selector(state),
  );
}

export function getBookingSettings(): BookingSettings {
  ensureInit();
  return state;
}

export const bookingSettingsActions = {
  setDay(day: Weekday, patch: Partial<DaySchedule>) {
    state = { ...state, workDays: { ...state.workDays, [day]: { ...state.workDays[day], ...patch } } };
    persist();
  },
  setBuffer(min: number) { state = { ...state, bufferMin: Math.max(0, min) }; persist(); },
  setSlotStep(min: number) { state = { ...state, slotStepMin: Math.max(5, min) }; persist(); },
  setMinLead(min: number) { state = { ...state, minLeadMin: Math.max(0, min) }; persist(); },
  setMaxDaily(n: number) { state = { ...state, maxDailyBookings: Math.max(0, Math.floor(n)) }; persist(); },
  setHoldGrace(min: number) { state = { ...state, holdGraceMin: Math.max(0, Math.floor(min)) }; persist(); },
  setFoundingDate(d: string) { state = { ...state, foundingDate: d }; persist(); },
  addBreak(b: Omit<BreakWindow, "id">) {
    const id = "brk-" + Math.random().toString(36).slice(2, 8);
    state = { ...state, breaks: [...state.breaks, { ...b, id }] };
    persist();
  },
  updateBreak(id: string, patch: Partial<BreakWindow>) {
    state = { ...state, breaks: state.breaks.map((b) => b.id === id ? { ...b, ...patch } : b) };
    persist();
  },
  removeBreak(id: string) {
    state = { ...state, breaks: state.breaks.filter((b) => b.id !== id) };
    persist();
  },
  reset() { state = defaults(); persist(); },
};

// ============== Conflict detection ==============

export interface ConflictCheckInput {
  staffId: string;
  startsAt: string; // ISO
  durationMin: number;
  ignoreBookingId?: string;
  customerId?: string;
}

export type ConflictReason =
  | { type: "closed"; message: string }
  | { type: "past"; message: string }
  | { type: "lead"; message: string }
  | { type: "outside_hours"; message: string }
  | { type: "break"; message: string; label: string }
  | { type: "overlap"; message: string; bookingId: string }
  | { type: "customer_busy"; message: string; bookingId: string };

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function bookingRange(b: Booking, bufferMin: number) {
  const start = new Date(b.startsAt).getTime();
  const end = start + (b.durationMin + bufferMin) * 60000;
  return { start, end };
}

export function checkBookingConflict(input: ConflictCheckInput): ConflictReason | null {
  const settings = getBookingSettings();
  const { bookings } = getState();
  const start = new Date(input.startsAt);
  if (Number.isNaN(start.getTime())) return { type: "past", message: "وقت غير صالح" };

  const end = new Date(start.getTime() + (input.durationMin + settings.bufferMin) * 60000);
  const now = Date.now();

  if (start.getTime() < now) {
    return { type: "past", message: "لا يمكن الحجز في وقت مضى" };
  }
  if (start.getTime() < now + settings.minLeadMin * 60000) {
    return { type: "lead", message: `يجب الحجز قبل ${settings.minLeadMin} دقيقة على الأقل` };
  }

  const day = start.getDay() as Weekday;
  const sched = settings.workDays[day];
  if (!sched?.open) {
    return { type: "closed", message: `الصالون مغلق يوم ${dayLabel(day)}` };
  }

  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes() + (end.getDate() !== start.getDate() ? 24 * 60 : 0);
  const openMin = toMin(sched.start);
  const closeMin = toMin(sched.end);
  if (startMin < openMin || endMin > closeMin) {
    return { type: "outside_hours", message: `خارج ساعات الدوام (${sched.start} - ${sched.end})` };
  }

  // Breaks
  for (const brk of settings.breaks) {
    if (!brk.days.includes(day)) continue;
    if (brk.staffId && brk.staffId !== input.staffId) continue;
    const bs = toMin(brk.start);
    const be = toMin(brk.end);
    if (startMin < be && endMin > bs) {
      return { type: "break", message: `يتعارض مع "${brk.label}" (${brk.start} - ${brk.end})`, label: brk.label };
    }
  }

  // Overlap with other bookings (same staff, non-cancelled)
  const newStart = start.getTime();
  const newEnd = end.getTime();
  for (const b of bookings) {
    if (b.id === input.ignoreBookingId) continue;
    if (b.staffId !== input.staffId) continue;
    if (b.status === "cancelled" || b.status === "no_show") continue;
    const r = bookingRange(b, settings.bufferMin);
    if (newStart < r.end && newEnd > r.start) {
      return {
        type: "overlap",
        message: "الموظف مشغول في هذا الوقت مع حجز آخر",
        bookingId: b.id,
      };
    }
  }
  return null;
}

// ============== Slot generation ==============

export interface SlotQuery {
  date: string;          // "YYYY-MM-DD"
  staffId: string;
  durationMin: number;
  ignoreBookingId?: string;
}

export interface Slot {
  time: string;          // "HH:MM"
  startsAt: string;      // ISO
  available: boolean;
  reason?: ConflictReason["type"];
}

export function getSlotReasonLabel(reason?: Slot["reason"]) {
  const labels: Record<ConflictReason["type"], string> = {
    closed: "اليوم مغلق",
    past: "وقت مضى",
    lead: "قبل الحد الأدنى للحجز",
    outside_hours: "خارج ساعات الدوام",
    break: "وقت استراحة",
    overlap: "محجوز مسبقاً",
  };
  return reason ? labels[reason] : "غير متاح";
}

function pad(n: number) { return n.toString().padStart(2, "0"); }

export function getDaySlots(q: SlotQuery): Slot[] {
  const settings = getBookingSettings();
  if (!q.date || !q.staffId || !q.durationMin) return [];
  const [yy, mm, dd] = q.date.split("-").map(Number);
  const base = new Date(yy, (mm || 1) - 1, dd || 1);
  const day = base.getDay() as Weekday;
  const sched = settings.workDays[day];
  if (!sched?.open) return [];
  const step = Math.max(5, settings.slotStepMin);
  const openMin = toMin(sched.start);
  const closeMin = toMin(sched.end);
  const slots: Slot[] = [];
  const durationWithBuffer = q.durationMin + settings.bufferMin;
  for (let m = openMin; m + durationWithBuffer <= closeMin; m += step) {
    const h = Math.floor(m / 60);
    const mn = m % 60;
    const time = `${pad(h)}:${pad(mn)}`;
    const dt = new Date(yy, (mm || 1) - 1, dd || 1, h, mn, 0, 0);
    const startsAt = dt.toISOString();
    const c = checkBookingConflict({
      staffId: q.staffId,
      startsAt,
      durationMin: q.durationMin,
      ignoreBookingId: q.ignoreBookingId,
    });
    slots.push({ time, startsAt, available: !c, reason: c?.type });
  }
  return slots;
}

export function getDayAvailabilitySummary(q: SlotQuery) {
  const slots = getDaySlots(q);
  const unavailableByReason = slots.reduce<Record<string, number>>((acc, slot) => {
    if (!slot.available) acc[slot.reason ?? "unavailable"] = (acc[slot.reason ?? "unavailable"] ?? 0) + 1;
    return acc;
  }, {});

  return {
    total: slots.length,
    available: slots.filter((slot) => slot.available).length,
    unavailable: slots.filter((slot) => !slot.available).length,
    unavailableByReason,
  };
}
