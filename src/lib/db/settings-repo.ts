import { supabase } from "@/integrations/supabase/client";
import { getDataContext } from "@/lib/db/context";
import { enqueue, logDbError, debounce } from "@/lib/db/sync";

export type SettingsColumn = "site" | "booking" | "rewards" | "payroll" | "invoice";

export interface SettingsBundle {
  site: Record<string, unknown> | null;
  booking: Record<string, unknown> | null;
  rewards: Record<string, unknown> | null;
  payroll: Record<string, unknown> | null;
  invoice: Record<string, unknown> | null;
}

/** Reads the settings documents that belong to a salon. */
export async function loadSettingsBundle(salonId: string): Promise<SettingsBundle> {
  const { data, error } = await supabase
    .from("salon_settings")
    .select("site, booking, rewards, payroll, invoice")
    .eq("salon_id", salonId)
    .maybeSingle();
  logDbError("load salon_settings", error);
  if (error) throw error;
  const pick = (v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    site: pick(row["site"]),
    booking: pick(row["booking"]),
    rewards: pick(row["rewards"]),
    payroll: pick(row["payroll"]),
    invoice: pick(row["invoice"]),
  };
}


const pending: Partial<Record<SettingsColumn, unknown>> = {};

const flush = debounce(() => {
  const ctx = getDataContext();
  const salonId = ctx?.salonId;
  const patch = { ...pending };
  for (const k of Object.keys(pending)) delete pending[k as SettingsColumn];
  if (!salonId || !ctx?.canWrite || !Object.keys(patch).length) return;
  void enqueue(async () => {
    const { error } = await supabase
      .from("salon_settings")
        .upsert({ salon_id: salonId, ...patch, updated_at: new Date().toISOString() } as never, { onConflict: "salon_id" });
    logDbError("save salon_settings", error);
  });
}, 400);

/** Persists one settings document (debounced). */
export function scheduleSettingsSave(column: SettingsColumn, value: unknown) {
  pending[column] = value;
  flush();
}

/** Persists one settings document immediately; throws when the write fails. */
export async function saveSettingsNow(column: SettingsColumn, value: unknown) {
  const ctx = getDataContext();
  const salonId = ctx?.salonId;
  if (!salonId) throw new Error("لا يوجد مشغل مرتبط بالحساب");
  if (!ctx?.canWrite) throw new Error("لا تملك صلاحية تعديل إعدادات الموقع");
  delete pending[column];
  await enqueue(async () => {
    const { error } = await supabase
      .from("salon_settings")
      .upsert({ salon_id: salonId, [column]: value, updated_at: new Date().toISOString() } as never, { onConflict: "salon_id" });
    if (error) throw new Error(error.message);
  });
}
