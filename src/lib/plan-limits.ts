import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/use-account";

export interface PlanCaps {
  code: string;
  name: string;
  maxBranches: number;
  maxStaff: number;
  maxServices: number;
  maxCustomers: number;
  maxInvoices: number;
  hasWebsite: boolean;
  modules: string[];
}

export const UPGRADE_MSG = "الباقة الحالية لا تدعم هذه الميزة — يجب ترقية الاشتراك";

/** 0 (or a missing plan) means "unlimited". */
export function withinLimit(max: number | undefined, current: number): boolean {
  if (!max || max <= 0) return true;
  return current < max;
}

export function limitMessage(plan: PlanCaps | null, label: string, max: number): string {
  const name = plan?.name ? `«${plan.name}»` : "باقتك الحالية";
  return `${name} تسمح بـ ${max} ${label} فقط — الباقة لا تدعم المزيد، يجب ترقية الاشتراك.`;
}

export async function loadPlanCaps(salonId: string): Promise<PlanCaps | null> {
  const { data: salon } = await supabase
    .from("salons")
    .select("plan")
    .eq("id", salonId)
    .maybeSingle();
  if (!salon?.plan) return null;
  const { data: plan } = await supabase
    .from("platform_plans")
    .select(
      "code, name, max_branches, max_staff, max_services, max_customers, max_invoices, has_website, enabled_modules",
    )
    .eq("code", salon.plan)
    .maybeSingle();
  if (!plan) return null;
  return {
    code: plan.code,
    name: plan.name,
    maxBranches: plan.max_branches ?? 0,
    maxStaff: plan.max_staff ?? 0,
    maxServices: plan.max_services ?? 0,
    maxCustomers: plan.max_customers ?? 0,
    maxInvoices: plan.max_invoices ?? 0,
    hasWebsite: !!plan.has_website,
    modules: plan.enabled_modules ?? [],
  };
}

/** Plan caps of the signed-in user's salon; null while loading or for platform owners. */
export function usePlanCaps() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const q = useQuery({
    queryKey: ["plan-caps", salonId],
    queryFn: () => loadPlanCaps(salonId!),
    enabled: !!salonId,
    staleTime: 60_000,
  });
  return { plan: q.data ?? null, isLoading: q.isLoading };
}

/** Whether a dashboard module is included in the salon's plan. */
export function useModuleAllowed(module?: string): boolean {
  const { data: account } = useAccount();
  if (!module) return true;
  if (!account) return true;
  if (account.role === "platform_owner") return true;
  return account.enabledModules.includes(module);
}
