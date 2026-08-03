import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, LineChart, Printer, Scale } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { AccountingNav } from "@/components/salon/accounting-nav";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import { exportCsv, printReport, stampName } from "@/lib/export";
import { loadFinancials, type StatementLine } from "@/lib/db/coa-repo";

export const Route = createFileRoute("/_authenticated/accounting/financials")({
  head: () => ({
    meta: [
      { title: "التقارير المالية — قائمة الدخل والميزانية | Salon Flow" },
      {
        name: "description",
        content:
          "قائمة الدخل والميزانية العمومية للمشغل مبنية من القيود المرحّلة: الإيرادات، المصروفات، صافي الربح، الأصول والالتزامات.",
      },
      { property: "og:title", content: "التقارير المالية — Salon Flow" },
      { property: "og:description", content: "قائمة الدخل والميزانية العمومية لأي فترة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinancialsPage,
});

const yearStart = () => new Date().toISOString().slice(0, 4) + "-01-01";
const today = () => new Date().toISOString().slice(0, 10);

function FinancialsPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(today());

  const fin = useQuery({
    queryKey: ["financials", salonId, from, to],
    queryFn: () => loadFinancials(salonId!, from, to),
    enabled: !!salonId,
  });

  const d = fin.data;

  return (
    <AppShell title="التقارير المالية" subtitle="قائمة الدخل والميزانية العمومية من القيود المرحّلة">
      <div className="space-y-4">
        <AccountingNav />
        <section className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">من</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">إلى</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
          </label>
          <div className="ms-auto flex gap-2 print:hidden">
            <button
              onClick={() => {
                if (!d) return;
                const line = (section: string) => (l: StatementLine) => [section, l.code, l.name, l.amount];
                exportCsv(
                  stampName("financial-statements"),
                  ["القائمة", "الرمز", "الحساب", "المبلغ"],
                  [
                    ...d.revenue.map(line("الإيرادات")),
                    ...d.expenses.map(line("المصروفات")),
                    ["قائمة الدخل", "", "صافي الربح", d.netProfit],
                    ...d.assets.map(line("الأصول")),
                    ...d.liabilities.map(line("الالتزامات")),
                    ...d.equity.map(line("حقوق الملكية")),
                  ],
                );
              }}
              className="h-10 px-3 rounded-xl border border-border font-bold text-sm inline-flex items-center gap-2"
            >
              <Download className="size-4" /> تصدير CSV
            </button>
            <button
              onClick={printReport}
              className="h-10 px-3 rounded-xl border border-border font-bold text-sm inline-flex items-center gap-2"
            >
              <Printer className="size-4" /> طباعة
            </button>
          </div>
          <span
            className={
              d?.balanced
                ? "rounded-full border border-success/40 bg-success/15 text-success px-3 py-1 text-xs font-bold"
                : "rounded-full border border-destructive/40 bg-destructive/15 text-destructive px-3 py-1 text-xs font-bold"
            }
          >
            {d?.balanced ? "الميزانية متوازنة" : "الميزانية غير متوازنة — راجع الترحيل"}
          </span>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="إجمالي الإيرادات" value={formatSAR(d?.totalRevenue ?? 0)} />
          <Stat label="إجمالي المصروفات" value={formatSAR(d?.totalExpenses ?? 0)} />
          <Stat label="صافي الربح" value={formatSAR(d?.netProfit ?? 0)} />
          <Stat label="إجمالي الأصول" value={formatSAR(d?.totalAssets ?? 0)} />
        </section>

        <div className="grid gap-4 lg:grid-cols-2 items-start">
          <Panel icon={<LineChart className="size-4 text-primary" />} title="قائمة الدخل">
            <Group title="الإيرادات" lines={d?.revenue ?? []} total={d?.totalRevenue ?? 0} />
            <Group title="المصروفات" lines={d?.expenses ?? []} total={d?.totalExpenses ?? 0} />
            <TotalRow label="صافي الربح / (الخسارة)" value={d?.netProfit ?? 0} />
          </Panel>

          <Panel icon={<Scale className="size-4 text-primary" />} title="الميزانية العمومية">
            <Group title="الأصول" lines={d?.assets ?? []} total={d?.totalAssets ?? 0} />
            <Group title="الالتزامات" lines={d?.liabilities ?? []} total={d?.totalLiabilities ?? 0} />
            <Group
              title="حقوق الملكية (بعد نتيجة الفترة)"
              lines={d?.equity ?? []}
              total={d?.totalEquity ?? 0}
            />
            <TotalRow
              label="إجمالي الالتزامات وحقوق الملكية"
              value={(d?.totalLiabilities ?? 0) + (d?.totalEquity ?? 0)}
            />
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Panel({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <h2 className="font-bold flex items-center gap-2">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function Group({ title, lines, total }: { title: string; lines: StatementLine[]; total: number }) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs font-bold text-muted-foreground">{title}</h3>
      {lines.length === 0 && <p className="text-sm text-muted-foreground">لا توجد حركات.</p>}
      {lines.map((l) => (
        <div key={l.code} className="flex items-center justify-between gap-2 text-sm py-1">
          <span>
            <span className="font-mono text-xs text-muted-foreground">{l.code}</span> {l.name}
          </span>
          <span className="font-semibold">{formatSAR(l.amount)}</span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2 text-sm border-t border-border pt-2 font-bold">
        <span>إجمالي {title}</span>
        <span>{formatSAR(total)}</span>
      </div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 px-3 py-2 font-bold">
      <span>{label}</span>
      <span>{formatSAR(value)}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}
