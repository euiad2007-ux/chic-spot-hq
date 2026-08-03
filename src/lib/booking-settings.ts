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
  cancelWindowMin: number;  // 0 = anytime; minutes before start that cancelling is still allowed
  restockOnCancel: boolean; // return service materials to stock when a deducted booking is cancelled
  maxAdvanceDays: number;   // 0 = unlimited; how far ahead a booking may be made
  allowSameStaffBackToBack: boolean; // when false, buffer is enforced strictly
}


const UNUSED_STORAGE_KEY = "lamsa_booking_settings_v1";

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
    cancelWindowMin: 60,
    restockOnCancel: true,
    maxAdvanceDays: 60,
    allowSameStaffBackToBack: false,
  };
}

let state: BookingSettings = defaults();
let initialized = false;
let hydrated = false;
const listeners = new Set<() => void>();

function ensureInit() {
  initialized = true;
}

function persist() {
  listeners.forEach((l) => l());
  if (typeof window === "undefined") return;
  const doc = { ...state, attendance: attendanceDoc };
  void import("@/lib/db/settings-repo").then((m) => m.scheduleSettingsSave("booking", doc));
}

let attendanceDoc: Record<string, unknown> | undefined;

/** Attendance settings share the booking document (same operational concern). */
export function setAttendanceDoc(doc: Record<string, unknown>) {
  attendanceDoc = doc;
  persist();
}

/** Called once by the data layer with the salon's stored booking document. */
export function hydrateBookingSettings(doc: Record<string, unknown> | null) {
  if (doc) {
    const { attendance, ...rest } = doc as Record<string, unknown> & { attendance?: Record<string, unknown> };
    state = { ...defaults(), ...(rest as Partial<BookingSettings>) };
    attendanceDoc = attendance;
  } else {
    state = defaults();
    attendanceDoc = undefined;
  }
  initialized = true;
  hydrated = true;
  listeners.forEach((l) => l());
}

export function isBookingSettingsReady() {
  return hydrated;
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
  setCancelWindow(min: number) { state = { ...state, cancelWindowMin: Math.max(0, Math.floor(min)) }; persist(); },
  setRestockOnCancel(v: boolean) { state = { ...state, restockOnCancel: v }; persist(); },
  setMaxAdvanceDays(n: number) { state = { ...state, maxAdvanceDays: Math.max(0, Math.floor(n)) }; persist(); },
  setAllowBackToBack(v: boolean) { state = { ...state, allowSameStaffBackToBack: v }; persist(); },
  addBreak(b: Omit<BreakWindow, "id">) {
    const id = crypto.randomUUID();
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
  if (settings.maxAdvanceDays > 0 && start.getTime() > now + settings.maxAdvanceDays * 86400000) {
    return { type: "lead", message: `لا يمكن الحجز لأكثر من ${settings.maxAdvanceDays} يوماً مقدماً` };
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
    if (b.status === "cancelled" || b.status === "no_show") continue;
    const r = bookingRange(b, settings.bufferMin);
    const overlaps = newStart < r.end && newEnd > r.start;
    if (!overlaps) continue;
    if (b.staffId === input.staffId) {
      return { type: "overlap", message: "الموظف مشغول في هذا الوقت مع حجز آخر", bookingId: b.id };
    }
    if (input.customerId && b.customerId === input.customerId) {
      return { type: "customer_busy", message: "لديك حجز آخر في نفس هذا الوقت — اختر وقتاً لاحقاً", bookingId: b.id };
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
  customerId?: string;
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
    customer_busy: "لديك حجز آخر",
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
      customerId: q.customerId,
    });
    slots.push({ time, startsAt, available: !c, reason: c?.type });
  }
  return slots;
}

// Earliest available slot for a service across the given staff pool (starting today, scanning up to 14 days).
export interface EarliestOptions {
  serviceIds: string[];
  staffPool: { id: string; name: string; services: string[]; active: boolean }[];
  durationMin: number;
  fromDate?: string;   // YYYY-MM-DD (default today)
  maxDaysAhead?: number;
  customerId?: string;
  notBefore?: string;  // ISO — only slots at/after this instant
}
export interface EarliestSlot {
  staffId: string;
  staffName: string;
  startsAt: string;
  time: string;
  date: string;
}
export function findEarliestSlot(opts: EarliestOptions): EarliestSlot | null {
  const eligible = opts.staffPool.filter((s) => s.active && opts.serviceIds.every((sid) => s.services.includes(sid)));
  if (!eligible.length || !opts.durationMin) return null;
  const notBefore = opts.notBefore ? new Date(opts.notBefore).getTime() : 0;
  const startDate = opts.fromDate ? new Date(opts.fromDate + "T00:00:00") : new Date();
  const maxDays = opts.maxDaysAhead ?? 14;
  let best: EarliestSlot | null = null;
  for (let d = 0; d < maxDays; d++) {
    const dt = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + d);
    const dateKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    for (const st of eligible) {
      const slots = getDaySlots({ date: dateKey, staffId: st.id, durationMin: opts.durationMin, customerId: opts.customerId });
      for (const s of slots) {
        if (!s.available) continue;
        if (notBefore && new Date(s.startsAt).getTime() < notBefore) continue;
        const t = new Date(s.startsAt).getTime();
        if (!best || t < new Date(best.startsAt).getTime()) {
          best = { staffId: st.id, staffName: st.name, startsAt: s.startsAt, time: s.time, date: dateKey };
        }
      }
    }
    if (best) return best; // earliest found on this day
  }
  return best;
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
