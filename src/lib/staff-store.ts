import { useSyncExternalStore } from "react";

/* -------- Types -------- */
export interface StaffSpecialization {
  id: string;            // service id from SERVICE_CATALOG
  rating: number;        // 1-5 skill rating
}

export interface Allowance {
  id: string;
  label: string;
  amount: number;
}

export type EmploymentType = "full_time" | "part_time" | "contract" | "trainee";
export type Gender = "female" | "male";

export interface Staff {
  id: string;
  // Personal
  name: string;
  gender: Gender;
  nationalId: string;
  phone: string;
  email: string;
  address: string;
  birthDate: string;    // yyyy-mm-dd
  photoUrl: string;
  // Employment
  jobTitle: string;
  employmentType: EmploymentType;
  hireDate: string;     // yyyy-mm-dd
  branch: string;
  notes: string;
  active: boolean;
  // Compensation
  basicSalary: number;
  commissionPct: number;  // 0-100
  allowances: Allowance[];
  // Skills
  specializations: StaffSpecialization[];
  // Meta
  createdAt: number;
  updatedAt: number;
}

/* -------- Service Catalog (salon specializations master list) -------- */
export interface ServiceCategory {
  id: string;
  label: string;
  services: { id: string; label: string }[];
}

export const SERVICE_CATALOG: ServiceCategory[] = [
  {
    id: "hair",
    label: "الشعر",
    services: [
      { id: "hair_cut", label: "قص الشعر" },
      { id: "hair_color", label: "صبغ الشعر" },
      { id: "hair_highlights", label: "هايلايت / بلاياج" },
      { id: "hair_blowout", label: "سيشوار وتصفيف" },
      { id: "hair_treatment", label: "علاج ومعالجة" },
      { id: "hair_keratin", label: "كيراتين وبروتين" },
      { id: "hair_extensions", label: "إكستنشن" },
      { id: "hair_updo", label: "تسريحات وشينيون" },
    ],
  },
  {
    id: "bridal",
    label: "العرائس",
    services: [
      { id: "bridal_makeup", label: "مكياج عروس" },
      { id: "bridal_hair", label: "تسريحة عروس" },
      { id: "bridal_package", label: "باقة عروس متكاملة" },
      { id: "engagement_makeup", label: "مكياج خطوبة" },
    ],
  },
  {
    id: "makeup",
    label: "المكياج",
    services: [
      { id: "makeup_evening", label: "مكياج سهرة" },
      { id: "makeup_soft", label: "مكياج ناعم" },
      { id: "makeup_smokey", label: "مكياج سموكي" },
      { id: "makeup_photoshoot", label: "مكياج تصوير" },
      { id: "lashes", label: "تركيب رموش" },
      { id: "brows", label: "تشقير وتحديد حواجب" },
    ],
  },
  {
    id: "skin",
    label: "العناية بالبشرة",
    services: [
      { id: "facial_deep", label: "تنظيف بشرة عميق" },
      { id: "facial_hydra", label: "هيدرافيشل" },
      { id: "peeling", label: "تقشير كيميائي" },
      { id: "mask", label: "ماسكات علاجية" },
      { id: "microdermabrasion", label: "ميكرودرمابريجن" },
    ],
  },
  {
    id: "nails",
    label: "الأظافر",
    services: [
      { id: "manicure", label: "مانيكير" },
      { id: "pedicure", label: "بديكير" },
      { id: "gel_polish", label: "جل بوليش" },
      { id: "acrylic", label: "أظافر أكريليك" },
      { id: "nail_art", label: "رسم أظافر" },
    ],
  },
  {
    id: "hair_removal",
    label: "إزالة الشعر",
    services: [
      { id: "wax_full", label: "شمع كامل الجسم" },
      { id: "wax_legs", label: "شمع أرجل" },
      { id: "wax_face", label: "شمع وجه" },
      { id: "threading", label: "خيط" },
      { id: "sugaring", label: "حلاوة" },
      { id: "laser", label: "ليزر" },
    ],
  },
  {
    id: "spa",
    label: "السبا والاسترخاء",
    services: [
      { id: "massage_relax", label: "مساج استرخاء" },
      { id: "massage_hot_stone", label: "مساج بالحجارة الساخنة" },
      { id: "body_scrub", label: "تقشير الجسم" },
      { id: "moroccan_bath", label: "حمام مغربي" },
      { id: "aromatherapy", label: "أروماثيرابي" },
    ],
  },
  {
    id: "henna",
    label: "الحناء والنقوش",
    services: [
      { id: "henna_bridal", label: "حناء عرائس" },
      { id: "henna_hands", label: "حناء يدين" },
      { id: "henna_feet", label: "حناء أرجل" },
    ],
  },
];

