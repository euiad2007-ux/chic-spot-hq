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

const STORAGE_KEY = "lamsa_attendance_v1";

const defaults: AttendanceState = {
  settings: {
    enforceLocation: true,
    shopLat: null,
    shopLng: null,
    radiusMeters: 150,
  },
  records: [],
};

function load(): AttendanceState {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<AttendanceState>;
      return {
        settings: { ...defaults.settings, ...(p.settings ?? {}) },
        records: p.records ?? [],
      };
    }
  } catch {}
  return defaults;
}

let state: AttendanceState = defaults;
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
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

const uid = () => Math.random().toString(36).slice(2, 10);

export const attendanceActions = {
  setSettings(patch: Partial<AttendanceSettings>) {
    state = { ...state, settings: { ...state.settings, ...patch } };
    persist();
  },
  checkIn(staffId: string, lat: number, lng: number) {
    const rec: AttendanceRecord = {
      id: uid(), staffId, checkInAt: new Date().toISOString(),
      checkInLat: lat, checkInLng: lng,
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
