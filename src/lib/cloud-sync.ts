import { supabase } from "@/integrations/supabase/client";

/**
 * طبقة المزامنة السحابية.
 * تحفظ كل بيانات النظام في قاعدة البيانات (جدول app_state) بدل المتصفح فقط،
 * وتقرأها عند فتح الموقع على أي جهاز.
 */

// المفاتيح التي تتم مزامنتها (جلسة الدخول تبقى محلية لكل جهاز)
export const SYNCED_KEYS = [
  "lamsa_salon_v2",
  "lamsa_site_settings_v4",
  "lamsa_booking_settings_v1",
  "lamsa_coupons_v1",
  "lamsa_rewards_v1",
  "lamsa_payroll_v1",
  "lamsa_attendance_v1",
  "lamsa_custom_measures_v1",
] as const;

const RELOAD_FLAG = "lamsa_cloud_boot_v1";

let installed = false;
let booted = false;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function isCloudReady() {
  return booted;
}

async function pushKey(key: string, raw: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return;
  }
  const { error } = await supabase
    .from("app_state")
    .upsert({ key, data: parsed as never }, { onConflict: "key" });
  if (error) console.error("[cloud-sync] push failed", key, error.message);
}

function schedulePush(key: string, raw: string) {
  const existing = timers.get(key);
  if (existing) clearTimeout(existing);
  timers.set(
    key,
    setTimeout(() => {
      timers.delete(key);
      void pushKey(key, raw);
    }, 600),
  );
}

function installWriteHook() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = window.localStorage.setItem.bind(window.localStorage);
  window.localStorage.setItem = (key: string, value: string) => {
    original(key, value);
    if ((SYNCED_KEYS as readonly string[]).includes(key)) schedulePush(key, value);
  };
}

/** يسحب البيانات من السحابة ثم يفعّل الحفظ التلقائي. */
export async function bootstrapCloud(): Promise<void> {
  if (typeof window === "undefined" || booted) return;
  booted = true;

  try {
    const { data, error } = await supabase
      .from("app_state")
      .select("key,data")
      .in("key", SYNCED_KEYS as unknown as string[]);

    if (error) throw error;

    const rows = data ?? [];
    const cloudKeys = new Set(rows.map((r) => r.key));
    let changed = false;

    for (const row of rows) {
      const next = JSON.stringify(row.data);
      if (window.localStorage.getItem(row.key) !== next) {
        window.localStorage.setItem(row.key, next);
        changed = true;
      }
    }

    installWriteHook();

    // أول رفع للبيانات المحلية غير الموجودة في السحابة
    for (const key of SYNCED_KEYS) {
      if (cloudKeys.has(key)) continue;
      const raw = window.localStorage.getItem(key);
      if (raw) void pushKey(key, raw);
    }

    // إعادة تحميل مرة واحدة فقط لعرض بيانات السحابة الطازجة
    if (changed && !window.sessionStorage.getItem(RELOAD_FLAG)) {
      window.sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
    }
  } catch (e) {
    console.error("[cloud-sync] bootstrap failed", e);
    installWriteHook();
  }
}
