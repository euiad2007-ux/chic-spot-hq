import { supabase } from "@/integrations/supabase/client";

/* ------------------------------- settings -------------------------------- */

export interface InventorySettings {
  /** Days between two required stocktakes. 0 disables the periodic reminder. */
  cycleDays: number;
  /** Warn when an item's stock falls to or below its minimum level. */
  lowStockAlerts: boolean;
  /** Warn this many days before the next stocktake is due. */
  remindBeforeDays: number;
  /** Treat items with zero stock as critical alerts. */
  outOfStockAlerts: boolean;
}

export const INVENTORY_DEFAULTS: InventorySettings = {
  cycleDays: 30,
  lowStockAlerts: true,
  remindBeforeDays: 3,
  outOfStockAlerts: true,
};

function normalize(raw: unknown): InventorySettings {
  const o = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const num = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  return {
    cycleDays: num(o.cycleDays, INVENTORY_DEFAULTS.cycleDays),
    remindBeforeDays: num(o.remindBeforeDays, INVENTORY_DEFAULTS.remindBeforeDays),
    lowStockAlerts: o.lowStockAlerts === undefined ? INVENTORY_DEFAULTS.lowStockAlerts : !!o.lowStockAlerts,
    outOfStockAlerts:
      o.outOfStockAlerts === undefined ? INVENTORY_DEFAULTS.outOfStockAlerts : !!o.outOfStockAlerts,
  };
}

export async function loadInventorySettings(salonId: string): Promise<InventorySettings> {
  const { data, error } = await supabase
    .from("salon_settings")
    .select("inventory")
    .eq("salon_id", salonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return normalize(data?.inventory);
}

export async function saveInventorySettings(salonId: string, value: InventorySettings) {
  const { error } = await supabase
    .from("salon_settings")
    .upsert({ salon_id: salonId, inventory: value as never }, { onConflict: "salon_id" });
  if (error) throw new Error(error.message);
}

/* -------------------------------- alerts --------------------------------- */

export type AlertLevel = "critical" | "warning";

export interface StockAlert {
  item_id: string;
  name: string;
  unit: string;
  stock: number;
  min_stock: number;
  level: AlertLevel;
  message: string;
}

export interface CycleStatus {
  cycleDays: number;
  lastCountedOn: string | null;
  nextDueOn: string | null;
  daysLeft: number | null;
  state: "off" | "ok" | "due_soon" | "overdue" | "never";
}

export interface InventoryAlerts {
  settings: InventorySettings;
  cycle: CycleStatus;
  stock: StockAlert[];
  criticalCount: number;
}

const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const dayDiff = (a: string, b: string) =>
  Math.round((new Date(`${a}T00:00:00`).getTime() - new Date(`${b}T00:00:00`).getTime()) / 86_400_000);

/** Low-stock warnings plus the periodic stocktake due-date status. */
export async function loadInventoryAlerts(salonId: string): Promise<InventoryAlerts> {
  const today = new Date().toISOString().slice(0, 10);

  const [settingsRes, itemsRes, lastRes] = await Promise.all([
    loadInventorySettings(salonId),
    supabase
      .from("inventory_items")
      .select("id,name,unit,stock,min_stock")
      .eq("salon_id", salonId)
      .order("name"),
    supabase
      .from("inventory_stocktakes")
      .select("counted_on")
      .eq("salon_id", salonId)
      .eq("status", "applied")
      .order("counted_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (itemsRes.error) throw new Error(itemsRes.error.message);

  const settings = settingsRes;
  const items = itemsRes.data ?? [];

  const stock: StockAlert[] = [];
  for (const it of items) {
    const qty = Number(it.stock);
    const min = Number(it.min_stock ?? 0);
    if (settings.outOfStockAlerts && qty <= 0) {
      stock.push({
        item_id: it.id,
        name: it.name,
        unit: it.unit,
        stock: qty,
        min_stock: min,
        level: "critical",
        message: "نفدت الكمية بالكامل",
      });
      continue;
    }
    if (settings.lowStockAlerts && min > 0 && qty <= min) {
      stock.push({
        item_id: it.id,
        name: it.name,
        unit: it.unit,
        stock: qty,
        min_stock: min,
        level: "warning",
        message: `الرصيد وصل الحد الأدنى (${min})`,
      });
    }
  }

  const lastCountedOn = (lastRes.data?.counted_on as string | undefined) ?? null;
  let cycle: CycleStatus;
  if (settings.cycleDays <= 0) {
    cycle = { cycleDays: 0, lastCountedOn, nextDueOn: null, daysLeft: null, state: "off" };
  } else if (!lastCountedOn) {
    cycle = {
      cycleDays: settings.cycleDays,
      lastCountedOn: null,
      nextDueOn: today,
      daysLeft: 0,
      state: "never",
    };
  } else {
    const nextDueOn = addDays(lastCountedOn, settings.cycleDays);
    const daysLeft = dayDiff(nextDueOn, today);
    cycle = {
      cycleDays: settings.cycleDays,
      lastCountedOn,
      nextDueOn,
      daysLeft,
      state: daysLeft < 0 ? "overdue" : daysLeft <= settings.remindBeforeDays ? "due_soon" : "ok",
    };
  }

  return {
    settings,
    cycle,
    stock,
    criticalCount:
      stock.filter((s) => s.level === "critical").length +
      (cycle.state === "overdue" || cycle.state === "never" ? 1 : 0),
  };
}

/* ---------------------------- stock movements ----------------------------- */

export type StockMoveKind = "purchase" | "consume" | "adjust" | "waste" | "return";

export const STOCK_KIND_LABEL: Record<StockMoveKind, string> = {
  purchase: "شراء / إضافة",
  consume: "استهلاك / بيع",
  adjust: "تسوية جرد",
  waste: "تلف",
  return: "إرجاع",
};

export interface StockMovement {
  id: string;
  item_id: string;
  item_name: string;
  unit: string;
  qty: number;
  kind: StockMoveKind;
  unit_cost: number;
  value: number;
  reason: string | null;
  created_at: string;
}

export interface StockLogFilter {
  from?: string;
  to?: string;
  itemId?: string;
  kind?: StockMoveKind | "";
  limit?: number;
}

/** Full audit trail of every quantity change in the warehouse. */
export async function listStockMovements(
  salonId: string,
  filter: StockLogFilter = {},
): Promise<StockMovement[]> {
  let q = supabase
    .from("stock_movements")
    .select("id,item_id,qty,kind,unit_cost,reason,created_at,inventory_items(name,unit)")
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false })
    .limit(filter.limit ?? 300);

  if (filter.from) q = q.gte("created_at", `${filter.from}T00:00:00`);
  if (filter.to) q = q.lte("created_at", `${filter.to}T23:59:59`);
  if (filter.itemId) q = q.eq("item_id", filter.itemId);
  if (filter.kind) q = q.eq("kind", filter.kind);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => {
    const rel = r.inventory_items as { name: string; unit: string } | null;
    const qty = Number(r.qty);
    const cost = Number(r.unit_cost ?? 0);
    return {
      id: r.id,
      item_id: r.item_id,
      item_name: rel?.name ?? "—",
      unit: rel?.unit ?? "",
      qty,
      kind: (r.kind ?? "adjust") as StockMoveKind,
      unit_cost: cost,
      value: Math.round(qty * cost * 100) / 100,
      reason: r.reason,
      created_at: r.created_at,
    };
  });
}
