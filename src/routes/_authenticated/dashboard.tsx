import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  BarChart3,
  CalendarDays,
  Clock,
  CreditCard,
  Fingerprint,
  Info,
  Receipt,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users2,
  Wallet,
} from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { AttendancePanel } from "@/components/salon/attendance-panel";
import { useAccount } from "@/hooks/use-account";
import { formatSAR, formatTime, STATUS_LABEL, STATUS_TONE } from "@/lib/salon-store";
import { loadDashboardOverview, type StaffToday, type TodayBooking } from "@/lib/db/dashboard-repo";
import { payMethodLabel } from "@/lib/db/ops-repo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — تشغيل المشغل اليومي | Chic Spot" },
      {
        name: "description",
        content:
          "لوحة تحكم المشغل: حجوزات اليوم، المبيعات نقدًا وشبكة، حالة وردية الكاشير، أداء الموظفين، والتنبيهات التشغيلية في شاشة واحدة.",
      },
      { property: "og:title", content: "لوحة تحكم المشغل — Chic Spot" },
      {
        property: "og:description",
        content: "متابعة لحظية لحجوزات اليوم والإيرادات والوردية وأداء الفريق.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "صباح الخير 👋";
  if (h < 17) return "نهارك سعيد 👋";
  return "مساء الخير 👋";
};

