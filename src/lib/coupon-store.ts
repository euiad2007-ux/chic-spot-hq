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

const uid = () => crypto.randomUUID();

let state: Coupon[] = [];
const EMPTY: Coupon[] = [];
let hydrated = false;
const listeners = new Set<() => void>();
function emit() { for (const l of listeners) l(); }

function persist() {
  if (typeof window === "undefined") return;
  const current = state;
  void import("@/lib/db/coupons-repo").then((m) => m.scheduleCouponSave(current));
}

/** Called once by the data layer with the salon's coupons. */
export function hydrateCouponStore(list: Coupon[]) {
  state = list;
  hydrated = true;
  emit();
}

export function useCoupons(): Coupon[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      if (!hydrated) {
        hydrated = true;
        queueMicrotask(() => emit());
      }
      return () => listeners.delete(cb);
    },
    () => (hydrated ? state : EMPTY),
    () => EMPTY,
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
