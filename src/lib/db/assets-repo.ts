import { supabase } from "@/integrations/supabase/client";

export interface FixedAsset {
  id: string;
  name: string;
  category: string | null;
  acquired_on: string;
  cost: number;
  salvage_value: number;
  useful_life_months: number;
  status: "active" | "disposed";
  disposed_on: string | null;
  disposal_amount: number;
  note: string | null;
}

export interface AssetInput {
  id?: string;
  name: string;
  category?: string | null;
  acquired_on: string;
  cost: number;
  salvage_value: number;
  useful_life_months: number;
  note?: string | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function listAssets(salonId: string): Promise<FixedAsset[]> {
  const { data, error } = await supabase
    .from("fixed_assets")
    .select(
      "id,name,category,acquired_on,cost,salvage_value,useful_life_months,status,disposed_on,disposal_amount,note",
    )
    .eq("salon_id", salonId)
    .order("acquired_on", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((a) => ({
    ...a,
    cost: Number(a.cost),
    salvage_value: Number(a.salvage_value),
    disposal_amount: Number(a.disposal_amount),
  })) as FixedAsset[];
}

export async function saveAsset(salonId: string, input: AssetInput): Promise<void> {
  const row = {
    salon_id: salonId,
    name: input.name.trim(),
    category: input.category?.trim() || null,
    acquired_on: input.acquired_on,
    cost: Math.max(0, input.cost),
    salvage_value: Math.max(0, input.salvage_value),
    useful_life_months: Math.max(1, Math.round(input.useful_life_months)),
    note: input.note?.trim() || null,
  };
  const q = input.id
    ? supabase.from("fixed_assets").update(row).eq("id", input.id)
    : supabase.from("fixed_assets").insert(row);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export async function disposeAsset(id: string, on: string, amount: number): Promise<void> {
  const { error } = await supabase
    .from("fixed_assets")
    .update({ status: "disposed", disposed_on: on, disposal_amount: Math.max(0, amount) })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from("fixed_assets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function postDepreciation(
  salonId: string,
  period: string,
): Promise<{ period: string; assets: number; amount: number }> {
  const { data, error } = await supabase.rpc("post_depreciation", {
    _salon: salonId,
    _period: period,
  });
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as { period?: string; assets?: number; amount?: number };
  return { period: d.period ?? period, assets: Number(d.assets ?? 0), amount: Number(d.amount ?? 0) };
}

/** Accumulated depreciation already posted per asset. */
export async function loadPostedDepreciation(salonId: string): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("source_id,amount")
    .eq("salon_id", salonId)
    .eq("source", "depreciation")
    .limit(5000);
  if (error) throw new Error(error.message);
  const map = new Map<string, number>();
  for (const e of data ?? []) {
    if (!e.source_id) continue;
    map.set(e.source_id, r2((map.get(e.source_id) ?? 0) + Number(e.amount)));
  }
  return map;
}

/** Straight-line monthly charge for an asset. */
export function monthlyCharge(a: FixedAsset): number {
  return r2(Math.max(0, a.cost - a.salvage_value) / Math.max(1, a.useful_life_months));
}

export function bookValue(a: FixedAsset, accumulated: number): number {
  return r2(Math.max(a.salvage_value, a.cost - accumulated));
}
