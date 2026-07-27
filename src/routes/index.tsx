import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { useSalon, formatSAR, formatTime, STATUS_LABEL, STATUS_TONE, isToday } from "@/lib/salon-store";
import { CalendarDays, TrendingUp, Users2, Sparkles, ArrowLeft, Clock, Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";
import { AttendancePanel } from "@/components/salon/attendance-panel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — لمسة" },
      { name: "description", content: "نظرة عامة على حجوزات اليوم والمبيعات والموظفين والعملاء." },
      { property: "og:title", content: "لوحة تحكم لمسة" },
      { property: "og:description", content: "نظرة سريعة على أداء المشغل." },
    ],
  }),
  component: Dashboard,
});

function StatCard({ icon: Icon, label, value, sub, tone = "primary" }: {
  icon: any; label: string; value: string; sub?: string; tone?: "primary" | "accent" | "success" | "warning";
}) {
  const toneMap = {
    primary: "from-primary/25 to-primary/5 text-primary",
    accent: "from-accent/25 to-accent/5 text-accent",
    success: "from-success/25 to-success/5 text-success",
    warning: "from-warning/25 to-warning/5 text-warning",
  } as const;
  return (
    <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
      <div className={cn("absolute -top-10 -left-10 size-32 rounded-full blur-3xl bg-gradient-to-br", toneMap[tone])} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          <div className="text-3xl font-bold mt-2 tracking-tight">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className={cn("size-10 rounded-xl bg-gradient-to-br grid place-items-center", toneMap[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { bookings, customers, services, staff, invoices } = useSalon((s) => s);

  const todayBookings = bookings.filter((b) => isToday(b.startsAt));
  const todayRevenue = invoices
    .filter((i) => isToday(i.createdAt))
    .reduce((a, i) => a + i.paid, 0);
  const upcoming = [...todayBookings]
    .filter((b) => ["new", "confirmed", "checked_in"].includes(b.status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 6);

  const topServices = (() => {
    const counts = new Map<string, number>();
    bookings.forEach((b) => b.serviceIds.forEach((sid) => counts.set(sid, (counts.get(sid) ?? 0) + 1)));
    return Array.from(counts.entries())
      .map(([id, c]) => ({ service: services.find((s) => s.id === id), count: c }))
      .filter((x) => x.service)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  })();

  return (
    <AppShell
      title="مساءُ الخير 👋"
      subtitle="نظرة سريعة على أداء المشغل اليوم"
      action={
        <Link
          to="/bookings"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90"
        >
          <CalendarDays className="size-4" />
          حجز جديد
        </Link>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="حجوزات اليوم" value={String(todayBookings.length)} sub={`${upcoming.length} قادمة`} tone="primary" />
        <StatCard icon={TrendingUp} label="مبيعات اليوم" value={formatSAR(todayRevenue)} sub={`${invoices.filter((i) => isToday(i.createdAt)).length} فاتورة`} tone="success" />
        <StatCard icon={Users2} label="العملاء" value={String(customers.length)} sub={`${staff.filter((s) => s.active).length} موظف نشط`} tone="accent" />
        <StatCard icon={Sparkles} label="الخدمات" value={String(services.filter((s) => s.active).length)} sub="متاحة اليوم" tone="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="glass-card rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-lg">مواعيد اليوم</h2>
              <p className="text-xs text-muted-foreground mt-0.5">الحجوزات القادمة والحالية</p>
            </div>
            <Link to="/bookings" className="text-xs font-medium text-primary hover:text-primary-glow flex items-center gap-1">
              عرض الكل <ArrowLeft className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {upcoming.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">لا توجد مواعيد قادمة اليوم</div>
            )}
            {upcoming.map((b) => {
              const cust = customers.find((c) => c.id === b.customerId);
              const st = staff.find((s) => s.id === b.staffId);
              const svcNames = b.serviceIds.map((sid) => services.find((s) => s.id === sid)?.name).filter(Boolean).join("، ");
              return (
                <div key={b.id} className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-3 hover:bg-muted/40 transition">
                  <div className="text-center shrink-0 w-14">
                    <div className="text-lg font-bold">{formatTime(b.startsAt)}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Clock className="size-3" />{b.durationMin}د</div>
                  </div>
                  <div className="size-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 grid place-items-center text-sm font-bold shrink-0">
                    {cust?.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{cust?.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{svcNames} · مع {st?.name}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", STATUS_TONE[b.status])}>
                      {STATUS_LABEL[b.status]}
                    </span>
                    <span className="text-sm font-bold">{formatSAR(b.price - b.discount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5">
          <h2 className="font-bold text-lg mb-4">الخدمات الأكثر طلبًا</h2>
          <div className="space-y-3">
            {topServices.map(({ service, count }, i) => (
              <div key={service!.id} className="flex items-center gap-3">
                <div className="text-lg font-bold text-muted-foreground w-6">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{service!.name}</div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-primary to-accent"
                      style={{ width: `${Math.min(100, (count / topServices[0].count) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm font-bold w-10 text-left">{count}×</div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="font-bold text-sm mb-3">الموظفون اليوم</h3>
            <div className="flex flex-wrap gap-2">
              {staff.filter((s) => s.active).map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-full bg-muted/40 border border-border px-3 py-1.5">
                  <div className="size-6 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-[10px] font-bold text-primary-foreground">
                    {s.name.charAt(0)}
                  </div>
                  <span className="text-xs font-medium">{s.name.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <AttendancePanel />
    </AppShell>
  );
}
