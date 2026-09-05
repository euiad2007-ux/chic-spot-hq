import { Check, Crown, Globe, Sparkles, X } from "lucide-react";

import type { PublicPlan } from "@/lib/db/platform-settings-repo";
import { cn } from "@/lib/utils";
import {
  planCardStyleVars,
  planPriceStyle,
  planTitleStyle,
  type PlatformTheme,
} from "@/lib/platform-theme";


const MODULE_LABEL: Record<string, string> = {
  bookings: "الحجوزات",
  calendar: "التقويم",
  customers: "العملاء",
  services: "الخدمات",
  staff: "الموظفون",
  invoices: "الفواتير",
  pos: "نقطة البيع",
  cash: "الصندوق والورديات",
  expenses: "المصروفات",
  reports: "التقارير",
  inventory: "المخزون والجرد",
  payroll: "الرواتب والعمولات",
  attendance: "الحضور والانصراف",
  coupons: "الكوبونات",
  ledger: "السجل المالي",
  branches: "الفروع",
  booking_settings: "ضبط الحجز",
  invoice_settings: "ضبط الفواتير",
  site_settings: "إعدادات الموقع",
  accounting: "البرنامج المحاسبي",
  assets: "الأصول الثابتة",
  users: "المستخدمون والصلاحيات",
  activity_log: "سجل النشاط",
  branch_audit: "سجل تدقيق الفروع",
};


export function moduleLabel(code: string): string {
  return MODULE_LABEL[code] ?? code;
}

const num = (v: number) => (v && v > 0 ? String(v) : "غير محدود");

/** Public pricing grid used on the landing page and the merchant subscription page. */
export function PlansShowcase({
  plans,
  currentCode,
  title,
  note,
  cardStyle,
  theme,
}: {
  plans: PublicPlan[];
  currentCode?: string | null;
  title?: string;
  note?: string;
  /** Visual style chosen by the platform owner. */
  cardStyle?: string;
  /** Colors and fonts chosen by the platform owner. */
  theme?: PlatformTheme;
}) {
  if (plans.length === 0) return null;
  // The middle plan is highlighted as the recommended one, unless the viewer is
  // already subscribed to a specific plan.
  const featuredIndex = currentCode
    ? plans.findIndex((p) => p.code === currentCode)
    : Math.min(1, plans.length - 1);

  return (
    <section className="space-y-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
          <Sparkles className="size-3.5" /> اشتراك مرن — رقّ أو خفّض في أي وقت
        </span>
        <h2 className="mt-4 text-2xl font-extrabold sm:text-4xl">{title || "باقات الاشتراك"}</h2>
        {note && (
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {note}
          </p>
        )}
      </div>

      <div className="grid items-stretch gap-5 md:grid-cols-3">
        {plans.map((p, i) => {
          const current = currentCode === p.code;
          const featured = i === featuredIndex;
          return (
            <article
              key={p.code}
              style={planCardStyleVars(theme)}
              className={cn(
                "relative flex flex-col gap-5 rounded-3xl p-6 transition-transform duration-300",
                "plan-ring bg-card",
                featured
                  ? "card-glow md:-translate-y-3 md:scale-[1.03]"
                  : "hover:-translate-y-1.5",
                cardStyle === "glass" && "glass-card",
              )}
            >
              {(featured || current) && (
                <span className="absolute -top-3 right-6 rounded-full bg-gradient-to-l from-primary to-accent px-3 py-1 text-[11px] font-extrabold text-primary-foreground shadow-lg">
                  {current ? "باقتك الحالية" : "الأكثر اختيارًا"}
                </span>
              )}

              <div className="space-y-3">
                <span
                  className={cn(
                    "inline-flex size-11 items-center justify-center rounded-2xl",
                    featured
                      ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  <Crown className="size-5" />
                </span>
                <h3 className="text-lg font-extrabold" style={planTitleStyle(theme)}>
                  {p.name}
                </h3>
                <div className="flex items-end gap-1.5">
                  <span
                    className={cn(
                      "text-4xl font-extrabold leading-none",
                      featured && "gradient-text",
                    )}
                    style={planPriceStyle(theme)}
                  >
                    {Number(p.price_monthly)}
                  </span>
                  <span className="pb-1 text-xs text-muted-foreground">ر.س / شهريًا</span>
                </div>
              </div>

              <div className="hairline" />

              <ul className="space-y-2 text-sm">
                <Limit label="الفروع" value={num(p.max_branches)} />
                <Limit label="الموظفون" value={num(p.max_staff)} />
                <Limit label="الخدمات" value={num(p.max_services)} />
                <Limit label="العملاء" value={num(p.max_customers)} />
                <Limit label="الفواتير شهريًا" value={num(p.max_invoices)} />
                <li className="flex items-center gap-2 pt-1">
                  {p.has_website ? (
                    <Globe className="size-3.5 text-primary" />
                  ) : (
                    <X className="size-3.5 text-muted-foreground" />
                  )}
                  <span className={p.has_website ? "font-semibold" : "text-muted-foreground"}>
                    موقع إلكتروني للمشغل
                  </span>
                </li>
              </ul>

              <div className="rounded-2xl bg-muted/40 p-3">
                <div className="mb-2 text-xs font-bold text-muted-foreground">الأقسام المتاحة</div>
                <div className="flex flex-wrap gap-1.5">
                  {(p.enabled_modules ?? []).map((m) => (
                    <span
                      key={m}
                      className="rounded-full border border-border bg-background/70 px-2.5 py-1 text-[11px] font-medium"
                    >
                      {moduleLabel(m)}
                    </span>
                  ))}
                </div>
              </div>

              {(p.features ?? []).length > 0 && (
                <ul className="space-y-2 border-t border-border/70 pt-4 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/15">
                        <Check className="size-3 text-primary" />
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </li>
  );
}
