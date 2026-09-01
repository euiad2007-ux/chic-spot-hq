import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, Loader2, MapPin, MonitorSmartphone, Users2 } from "lucide-react";

import { OwnerShell } from "@/components/platform/owner-shell";
import { OwnerStat } from "@/components/platform/owner-ui";
import { loadVisitsOverview, type VisitBucket } from "@/lib/visit-tracking";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/platform-analytics")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إحصائيات الزوار — المنصة" },
      { name: "description", content: "الزوار الجدد والأجهزة المستخدمة والمناطق وأكثر الصفحات زيارة." },
      { property: "og:title", content: "إحصائيات الزوار" },
      { property: "og:description", content: "متابعة زوار المنصة والأجهزة والمناطق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlatformAnalyticsPage,
});

const RANGES = [
  { days: 7, label: "٧ أيام" },
  { days: 30, label: "٣٠ يوم" },
  { days: 90, label: "٩٠ يوم" },
];

function PlatformAnalyticsPage() {
  const [days, setDays] = useState(30);
  const q = useQuery({
    queryKey: ["platform", "visits", days],
    queryFn: () => loadVisitsOverview(days),
  });
  const d = q.data;

  return (
    <OwnerShell title="إحصائيات الزوار" subtitle="الزوار الجدد والأجهزة والمناطق">
      <div className="flex items-center gap-2 mb-5">
        {RANGES.map((r) => (
          <button
            key={r.days}
            onClick={() => setDays(r.days)}
            className={cn(
              "h-9 px-3 rounded-xl border text-xs font-semibold transition",
              days === r.days
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {q.isLoading ? (
        <div className="py-16 grid place-items-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : q.error ? (
        <p className="text-sm text-destructive">تعذر تحميل الإحصائيات.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <OwnerStat label="إجمالي الزيارات" value={num(d?.total_visits)} />
            <OwnerStat label="زوار فريدون" value={num(d?.unique_visitors)} />
            <OwnerStat label="زوار جدد" value={num(d?.new_visitors)} hint="أول زيارة خلال الفترة" />
            <OwnerStat
              label="أكثر منطقة"
              value={d?.regions?.[0]?.name ?? "—"}
              hint={d?.regions?.[0] ? `${d.regions[0].count} زيارة` : undefined}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BucketCard title="الأجهزة المستخدمة" icon={MonitorSmartphone} rows={d?.devices ?? []} />
            <BucketCard title="المناطق" icon={MapPin} rows={d?.regions ?? []} />
            <BucketCard title="أنظمة التشغيل" icon={Users2} rows={d?.systems ?? []} />
            <BucketCard title="المتصفحات" icon={Users2} rows={d?.browsers ?? []} />
          </div>

          <BucketCard title="أكثر الصفحات زيارة" icon={BarChart3} rows={d?.pages ?? []} />

          {(d?.total_visits ?? 0) === 0 && (
            <p className="text-xs text-muted-foreground">
              لا توجد زيارات مسجلة بعد خلال هذه الفترة. تبدأ الإحصائيات بالظهور مع أول زيارة للموقع العام.
            </p>
          )}
        </div>
      )}
    </OwnerShell>
  );
}

function num(v: number | undefined) {
  return Number(v ?? 0).toLocaleString("ar-SA");
}

function BucketCard({
  title,
  icon: Icon,
  rows,
}: {
  title: string;
  icon: typeof BarChart3;
  rows: VisitBucket[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-sm font-bold inline-flex items-center gap-2 mb-3">
        <Icon className="size-4 text-primary" /> {title}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">لا بيانات</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 8).map((r) => (
            <li key={r.name}>
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="truncate">{r.name}</span>
                <span className="text-muted-foreground">{num(r.count)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-primary to-accent"
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
