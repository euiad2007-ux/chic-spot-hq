import { useSyncExternalStore } from "react";

export interface AttendanceRecord {
  id: string;
  staffId: string;
  checkInAt: string;
  checkInLat: number;
  checkInLng: number;
  checkOutAt?: string;
  checkOutLat?: number;
  checkOutLng?: number;
  via?: "geo" | "manual";
  note?: string;
}

export interface AttendanceSettings {
  enforceLocation: boolean;
  shopLat: number | null;
  shopLng: number | null;
  radiusMeters: number;
}

interface AttendanceState {
  settings: AttendanceSettings;
  records: AttendanceRecord[];
}

const defaults: AttendanceState = {
  settings: {
    enforceLocation: true,
    shopLat: null,
    shopLng: null,
    radiusMeters: 150,
  },
  records: [],
};

let state: AttendanceState = defaults;
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
  void import("@/lib/db/attendance-repo").then((m) => m.scheduleAttendanceSave(current.records));
  void import("@/lib/booking-settings").then((m) =>
    m.setAttendanceDoc(current.settings as unknown as Record<string, unknown>));
}

/** Called once by the data layer with the salon's attendance data. */
export function hydrateAttendanceStore(input: {
  settings?: Record<string, unknown>;
  records: AttendanceRecord[];
}) {
  state = {
    settings: { ...defaults.settings, ...((input.settings ?? {}) as Partial<AttendanceSettings>) },
    records: input.records,
  };
  initialized = true;
  hydrated = true;
  listeners.forEach((l) => l());
}

export function useAttendance<T>(selector: (s: AttendanceState) => T): T {
  return useSyncExternalStore(
    (l) => {
      ensureInit();
      listeners.add(l);
      if (!hydrated) {
        hydrated = true;
        queueMicrotask(() => listeners.forEach((x) => x()));
      }
      return () => listeners.delete(l);
    },
    () => selector(hydrated ? state : defaults),
    () => selector(defaults),
  );
}

const uid = () => crypto.randomUUID();

export const attendanceActions = {
  setSettings(patch: Partial<AttendanceSettings>) {
    state = { ...state, settings: { ...state.settings, ...patch } };
    persist();
  },
  checkIn(staffId: string, lat: number, lng: number, via: "geo" | "manual" = "geo") {
    const rec: AttendanceRecord = {
      id: uid(), staffId, checkInAt: new Date().toISOString(),
      checkInLat: lat, checkInLng: lng, via,
    };
    state = { ...state, records: [rec, ...state.records] };
    persist();
    return rec;
  },
  checkOut(recordId: string, lat: number, lng: number) {
    state = {
      ...state,
      records: state.records.map((r) => r.id === recordId
        ? { ...r, checkOutAt: new Date().toISOString(), checkOutLat: lat, checkOutLng: lng }
        : r),
    };
    persist();
  },
  setNote(recordId: string, note: string) {
    state = {
      ...state,
      records: state.records.map((r) => r.id === recordId ? { ...r, note } : r),
    };
    persist();
  },
  removeRecord(recordId: string) {
    state = { ...state, records: state.records.filter((r) => r.id !== recordId) };
    persist();
  },
};

// Haversine distance in meters
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("المتصفح لا يدعم تحديد الموقع"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  });
}

export function openAttendanceRecord(records: AttendanceRecord[], staffId: string): AttendanceRecord | undefined {
  return records.find((r) => r.staffId === staffId && !r.checkOutAt);
}

export function todayRecordsFor(records: AttendanceRecord[], staffId: string): AttendanceRecord[] {
  const now = new Date();
  return records.filter((r) => {
    if (r.staffId !== staffId) return false;
    const d = new Date(r.checkInAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  });
}

export function workedMinutes(r: AttendanceRecord): number {
  const end = r.checkOutAt ? new Date(r.checkOutAt).getTime() : Date.now();
  return Math.max(0, Math.round((end - new Date(r.checkInAt).getTime()) / 60000));
}