/** Flat lookup — id → { label, category } */
export function findServiceById(id: string) {
  for (const cat of SERVICE_CATALOG) {
    const svc = cat.services.find((s) => s.id === id);
    if (svc) return { ...svc, category: cat.label, categoryId: cat.id };
  }
  return undefined;
}

/* -------- Store -------- */
const KEY = "lamsa_staff_v1";
const DEFAULT_STAFF: Staff[] = [];

let state: Staff[] = DEFAULT_STAFF;
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
    console.error("staff-store: failed to load", err);
  }
}

function persist() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.error("staff-store: failed to persist", err);
    }
  }
  listeners.forEach((l) => {
    try { l(); } catch (err) { console.error(err); }
  });
}

export function useStaff(): Staff[] {
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
    () => (hydrated ? state : DEFAULT_STAFF),
    () => DEFAULT_STAFF,
  );
}

function uid() {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {}
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function emptyStaff(): Staff {
  const now = Date.now();
  return {
    id: uid(),
    name: "",
    gender: "female",
    nationalId: "",
    phone: "",
    email: "",
    address: "",
    birthDate: "",
    photoUrl: "",
    jobTitle: "",
    employmentType: "full_time",
    hireDate: new Date().toISOString().slice(0, 10),
    branch: "",
    notes: "",
    active: true,
    basicSalary: 0,
    commissionPct: 0,
    allowances: [],
    specializations: [],
    createdAt: now,
    updatedAt: now,
  };
}

export const staffActions = {
  empty: emptyStaff,
  create(partial: Partial<Staff> = {}): Staff {
    const rec: Staff = { ...emptyStaff(), ...partial, id: uid(), createdAt: Date.now(), updatedAt: Date.now() };
    state = [...state, rec];
    persist();
    return rec;
  },
  update(id: string, patch: Partial<Staff>) {
    state = state.map((s) => (s.id === id ? { ...s, ...patch, id: s.id, updatedAt: Date.now() } : s));
    persist();
  },
  remove(id: string) {
    state = state.filter((s) => s.id !== id);
    persist();
  },
  addAllowance(id: string, a: Omit<Allowance, "id">) {
    const item: Allowance = { ...a, id: uid() };
    state = state.map((s) => (s.id === id ? { ...s, allowances: [...s.allowances, item], updatedAt: Date.now() } : s));
    persist();
  },
  updateAllowance(id: string, allowId: string, patch: Partial<Allowance>) {
    state = state.map((s) =>
      s.id === id
        ? { ...s, allowances: s.allowances.map((a) => (a.id === allowId ? { ...a, ...patch, id: a.id } : a)), updatedAt: Date.now() }
        : s,
    );
    persist();
  },
  removeAllowance(id: string, allowId: string) {
    state = state.map((s) =>
      s.id === id ? { ...s, allowances: s.allowances.filter((a) => a.id !== allowId), updatedAt: Date.now() } : s,
    );
    persist();
  },
  addSpecialization(id: string, serviceId: string, rating = 3) {
    if (!findServiceById(serviceId)) return;
    state = state.map((s) => {
      if (s.id !== id) return s;
      if (s.specializations.some((sp) => sp.id === serviceId)) return s;
      return {
        ...s,
        specializations: [...s.specializations, { id: serviceId, rating: clampRating(rating) }],
        updatedAt: Date.now(),
      };
    });
    persist();
  },
  updateSpecializationRating(id: string, serviceId: string, rating: number) {
    state = state.map((s) =>
      s.id === id
        ? {
            ...s,
            specializations: s.specializations.map((sp) =>
              sp.id === serviceId ? { ...sp, rating: clampRating(rating) } : sp,
            ),
            updatedAt: Date.now(),
          }
        : s,
    );
    persist();
  },
  removeSpecialization(id: string, serviceId: string) {
    state = state.map((s) =>
      s.id === id
        ? { ...s, specializations: s.specializations.filter((sp) => sp.id !== serviceId), updatedAt: Date.now() }
        : s,
    );
    persist();
  },
};

function clampRating(r: number) {
  if (Number.isNaN(r)) return 1;
  return Math.max(1, Math.min(5, Math.round(r)));
}

export function totalSalary(s: Staff): number {
  const allowances = s.allowances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0);
  return (Number(s.basicSalary) || 0) + allowances;
}

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: "دوام كامل",
  part_time: "دوام جزئي",
  contract: "عقد مؤقت",
  trainee: "متدرّبة",
};
