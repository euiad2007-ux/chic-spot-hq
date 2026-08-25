import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Crown, CheckCircle2, AlertTriangle } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { SalonLinksPanel } from "@/components/salon/salon-links-panel";
import {
  MerchantSubscriptionInvoices,
  MerchantSupport,
} from "@/components/salon/merchant-subscription-panels";

import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import { loadSubscription } from "@/lib/db/ops-repo";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({
    meta: [
      { title: "الاشتراك والباقة — حدود المشغل واستهلاكها | Salon Flow" },
      {
        name: "description",
        content:
          "حالة اشتراك المشغل، سعر الباقة، تاريخ الانتهاء، الميزات المتاحة، واستهلاك حدود الفروع والموظفين والخدمات والعملاء.",
      },
      { property: "og:title", content: "الاشتراك والباقة — Salon Flow" },
      { property: "og:description", content: "متابعة الباقة وحدود الاستخدام والميزات المتاحة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubscriptionPage,
});

const STATUS_LABEL: Record<string, string> = {
  trial: "فترة تجريبية",
  active: "نشط",
  past_due: "متأخر السداد",
  canceled: "ملغى",
  suspended: "موقوف",
};

function SubscriptionPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;

  const sub = useQuery({
    queryKey: ["subscription", salonId],
    queryFn: () => loadSubscription(salonId!),
    enabled: !!salonId,
  });
  const d = sub.data;
  const plan = d?.plan;

  const fmtDate = (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString("ar-SA") : "—";

  return (
    <AppShell title="الاشتراك والباقة" subtitle="حالة الاشتراك وحدود الباقة واستهلاكها">
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-bold flex items-center gap-2">
            <Crown className="size-4 text-primary" /> {plan?.name ?? d?.salon?.plan ?? "—"}
          </h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Cell label="الحالة" value={STATUS_LABEL[d?.salon?.subscription_status ?? ""] ?? "—"} />
            <Cell
              label="السعر الشهري"
              value={plan ? formatSAR(Number(plan.price_monthly)) : "—"}
            />
            <Cell label="نهاية التجربة" value={fmtDate(d?.salon?.trial_ends_at)} />
            <Cell label="نهاية الاشتراك" value={fmtDate(d?.salon?.subscription_ends_at)} />
          </div>
          {d?.salon?.is_suspended && (
            <p className="text-sm text-destructive inline-flex items-center gap-2">
              <AlertTriangle className="size-4" /> الحساب موقوف — تواصل مع إدارة المنصة.
            </p>
          )}
          {plan && plan.features.length > 0 && (
            <ul className="space-y-1 text-sm">
              {plan.features.map((f) => (
                <li key={f} className="inline-flex items-center gap-2 w-full">
                  <CheckCircle2 className="size-3.5 text-primary" /> {f}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <h2 className="font-bold">استهلاك الحدود</h2>
          <Usage label="الفروع" used={d?.usage.branches ?? 0} max={plan?.max_branches} />
          <Usage label="الموظفون" used={d?.usage.staff ?? 0} max={plan?.max_staff} />
          <Usage label="الخدمات" used={d?.usage.services ?? 0} max={plan?.max_services} />
          <Usage label="العملاء" used={d?.usage.customers ?? 0} max={plan?.max_customers} />
        </section>

        <div className="lg:col-span-2">
          <PlansShowcase
            plans={publicPlans.data ?? []}
            currentCode={d?.salon?.plan ?? null}
            title="الباقات المتاحة"
            note="ترقية الباقة تُنفَّذ من إدارة المنصة — حوّل قيمة الباقة على الحساب البنكي أدناه ثم تواصل معنا."
          />
        </div>

        <div className="lg:col-span-2">
          {settings.data && <PlatformContactCard settings={settings.data} />}
        </div>
      </div>


      <div className="mt-4 grid gap-4 lg:grid-cols-2 items-start">
        <MerchantSubscriptionInvoices salonId={salonId} />
        <MerchantSupport salonId={salonId} />
      </div>

      <div className="mt-4">
        <SalonLinksPanel salonId={salonId} />
      </div>
    </AppShell>
  );
}


function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold mt-1">{value}</div>
    </div>
  );
}

function Usage({ label, used, max }: { label: string; used: number; max?: number }) {
  const limit = max && max > 0 ? max : null;
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">
          {used} / {limit ?? "غير محدود"}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={"h-full " + (pct >= 100 ? "bg-destructive" : "bg-primary")}
          style={{ width: `${limit ? pct : 4}%` }}
        />
      </div>
    </div>
  );
}
