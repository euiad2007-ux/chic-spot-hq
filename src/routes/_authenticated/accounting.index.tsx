import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, Building, Calculator, LineChart, NotebookPen, Scale } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { AccountingNav } from "@/components/salon/accounting-nav";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import { loadTaxReport } from "@/lib/db/accounting-repo";
import { loadFinancials } from "@/lib/db/coa-repo";
import { listJournal } from "@/lib/db/journal-repo";

export const Route = createFileRoute("/_authenticated/accounting/")({
  head: () => ({
    meta: [
      { title: "لوحة المحاسبة — نظرة عامة على الحسابات | Salon Flow" },
      {
        name: "description",
        content:
          "لوحة المحاسبة للمشغل: الإيرادات والمصروفات وصافي الربح وصافي الضريبة وعدد القيود المرحّلة، مع روابط لكل قسم محاسبي.",
      },
      { property: "og:title", content: "لوحة المحاسبة — Salon Flow" },
      { property: "og:description", content: "نظرة عامة مالية وضريبية على المشغل في صفحة واحدة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountingHome,
});

const monthStart = () => new Date().toISOString().slice(0, 8) + "01";
const today = () => new Date().toISOString().slice(0, 10);

function AccountingHome() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const period = from.slice(0, 7);

  const fin = useQuery({
    queryKey: ["financials", salonId, from, to],
    queryFn: () => loadFinancials(salonId!, from, to),
    enabled: !!salonId,
  });
  const tax = useQuery({
    queryKey: ["tax-report", salonId, from, to],
    queryFn: () => loadTaxReport(salonId!, from, to),
    enabled: !!salonId,
  });
  const journal = useQuery({
    queryKey: ["journal", salonId, period],
    queryFn: () => listJournal(salonId!, period),
    enabled: !!salonId,
  });

  const f = fin.data;
  const t = tax.data;
  const entries = journal.data ?? [];

  return (
    <AppShell title="لوحة المحاسبة" subtitle="ملخص مالي وضريبي مع روابط أقسام البرنامج المحاسبي">
      <div className="space-y-4">
        <AccountingNav />

        <section className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">من</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">إلى</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
          </label>
          <p className="text-xs text-muted-foreground ms-auto max-w-sm">
            الأرقام مبنية على القيود المرحّلة والفواتير المسجّلة داخل الفترة المحددة.
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="الإيرادات" value={formatSAR(f?.totalRevenue ?? 0)} />
          <Stat label="المصروفات" value={formatSAR(f?.totalExpenses ?? 0)} />
          <Stat
            label="صافي الربح"
            value={formatSAR(f?.netProfit ?? 0)}
            tone={(f?.netProfit ?? 0) >= 0 ? "good" : "bad"}
          />
          <Stat
            label="صافي الضريبة المستحقة"
            value={formatSAR(t?.netVatDue ?? 0)}
            tone={(t?.netVatDue ?? 0) > 0 ? "bad" : "good"}
          />
          <Stat label="فواتير الفترة" value={String(t?.sales.count ?? 0)} />
          <Stat label="قيود شهر الفترة" value={String(entries.length)} />
          <Stat label="إجمالي الأصول" value={formatSAR(f?.totalAssets ?? 0)} />
          <Stat
            label="توازن الميزانية"
            value={f?.balanced ? "متوازنة" : "غير متوازنة"}
            tone={f?.balanced ? "good" : "bad"}
          />
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Card
            to="/accounting/accounts"
            icon={BookOpen}
            title="دليل الحسابات ودفتر الأستاذ"
            desc="شجرة حسابات عربية كاملة وحركة كل حساب برصيد متحرك."
          />
          <Card
            to="/accounting/journal"
            icon={NotebookPen}
            title="القيود اليومية والترحيل"
            desc="ترحيل تلقائي للفواتير والمصروفات والرواتب، وقيود يدوية مزدوجة."
          />
          <Card
            to="/accounting/trial-balance"
            icon={Scale}
            title="ميزان المراجعة"
            desc="مجاميع المدين والدائن لكل حساب مع التحقق من التوازن."
          />
          <Card
            to="/accounting/financials"
            icon={LineChart}
            title="القوائم المالية"
            desc="قائمة الدخل والميزانية العمومية من القيود المرحّلة."
          />
          <Card
            to="/accounting/vat"
            icon={Calculator}
            title="الضرائب والفواتير الإلكترونية"
            desc="إقرار ضريبة القيمة المضافة للفترة والتقارير الشهرية."
          />
          <Card
            to="/accounting/assets"
            icon={Building}
            title="الأصول الثابتة والإهلاك"
            desc="تكلفة الأصل والعمر الإنتاجي والإهلاك الشهري والقيمة الدفترية."
          />
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          tone === "bad"
            ? "font-bold mt-1 text-destructive"
            : tone === "good"
              ? "font-bold mt-1 text-success"
              : "font-bold mt-1"
        }
      >
        {value}
      </div>
    </div>
  );
}

function Card({
  to,
  icon: Icon,
  title,
  desc,
}: {
  to: string;
  icon: typeof BookOpen;
  title: string;
  desc: string;
}) {
  return (
    <Link
      to={to as never}
      className="rounded-2xl border border-border bg-card p-4 space-y-2 hover:border-primary/40 transition-colors block"
    >
      <div className="flex items-center gap-2 font-bold">
        <Icon className="size-4 text-primary" /> {title}
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </Link>
  );
}
