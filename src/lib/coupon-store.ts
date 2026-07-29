import { useSyncExternalStore } from "react";

export type CouponType = "fixed" | "percent";

export interface Coupon {
  id: string;
  code: string;           // uppercase, unique
  type: CouponType;
  value: number;          // amount SAR or percent (0-100)
  minTotal?: number;      // minimum subtotal to apply
  maxDiscount?: number;   // cap for percent-type
  activeFrom: string;     // ISO date
  expiresAt: string;      // ISO date
  usageLimit?: number;    // 0/undefined = unlimited
  usedCount: number;
  active: boolean;
  note?: string;
  createdAt: string;
}

const STORAGE_KEY = "lamsa_coupons_v1";
const uid = () => Math.random().toString(36).slice(2, 10);

function load(): Coupon[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : seed();
  } catch { return seed(); }
}
function persist() {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}
function seed(): Coupon[] {
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86400000);
  return [
    {
      id: uid(), code: "WELCOME10", type: "percent", value: 10,
      activeFrom: now.toISOString(), expiresAt: in30.toISOString(),
      usageLimit: 100, usedCount: 0, active: true, note: "خصم ترحيبي 10%",
      createdAt: now.toISOString(),
    },
    {
      id: uid(), code: "SAR50", type: "fixed", value: 50, minTotal: 200,
      activeFrom: now.toISOString(), expiresAt: in30.toISOString(),
      usageLimit: 50, usedCount: 0, active: true, note: "خصم 50 ريال عند 200+",
      createdAt: now.toISOString(),
    },
  ];
}

let state: Coupon[] = load();
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }

export function useCoupons(): Coupon[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
    () => state,
  );
}

export const couponActions = {
  add(c: Omit<Coupon, "id" | "usedCount" | "createdAt">): Coupon {
    const code = c.code.trim().toUpperCase();
    const dup = state.find((x) => x.code === code);
    if (dup) throw new Error("الكود مستخدم مسبقاً");
    const nc: Coupon = { ...c, code, id: uid(), usedCount: 0, createdAt: new Date().toISOString() };
    state = [nc, ...state]; persist(); emit();
    return nc;
  },
  update(id: string, patch: Partial<Coupon>) {
    state = state.map((c) => c.id === id ? { ...c, ...patch, code: (patch.code ?? c.code).toUpperCase() } : c);
    persist(); emit();
  },
  remove(id: string) { state = state.filter((c) => c.id !== id); persist(); emit(); },
  markUsed(code: string) {
    const cc = code.trim().toUpperCase();
    state = state.map((c) => c.code === cc ? { ...c, usedCount: c.usedCount + 1 } : c);
    persist(); emit();
  },
  get: () => state,
};

export interface CouponEval {
  ok: boolean;
  coupon?: Coupon;
  discount: number;
  error?: string;
}

// Evaluate a coupon code against a subtotal
export function evalCoupon(code: string, subtotal: number): CouponEval {
  const cc = (code ?? "").trim().toUpperCase();
  if (!cc) return { ok: false, discount: 0, error: "أدخل كود الخصم" };
  const c = state.find((x) => x.code === cc);
  if (!c) return { ok: false, discount: 0, error: "كود غير موجود" };
  if (!c.active) return { ok: false, discount: 0, error: "الكوبون غير مفعّل" };
  const now = Date.now();
  if (new Date(c.activeFrom).getTime() > now) return { ok: false, discount: 0, error: "الكوبون لم يبدأ بعد" };
  if (new Date(c.expiresAt).getTime() < now) return { ok: false, discount: 0, error: "الكوبون منتهي الصلاحية" };
  if (c.usageLimit && c.usedCount >= c.usageLimit) return { ok: false, discount: 0, error: "تم استنفاد حد الاستخدام" };
  if (c.minTotal && subtotal < c.minTotal) return { ok: false, discount: 0, error: `يتطلب حد أدنى ${c.minTotal} ريال` };
  let discount = c.type === "fixed" ? c.value : Math.round(subtotal * (c.value / 100) * 100) / 100;
  if (c.type === "percent" && c.maxDiscount) discount = Math.min(discount, c.maxDiscount);
  discount = Math.min(discount, subtotal);
  discount = Math.max(0, Math.round(discount * 100) / 100);
  return { ok: true, coupon: c, discount };
}
