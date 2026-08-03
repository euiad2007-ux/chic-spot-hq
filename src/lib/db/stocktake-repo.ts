import { supabase } from "@/integrations/supabase/client";

export interface StocktakeItem {
  id: string;
  name: string;
  unit: string;
  stock: number;
  cost_per_unit: number;
}

export interface Stocktake {
  id: string;
  branch_id: string | null;
  counted_on: string;
  note: string | null;
  status: string;
  diff_qty: number;
  diff_value: number;
  applied_at: string | null;
  created_at: string;
}

export interface StocktakeLine {
  id: string;
  item_id: string;
  system_qty: number;
  counted_qty: number;
  diff_qty: number;
  cost_per_unit: number;
}

export interface NewLine {
  item_id: string;
  system_qty: number;
  counted_qty: number;
  cost_per_unit: number;
}

/** Inventory items with their current system quantity, used as the count sheet. */
export async function listCountableItems(salonId: string): Promise<StocktakeItem[]> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id,name,unit,stock,cost_per_unit")
    .eq("salon_id", salonId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    unit: r.unit,
    stock: Number(r.stock),
    cost_per_unit: Number(r.cost_per_unit),
  }));
}

export async function listStocktakes(salonId: string, limit = 30): Promise<Stocktake[]> {
  const { data, error } = await supabase
    .from("inventory_stocktakes")
    .select("id,branch_id,counted_on,note,status,diff_qty,diff_value,applied_at,created_at")
    .eq("salon_id", salonId)
    .order("counted_on", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    branch_id: r.branch_id,
    counted_on: r.counted_on,
    note: r.note,
    status: r.status,
    diff_qty: Number(r.diff_qty),
    diff_value: Number(r.diff_value),
    applied_at: r.applied_at,
    created_at: r.created_at,
  }));
}

export async function listStocktakeLines(stocktakeId: string): Promise<StocktakeLine[]> {
  const { data, error } = await supabase
    .from("inventory_stocktake_lines")
    .select("id,item_id,system_qty,counted_qty,diff_qty,cost_per_unit")
    .eq("stocktake_id", stocktakeId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    id: r.id,
    item_id: r.item_id,
    system_qty: Number(r.system_qty),
    counted_qty: Number(r.counted_qty),
    diff_qty: Number(r.diff_qty),
    cost_per_unit: Number(r.cost_per_unit),
  }));
}

/** Saves a draft count sheet. Stock is only touched by `applyStocktake`. */
export async function createStocktake(
  salonId: string,
  args: { branch_id: string | null; counted_on: string; note: string; lines: NewLine[] },
): Promise<string> {
  const counted = args.lines.filter((l) => l.counted_qty !== l.system_qty);
  const rows = (counted.length ? counted : args.lines).map((l) => ({
    ...l,
    diff_qty: Number((l.counted_qty - l.system_qty).toFixed(4)),
  }));
  const diffQty = rows.reduce((a, l) => a + l.diff_qty, 0);
  const diffValue = rows.reduce((a, l) => a + l.diff_qty * l.cost_per_unit, 0);

  const { data, error } = await supabase
    .from("inventory_stocktakes")
    .insert({
      salon_id: salonId,
      branch_id: args.branch_id,
      counted_on: args.counted_on,
      note: args.note || null,
      status: "draft",
      diff_qty: Number(diffQty.toFixed(4)),
      diff_value: Number(diffValue.toFixed(2)),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const stocktakeId = data.id as string;

  if (rows.length) {
    const { error: linesError } = await supabase.from("inventory_stocktake_lines").insert(
      rows.map((l) => ({
        salon_id: salonId,
        stocktake_id: stocktakeId,
        item_id: l.item_id,
        system_qty: l.system_qty,
        counted_qty: l.counted_qty,
        diff_qty: l.diff_qty,
        cost_per_unit: l.cost_per_unit,
      })),
    );
    if (linesError) throw new Error(linesError.message);
  }
  return stocktakeId;
}

/** Applies the counted quantities to real stock inside one transaction. */
export async function applyStocktake(stocktakeId: string) {
  const { error } = await supabase.rpc("apply_stocktake", { p_stocktake_id: stocktakeId });
  if (error) throw new Error(error.message);
}

export async function deleteStocktake(stocktakeId: string) {
  const { error } = await supabase.from("inventory_stocktakes").delete().eq("id", stocktakeId);
  if (error) throw new Error(error.message);
}
