import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Receipt, CalendarDays } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import { loadReport, expenseCategoryLabel, payMethodLabel } from "@/lib/db/ops-repo";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "التقارير المالية — الإيراد والمصروفات والصافي | Salon Flow" },
      {
        name: "description",
        content:
          "تقارير الفترة: الإيراد والمحصل والمصروفات والصافي التشغيلي، توزيع طرق الدفع، وأكثر الخدمات والمنتجات مبيعًا.",
      },
      { property: "og:title", content: "التقارير المالية — Salon Flow" },
      { property: "og:description", content: "تحليل الإيراد والمصروفات والصافي لكل فترة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

function ReportsPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(iso(monthStart));
  const [to, setTo] = useState(iso(today));

  const report = useQuery({
    queryKey: ["report", salonId, from, to],
    queryFn: () => loadReport(salonId!, from, to),
    enabled: !!salonId,
  });
  const r = report.data;

  return (
    <AppShell
      title="التقارير"
      subtitle="أداء الفترة المالي والتشغيلي"
      action={
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="من تاريخ"
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="إلى تاريخ"
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
          />
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 mb-4">
        <Kpi
          label="المحصل"
          value={formatSAR(r?.collected ?? 0)}
          icon={<TrendingUp className="size-4 text-primary" />}
        />
        <Kpi
          label="المصروفات"
          value={formatSAR(r?.expenses ?? 0)}
          icon={<TrendingDown className="size-4 text-destructive" />}
        />
        <Kpi
          label="الصافي التشغيلي"
          value={formatSAR(r?.net ?? 0)}
          icon={<BarChart3 className="size-4 text-primary" />}
        />
        <Kpi
          label="عدد الفواتير"
          value={String(r?.invoiceCount ?? 0)}
          icon={<Receipt className="size-4 text-primary" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <Panel title="ملخص الإيراد">
          <Row label="إجمالي الفواتير" value={formatSAR(r?.revenue ?? 0)} />
          <Row label="ضريبة القيمة المضافة" value={formatSAR(r?.vat ?? 0)} />
          <Row label="الخصومات" value={formatSAR(r?.discounts ?? 0)} />
          <Row label="المرتجع" value={formatSAR(r?.refunded ?? 0)} />
          <Row label="مبيعات نقطة البيع" value={formatSAR(r?.posSales ?? 0)} />
          <Row label="مبيعات الحجوزات" value={formatSAR(r?.bookingSales ?? 0)} />
          <Row
            label="عدد الحجوزات"
            value={String(r?.bookingCount ?? 0)}
            icon={<CalendarDays className="size-3.5" />}
          />
        </Panel>

        <Panel title="التحصيل حسب طريقة الدفع">
          {(r?.byMethod ?? []).map((m) => (
            <Row key={m.method} label={payMethodLabel(m.method)} value={formatSAR(m.amount)} />
          ))}
          {r && r.byMethod.length === 0 && <Empty />}
        </Panel>

        <Panel title="المصروفات حسب التصنيف">
          {(r?.byExpenseCategory ?? []).map((c) => (
            <Row
              key={c.category}
              label={expenseCategoryLabel(c.category)}
              value={formatSAR(c.amount)}
            />
          ))}
          {r && r.byExpenseCategory.length === 0 && <Empty />}
        </Panel>

        <Panel title="الأكثر مبيعًا">
          {(r?.topItems ?? []).map((it) => (
            <Row key={it.name} label={`${it.name} × ${it.qty}`} value={formatSAR(it.total)} />
          ))}
          {r && r.topItems.length === 0 && <Empty />}
        </Panel>
      </div>
    </AppShell>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-bold mb-3">{title}</h2>
      <div className="space-y-1.5 text-sm">{children}</div>
    </section>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5 last:border-0">
      <span className="text-muted-foreground inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

const Empty = () => <p className="text-muted-foreground">لا توجد بيانات في هذه الفترة.</p>;