function Dashboard() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;

  const overview = useQuery({
    queryKey: ["dashboard-overview", salonId],
    queryFn: () => loadDashboardOverview(salonId!),
    enabled: !!salonId,
    refetchInterval: 60_000,
  });

  const d = overview.data;

  return (
    <AppShell
      title={greeting()}
      subtitle="متابعة لحظية لتشغيل المشغل اليوم: الحجوزات، الصندوق، الفريق والتنبيهات"
      action={
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/attendance"
            className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/20 transition"
          >
            <Fingerprint className="size-4" />
            الحضور والانصراف
          </Link>
          <Link
            to="/pos"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:border-primary/40 transition"
          >
            <ShoppingCart className="size-4" />
            نقطة البيع
          </Link>
          <Link
            to="/bookings"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90"
          >
            <CalendarDays className="size-4" />
            حجز جديد
          </Link>
        </div>
      }
    >
      {/* Operational alerts */}
      <div className="space-y-2">
        {(d?.alerts ?? []).map((a, i) => (
          <div
            key={i}
            className={cn(
              "flex items-start gap-2 rounded-xl border px-4 py-3 text-sm",
              a.tone === "bad"
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : a.tone === "warn"
                  ? "border-warning/40 bg-warning/10 text-warning"
                  : "border-border bg-muted/30 text-muted-foreground",
            )}
          >
            {a.tone === "info" ? (
              <Info className="size-4 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
            )}
            <span>{a.text}</span>
          </div>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <Kpi
          icon={CalendarDays}
          label="حجوزات اليوم"
          value={String(d?.bookingsToday.length ?? 0)}
          sub={`${d?.upcoming.length ?? 0} قادمة · ${d?.customersToday ?? 0} عميلة`}
          tone="primary"
        />
        <Kpi
          icon={TrendingUp}
          label="مبيعات اليوم"
          value={formatSAR(d?.revenueToday ?? 0)}
          sub={`${d?.invoiceCount ?? 0} فاتورة · متوسط ${formatSAR(d?.avgTicket ?? 0)}`}
          tone="success"
        />
        <Kpi
          icon={Banknote}
          label="نقدًا / شبكة"
          value={`${formatSAR(d?.cashToday ?? 0)}`}
          sub={`شبكة: ${formatSAR(d?.cardToday ?? 0)}`}
          tone="accent"
        />
        <Kpi
          icon={TrendingDown}
          label="صافي اليوم"
          value={formatSAR(d?.netToday ?? 0)}
          sub={`مصروفات ${formatSAR(d?.expensesToday ?? 0)} · ضريبة ${formatSAR(d?.vatToday ?? 0)}`}
          tone={(d?.netToday ?? 0) >= 0 ? "success" : "warning"}
        />
      </div>

      {/* Today's operations: shift + team */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="glass-card rounded-2xl p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg">وردية الكاشير</h2>
            <Link to="/cash" className="text-xs font-medium text-primary hover:opacity-80 flex items-center gap-1">
              إدارة <ArrowLeft className="size-3" />
            </Link>
          </div>
          {d?.shift ? (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                <span className="size-2 rounded-full bg-success" /> وردية مفتوحة
              </div>
              <div className="text-xs text-muted-foreground">
                بدأت {formatTime(d.shift.opened_at)}
                {d.shift.branch_name ? ` · ${d.shift.branch_name}` : ""}
              </div>
              <dl className="space-y-2 text-sm">
                <Row label="رصيد افتتاحي" value={formatSAR(d.shift.opening_float)} />
                <Row label="مبيعات نقدية" value={formatSAR(d.shift.cash)} />
                <Row label="مبيعات شبكة" value={formatSAR(d.shift.card)} />
                <Row label="مصروفات نقدية" value={formatSAR(d.shift.cash_expenses)} />
                <Row label="النقد المتوقع" value={formatSAR(d.shift.expected_cash)} strong />
              </dl>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                <span className="size-2 rounded-full bg-warning" /> لا توجد وردية مفتوحة
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                افتح وردية كاشير لتسجيل المبيعات النقدية والمصروفات وربطها بالجرد النقدي في نهاية اليوم.
              </p>
              <Link
                to="/cash"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <Wallet className="size-4" /> فتح وردية
              </Link>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-lg">مواعيد اليوم</h2>
              <p className="text-xs text-muted-foreground mt-0.5">الحجوزات القادمة والجارية</p>
            </div>
            <Link to="/calendar" className="text-xs font-medium text-primary hover:opacity-80 flex items-center gap-1">
              التقويم <ArrowLeft className="size-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {overview.isLoading && <div className="text-center py-10 text-sm text-muted-foreground">جارٍ التحميل…</div>}
            {!overview.isLoading && (d?.upcoming.length ?? 0) === 0 && (
              <div className="text-center py-10 text-muted-foreground text-sm">لا توجد مواعيد قادمة اليوم</div>
            )}
            {(d?.upcoming ?? []).slice(0, 6).map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </div>
        </div>
      </div>

      {/* Ledger + services + team */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="glass-card rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-lg">السجل المالي اليومي</h2>
              <p className="text-xs text-muted-foreground mt-0.5">كل فاتورة ومصروف يُسجَّل تلقائيًا</p>
            </div>
            <Link to="/reports" className="text-xs font-medium text-primary hover:opacity-80 flex items-center gap-1">
              التقارير <ArrowLeft className="size-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="text-right">
                  <th className="py-2 font-medium">الوقت</th>
                  <th className="py-2 font-medium">الحركة</th>
                  <th className="py-2 font-medium">الطريقة</th>
                  <th className="py-2 font-medium text-left">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {(d?.ledger ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      لا توجد حركات مالية اليوم
                    </td>
                  </tr>
                )}
                {(d?.ledger ?? []).map((l) => (
                  <tr key={`${l.kind}-${l.id}`} className="border-t border-border">
                    <td className="py-2.5 whitespace-nowrap text-muted-foreground">{formatTime(l.at)}</td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-2">
                        {l.kind === "expense" ? (
                          <TrendingDown className="size-3.5 text-destructive" />
                        ) : (
                          <Receipt className="size-3.5 text-primary" />
                        )}
                        <span className="truncate">{l.label}</span>
                      </span>
                    </td>
                    <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                      {l.method ? payMethodLabel(l.method) : "—"}
                    </td>
                    <td
                      className={cn(
                        "py-2.5 text-left font-bold whitespace-nowrap",
                        l.amount < 0 ? "text-destructive" : "text-success",
                      )}
                    >
                      {formatSAR(Math.abs(l.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-6">
          <div>
            <h2 className="font-bold text-lg mb-3">الخدمات الأكثر طلبًا اليوم</h2>
            <div className="space-y-3">
              {(d?.topServices ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">لا توجد خدمات محجوزة اليوم بعد.</p>
              )}
              {(d?.topServices ?? []).map((s, i, arr) => (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="text-lg font-bold text-muted-foreground w-6">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{s.name}</div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-primary to-accent"
                        style={{ width: `${Math.min(100, (s.count / (arr[0]?.count || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-sm font-bold w-10 text-left">{s.count}×</div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">الفريق اليوم</h3>
              <Link to="/staff" className="text-xs text-primary hover:opacity-80">
                الموظفون
              </Link>
            </div>
            {d?.topStaff && d.topStaff.revenue > 0 && (
              <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs">
                <div className="font-semibold flex items-center gap-1.5">
                  <BarChart3 className="size-3.5 text-primary" /> الأعلى أداءً: {d.topStaff.name}
                </div>
                <div className="text-muted-foreground mt-1">
                  {d.topStaff.bookings} حجز · {formatSAR(d.topStaff.revenue)}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {(d?.activeStaff ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">لا يوجد موظفون نشطون.</p>
              )}
              {(d?.activeStaff ?? []).map((s) => (
                <StaffRow key={s.id} s={s} />
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border grid grid-cols-2 gap-2 text-xs">
            <MiniStat icon={Users2} label="عميلات جديدة" value={String(d?.newCustomersToday ?? 0)} />
            <MiniStat icon={CreditCard} label="مرتجعات" value={formatSAR(d?.refundsToday ?? 0)} />
            <MiniStat icon={Sparkles} label="حجوزات مكتملة" value={String((d?.bookingsToday ?? []).filter((b) => b.status === "completed").length)} />
            <MiniStat icon={Clock} label="قيد التنفيذ" value={String((d?.bookingsToday ?? []).filter((b) => b.status === "in_progress").length)} />
          </div>
        </div>
      </div>

      <div id="attendance" className="scroll-mt-24 mt-6">
        <AttendancePanel />
      </div>
    </AppShell>
  );
}

function BookingRow({ b }: { b: TodayBooking }) {
  const status = b.status as keyof typeof STATUS_LABEL;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/20 p-3 hover:bg-muted/40 transition">
      <div className="text-center shrink-0 w-14">
        <div className="text-lg font-bold">{formatTime(b.starts_at)}</div>
        <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
          <Clock className="size-3" />
          {b.duration_min}د
        </div>
      </div>
      <div className="size-10 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 grid place-items-center text-sm font-bold shrink-0">
        {(b.customer_name ?? "؟").charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">{b.customer_name ?? "عميلة بدون اسم"}</div>
        <div className="text-xs text-muted-foreground truncate">
          {b.services.join("، ") || "—"}
          {b.staff_name ? ` · مع ${b.staff_name}` : ""}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
            STATUS_TONE[status] ?? "border-border text-muted-foreground",
          )}
        >
          {STATUS_LABEL[status] ?? b.status}
        </span>
        <span className="text-sm font-bold">{formatSAR(b.price - b.discount)}</span>
      </div>
    </div>
  );
}

function StaffRow({ s }: { s: StaffToday }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
      <div className="size-7 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-[10px] font-bold text-primary-foreground shrink-0">
        {s.name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold truncate">{s.name}</div>
        <div className="text-[10px] text-muted-foreground truncate">
          {s.bookings} حجز · {formatSAR(s.revenue)}
        </div>
      </div>
      <span
        className={cn(
          "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
          s.checked_in ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground",
        )}
      >
        {s.checked_in ? "حاضر" : "غير مسجّل"}
      </span>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={strong ? "font-bold" : "font-medium"}>{value}</dd>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: typeof Users2; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <div className="font-bold mt-1 text-sm">{value}</div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = "primary",
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "accent" | "success" | "warning";
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
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground font-medium">{label}</div>
          <div className="text-2xl md:text-3xl font-bold mt-2 tracking-tight truncate">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1 truncate">{sub}</div>}
        </div>
        <div className={cn("size-10 rounded-xl bg-gradient-to-br grid place-items-center shrink-0", toneMap[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
