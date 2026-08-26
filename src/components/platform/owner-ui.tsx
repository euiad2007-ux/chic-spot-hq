import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { listSalonsOverview } from "@/lib/db/platform-repo";

/** Subscription status labels shared by every owner page. */
export const STATUS_LABEL: Record<string, string> = {
  trial: "تجربة",
  active: "نشط",
  past_due: "متأخر",
  canceled: "ملغى",
};

export interface PlanRow {
  id: string;
  code: string;
  name: string;
  price_monthly: number;
  max_branches: number;
  max_staff: number;
  max_services: number;
  max_customers: number;
  max_invoices: number;
  has_website: boolean;
  features: string[];
  enabled_modules: string[];
  is_active: boolean;
  sort_order: number;
}

export const money = (v: number) =>
  `${Number(v || 0).toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س`;

export const fmtDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString("ar-SA") : "—";

/** Human-readable data size. */
export function formatBytes(v: number): string {
  const n = Number(v) || 0;
  const units = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];
  let i = 0;
  let out = n;
  while (out >= 1024 && i < units.length - 1) {
    out /= 1024;
    i += 1;
  }
  return `${out.toLocaleString("ar-SA", { maximumFractionDigits: out < 10 ? 2 : 0 })} ${units[i]}`;
}

export function useSalonsOverview() {
  return useQuery({ queryKey: ["platform", "salons-overview"], queryFn: listSalonsOverview });
}

export function usePlans() {
  return useQuery({
    queryKey: ["platform", "plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_plans")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as PlanRow[];
    },
  });
}

export function FinanceCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "bad"
          ? "border-destructive/30 bg-destructive/5"
          : tone === "good"
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-card",
      )}
    >
      <div className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-2">
        <Wallet className="size-4 text-primary" /> {label}
      </div>
      <div className="mt-2 text-xl font-extrabold">{value}</div>
    </div>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

/** Compact metric tile used across the owner dashboard. */
export function OwnerStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}
