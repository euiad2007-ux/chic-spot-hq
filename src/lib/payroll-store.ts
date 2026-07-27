import { useSyncExternalStore } from "react";
import type { Weekday } from "@/lib/booking-settings";
import type { AttendanceRecord } from "@/lib/attendance-store";
import { workedMinutes } from "@/lib/attendance-store";

export interface Shift { start: string; end: string; }
export interface PayrollDay {
  open: boolean;
  shifts: Shift[]; // 1..3
}

export type OvertimeMode = "off" | "x1" | "x1_5" | "custom";

export interface PayrollSettings {
  dailyHours: number;
  weeklyHours: number;
  monthlyHours: number;
  workDays: Record<Weekday, PayrollDay>;
  overtimeEnabled: boolean;
  overtimeMode: OvertimeMode;
  overtimeMultiplier: number; // used when custom, else 1 or 1.5
  hourlyOverrides: Record<string, number>; // staffId -> SAR/hour
}

export interface PayrollPayment {
  id: string;
  staffId: string;
  amount: number;
  paidAt: string;      // ISO
  periodFrom?: string; // YYYY-MM
  periodTo?: string;   // YYYY-MM
  note?: string;
}

interface State {
  settings: PayrollSettings;
  payments: PayrollPayment[];
}

const KEY = "lamsa_payroll_v1";

function defaults(): PayrollSettings {
  const day: PayrollDay = { open: true, shifts: [{ start: "10:00", end: "18:00" }] };
  return {
    dailyHours: 8,
    weeklyHours: 48,
    monthlyHours: 208,
    workDays: {
      0: day, 1: day, 2: day, 3: day, 4: day,
      5: { open: false, shifts: [{ start: "14:00", end: "22:00" }] },
      6: day,
    },
    overtimeEnabled: false,
    overtimeMode: "x1_5",
    overtimeMultiplier: 1.5,
    hourlyOverrides: {},
  };
}

function load(): State {
  if (typeof window === "undefined") return { settings: defaults(), payments: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<State>;
      return {
        settings: { ...defaults(), ...(p.settings ?? {}) },
        payments: p.payments ?? [],
      };
    }
  } catch {}
  return { settings: defaults(), payments: [] };
}

let state: State = { settings: defaults(), payments: [] };
let initialized = false;
let hydrated = false;
const listeners = new Set<() => void>();

function ensure() {
  if (!initialized && typeof window !== "undefined") {
    state = load();
    initialized = true;
  }
}
function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function usePayroll<T>(selector: (s: State) => T): T {
  const initial: State = { settings: defaults(), payments: [] };
  return useSyncExternalStore(
    (l) => {
      ensure();
      listeners.add(l);
      if (!hydrated) { hydrated = true; queueMicrotask(() => listeners.forEach((x) => x())); }
      return () => listeners.delete(l);
    },
    () => selector(hydrated ? state : initial),
    () => selector(initial),
  );
}

const uid = () => Math.random().toString(36).slice(2, 10);

export const payrollActions = {
  setSettings(patch: Partial<PayrollSettings>) {
    state = { ...state, settings: { ...state.settings, ...patch } }; persist();
  },
  setDay(day: Weekday, patch: Partial<PayrollDay>) {
    state = {
      ...state,
      settings: { ...state.settings, workDays: { ...state.settings.workDays, [day]: { ...state.settings.workDays[day], ...patch } } },
    };
    persist();
  },
  setShifts(day: Weekday, shifts: Shift[]) {
    const clamped = shifts.slice(0, 3);
    state = {
      ...state,
      settings: { ...state.settings, workDays: { ...state.settings.workDays, [day]: { ...state.settings.workDays[day], shifts: clamped } } },
    };
    persist();
  },
  setOvertime(mode: OvertimeMode, customMultiplier?: number) {
    const mult = mode === "x1" ? 1 : mode === "x1_5" ? 1.5 : (customMultiplier ?? state.settings.overtimeMultiplier);
    state = { ...state, settings: { ...state.settings, overtimeMode: mode, overtimeMultiplier: mult } };
    persist();
  },
  toggleOvertime(enabled: boolean) {
    state = { ...state, settings: { ...state.settings, overtimeEnabled: enabled } };
    persist();
  },
  setHourlyOverride(staffId: string, rate: number | null) {
    const cur = { ...state.settings.hourlyOverrides };
    if (rate === null || rate <= 0) delete cur[staffId]; else cur[staffId] = rate;
    state = { ...state, settings: { ...state.settings, hourlyOverrides: cur } };
    persist();
  },
  addPayment(p: Omit<PayrollPayment, "id">) {
    state = { ...state, payments: [{ ...p, id: uid() }, ...state.payments] };
    persist();
  },
  removePayment(id: string) {
    state = { ...state, payments: state.payments.filter((x) => x.id !== id) };
    persist();
  },
};

