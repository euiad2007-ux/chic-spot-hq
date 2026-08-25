import { Check, Crown, Globe, X } from "lucide-react";

import type { PublicPlan } from "@/lib/db/platform-settings-repo";

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
  booking_settings: "ضبط الحجز",
  site_settings: "إعدادات الموقع",
  accounting: "البرنامج المحاسبي",
  assets: "الأصول الثابتة",
  users: "المستخدمون والصلاحيات",
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
}: {
  plans: PublicPlan[];
  currentCode?: string | null;
  title?: string;
  note?: string;
}) {
  if (plans.length === 0) return null;
  return (
    <section className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold">{title || "باقات الاشتراك"}</h2>
        {note && <p className="mt-2 text-sm text-muted-foreground">{note}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-3 items-start">
        {plans.map((p) => {
          const current = currentCode === p.code;
          return (
            <article
              key={p.code}
              className={
                "rounded-2xl border bg-card p-5 space-y-4 " +
                (current ? "border-primary ring-1 ring-primary/40" : "border-border")
              }
            >
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold flex items-center gap-2">
                  <Crown className="size-4 text-primary" /> {p.name}
                </h3>
                {current && (
                  <span className="rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1 font-semibold">
                    باقتك الحالية
                  </span>
                )}
              </div>
              <div>
                <span className="text-3xl font-extrabold">{Number(p.price_monthly)}</span>
                <span className="text-sm text-muted-foreground"> ر.س / شهريًا</span>
              </div>

              <ul className="space-y-1.5 text-sm">
                <Limit label="الفروع" value={num(p.max_branches)} />
                <Limit label="الموظفون" value={num(p.max_staff)} />
                <Limit label="الخدمات" value={num(p.max_services)} />
                <Limit label="العملاء" value={num(p.max_customers)} />
                <Limit label="الفواتير شهريًا" value={num(p.max_invoices)} />
                <li className="flex items-center gap-2">
                  {p.has_website ? (
                    <Globe className="size-3.5 text-primary" />
                  ) : (
                    <X className="size-3.5 text-muted-foreground" />
                  )}
                  <span className={p.has_website ? "" : "text-muted-foreground"}>
                    موقع إلكتروني للمشغل
                  </span>
                </li>
              </ul>

              <div className="border-t border-border pt-3">
                <div className="text-xs text-muted-foreground mb-2">الأقسام المتاحة</div>
                <div className="flex flex-wrap gap-1.5">
                  {(p.enabled_modules ?? []).map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
                    >
                      {moduleLabel(m)}
                    </span>
                  ))}
                </div>
              </div>

              {(p.features ?? []).length > 0 && (
                <ul className="space-y-1.5 text-sm border-t border-border pt-3">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="size-4 mt-0.5 text-primary shrink-0" />
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
