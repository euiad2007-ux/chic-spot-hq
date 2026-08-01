import { supabase } from "@/integrations/supabase/client";
import { getDataContext } from "@/lib/db/context";
import { diffSync, enqueue, debounce, num, str } from "@/lib/db/sync";
import type { Coupon } from "@/lib/coupon-store";

type Row = Record<string, unknown> & { id: string };

let snap: Row[] = [];
let ready = false;

const toRow = (c: Coupon, salon_id: string): Row => ({
  id: c.id,
  salon_id,
  code: c.code,
  kind: c.type,
  value: c.value,
  min_total: c.minTotal ?? 0,
  max_uses: c.usageLimit ?? null,
  used_count: c.usedCount ?? 0,
  starts_at: c.activeFrom || null,
  ends_at: c.expiresAt || null,
  active: c.active,
  note: c.note ?? null,
});

export async function loadCoupons(salonId: string): Promise<Coupon[]> {
  const { data } = await supabase
    .from("coupons")
    .select("*")
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false });
  const coupons: Coupon[] = (data ?? []).map((r) => ({
    id: r.id,
    code: str(r.code),
    type: (str(r.kind, "fixed") === "percent" ? "percent" : "fixed") as Coupon["type"],
    value: num(r.value),
    minTotal: num(r.min_total),
    activeFrom: str(r.starts_at, new Date().toISOString()),
    expiresAt: str(r.ends_at, new Date(Date.now() + 30 * 86400000).toISOString()),
    usageLimit: r.max_uses === null ? undefined : num(r.max_uses),
    usedCount: num(r.used_count),
    active: r.active !== false,
    note: r.note ?? undefined,
    createdAt: str(r.created_at),
  }));
  snap = coupons.map((c) => toRow(c, salonId));
  ready = true;
  return coupons;
}

let pendingCoupons: Coupon[] | null = null;

const flush = debounce(() => {
  const coupons = pendingCoupons;
  pendingCoupons = null;
  const ctx = getDataContext();
  if (!coupons || !ctx?.salonId || !ready) return;
  const salonId = ctx.salonId;
  void enqueue(async () => {
    const next = coupons.map((c) => toRow(c, salonId));
    const prev = snap;
    snap = next;
    await diffSync("coupons", next, prev);
  });
}, 300);

export function scheduleCouponSave(coupons: Coupon[]) {
  pendingCoupons = coupons;
  flush();
}