// ============ Calculations ============

export function hourlyRateFor(staff: { id: string; salary?: number }, settings: PayrollSettings): number {
  const o = settings.hourlyOverrides[staff.id];
  if (o && o > 0) return o;
  const monthly = settings.monthlyHours || 1;
  return Math.round(((staff.salary ?? 0) / monthly) * 100) / 100;
}

function ym(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }

export interface MonthBreakdown {
  key: string;       // "YYYY-MM"
  label: string;     // Arabic display
  minutes: number;
  regularMin: number;
  overtimeMin: number;
  regularPay: number;
  overtimePay: number;
  total: number;
}

export function computeStaffPayroll(
  staff: { id: string; salary?: number; hireDate?: string },
  records: AttendanceRecord[],
  payments: PayrollPayment[],
  settings: PayrollSettings,
): {
  rate: number;
  months: MonthBreakdown[];
  totalMinutes: number;
  totalEarned: number;
  totalPaid: number;
  balance: number;
} {
  const rate = hourlyRateFor(staff, settings);
  const rateHalf = rate; // per hour
  const rateMin = rate / 60;
  const otMult = settings.overtimeEnabled ? settings.overtimeMultiplier : 1;
  const monthlyCap = Math.round((settings.monthlyHours || 0) * 60);

  const hire = staff.hireDate ? new Date(staff.hireDate) : null;
  const now = new Date();

  // Group minutes by month
  const byMonth = new Map<string, number>();
  for (const r of records) {
    if (r.staffId !== staff.id) continue;
    const d = new Date(r.checkInAt);
    if (hire && d < hire) continue;
    const k = ym(d);
    byMonth.set(k, (byMonth.get(k) ?? 0) + workedMinutes(r));
  }

  // Build a continuous month range from hire → now, so months with zero also show
  const months: MonthBreakdown[] = [];
  const startCursor = hire ? new Date(hire.getFullYear(), hire.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth(), 1);
  const endCursor = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let d = new Date(startCursor); d <= endCursor; d.setMonth(d.getMonth() + 1)) {
    const k = ym(d);
    const minutes = byMonth.get(k) ?? 0;
    const regular = monthlyCap > 0 ? Math.min(minutes, monthlyCap) : minutes;
    const overtime = Math.max(0, minutes - regular);
    const regularPay = Math.round(regular * rateMin * 100) / 100;
    const overtimePay = Math.round(overtime * rateMin * otMult * 100) / 100;
    months.push({
      key: k,
      label: new Intl.DateTimeFormat("ar-SA", { year: "numeric", month: "long" }).format(d),
      minutes, regularMin: regular, overtimeMin: overtime,
      regularPay, overtimePay,
      total: Math.round((regularPay + overtimePay) * 100) / 100,
    });
  }

  const totalMinutes = months.reduce((a, m) => a + m.minutes, 0);
  const totalEarned = months.reduce((a, m) => a + m.total, 0);
  const totalPaid = payments.filter((p) => p.staffId === staff.id).reduce((a, p) => a + p.amount, 0);
  return {
    rate: Math.round(rateHalf * 100) / 100,
    months,
    totalMinutes,
    totalEarned: Math.round(totalEarned * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    balance: Math.round((totalEarned - totalPaid) * 100) / 100,
  };
}

export function fmtHours(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}س ${m}د`;
}
