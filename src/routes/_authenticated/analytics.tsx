import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, Eye, Loader2, LogIn, MapPin, MonitorSmartphone, Users2 } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount } from "@/hooks/use-account";
import { loadSalonAnalytics } from "@/lib/salon-analytics";
import type { VisitBucket } from "@/lib/visit-tracking";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/analytics")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "الإحصائيات — تسجيلات الدخول والزوار" },
      {
        name: "description",
        content: "إحصائيات المتجر: تسجيلات الدخول، المستخدمون، الزوار، الأجهزة والمناطق الجغرافية.",
      },
      { property: "og:title", content: "إحصائيات المتجر" },
      { property: "og:description", content: "تابع الدخول والزوار والمناطق لمتجرك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AnalyticsPage,
});

const RANGES = [
  { days: 7, label: "٧ أيام" },
  { days: 30, label: "٣٠ يوم" },
  { days: 90, label: "٩٠ يوم" },
];

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number | string;
  icon: typeof Eye;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <span className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
          <Icon className="size-5" />
        </span>
        <span className="min-w-0">
          <span className="block text-xl font-bold">{value}</span>
          <span className="block text-xs text-muted-foreground truncate">{label}</span>
        </span>
      </CardContent>
    </Card>
  );
}

function Buckets({ title, items, icon: Icon }: { title: string; items: VisitBucket[]; icon: typeof Eye }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className="size-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد بيانات بعد.</p>
        ) : (
          items.slice(0, 10).map((i) => (
            <div key={i.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="truncate">{i.name}</span>
                <span className="font-semibold tabular-nums">{i.count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(i.count / max) * 100}%` }} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function DailyChart({ title, data }: { title: string; data: { day: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="size-4 text-primary" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد بيانات بعد.</p>
        ) : (
          <div className="flex items-end gap-1 h-32">
            {data.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1" title={`${d.day}: ${d.count}`}>
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;

  const q = useQuery({
    queryKey: ["salon", "analytics", salonId, days],
    queryFn: () => loadSalonAnalytics(salonId!, days),
    enabled: !!salonId,
  });
  const d = q.data;

  return (
    <AppShell title="الإحصائيات" subtitle="تسجيلات الدخول والمستخدمون والزوار والمناطق">
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

      {!salonId ? (
        <p className="text-sm text-muted-foreground">لا يوجد متجر مرتبط بالحساب.</p>
      ) : q.isLoading ? (
        <div className="py-16 grid place-items-center text-muted-foreground">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : q.isError ? (
        <p className="text-sm text-destructive">تعذر تحميل الإحصائيات.</p>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="تسجيلات الدخول" value={d?.total_logins ?? 0} icon={LogIn} />
            <Stat label="المستخدمون الداخلون" value={d?.login_users ?? 0} icon={Users2} />
            <Stat label="زيارات الموقع" value={d?.total_visits ?? 0} icon={Eye} />
            <Stat label="زوار مختلفون" value={d?.unique_visitors ?? 0} icon={Users2} />
            <Stat label="زوار جدد" value={d?.new_visitors ?? 0} icon={Users2} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <DailyChart title="تسجيلات الدخول اليومية" data={d?.login_daily ?? []} />
            <DailyChart title="زيارات الموقع اليومية" data={d?.daily ?? []} />
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Buckets title="مناطق الزوار" items={d?.regions ?? []} icon={MapPin} />
            <Buckets title="مناطق تسجيل الدخول" items={d?.login_regions ?? []} icon={MapPin} />
            <Buckets title="أدوار المستخدمين الداخلين" items={d?.login_roles ?? []} icon={Users2} />
            <Buckets title="الأجهزة" items={d?.devices ?? []} icon={MonitorSmartphone} />
            <Buckets title="المتصفحات" items={d?.browsers ?? []} icon={MonitorSmartphone} />
            <Buckets title="أنظمة التشغيل" items={d?.systems ?? []} icon={MonitorSmartphone} />
            <Buckets title="أكثر الصفحات زيارة" items={d?.pages ?? []} icon={Eye} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <LogIn className="size-4 text-primary" /> آخر تسجيلات الدخول
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {(d?.recent_logins ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">لا توجد تسجيلات دخول بعد.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead className="text-muted-foreground">
                    <tr className="text-right">
                      <th className="py-2 font-medium">المستخدم</th>
                      <th className="py-2 font-medium">الدور</th>
                      <th className="py-2 font-medium">الجهاز</th>
                      <th className="py-2 font-medium">المتصفح</th>
                      <th className="py-2 font-medium">المنطقة</th>
                      <th className="py-2 font-medium">التاريخ والوقت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(d?.recent_logins ?? []).map((r, i) => (
                      <tr key={`${r.at}-${i}`} className="border-t border-border">
                        <td className="py-2">{r.email ?? "—"}</td>
                        <td className="py-2">{r.role ?? "—"}</td>
                        <td className="py-2">{r.device ?? "—"}</td>
                        <td className="py-2">{r.browser ?? "—"}</td>
                        <td className="py-2">{r.region ?? "—"}</td>
                        <td className="py-2 whitespace-nowrap">
                          {new Date(r.at).toLocaleString("ar-SA")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
