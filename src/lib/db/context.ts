import { supabase } from "@/integrations/supabase/client";
import { loadAccount, canManage, type AppRole } from "@/lib/account";

export interface DataContext {
  userId: string;
  salonId: string | null;
  role: AppRole;
  canWrite: boolean;
  staffId: string | null;
  customerId: string | null;
}

let ctx: DataContext | null = null;
let pending: Promise<DataContext | null> | null = null;

/** Resolves (once) the tenant context used by every repository call. */
export async function initDataContext(force = false): Promise<DataContext | null> {
  if (ctx && !force) return ctx;
  if (pending && !force) return pending;
  pending = (async () => {
    const account = await loadAccount();
    if (!account) {
      ctx = null;
      return null;
    }
    let customerId = account.customerId;
    let salonId = account.salonId;
    // A brand-new signed-in person (e.g. first Google login) has no membership
    // and no customer row yet — provision one so their dashboard is not empty.
    if (!salonId && !customerId) {
      const { data } = await supabase.rpc("ensure_client_profile");
      if (data) customerId = data as string;
    }
    if (!salonId && customerId) {
      const { data: row } = await supabase
        .from("customers")
        .select("salon_id")
        .eq("id", customerId)
        .maybeSingle();
      salonId = row?.salon_id ?? null;
    }
    ctx = {
      userId: account.userId,
      salonId,
      role: account.role,
      canWrite: canManage(account.role),
      staffId: account.staffId,
      customerId,
    };
    return ctx;
  })();
  const result = await pending;
  pending = null;
  return result;
}

export function getDataContext(): DataContext | null {
  return ctx;
}

export function requireSalonId(): string {
  const id = ctx?.salonId;
  if (!id) throw new Error("لا يوجد مشغل مرتبط بالحساب");
  return id;
}

export function clearDataContext() {
  ctx = null;
  pending = null;
}
