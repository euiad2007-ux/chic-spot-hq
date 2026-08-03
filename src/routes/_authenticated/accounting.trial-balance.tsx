import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Printer, Scale } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { AccountingNav } from "@/components/salon/accounting-nav";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import { exportCsv, printReport, stampName } from "@/lib/export";
import { KIND_LABEL, loadTrialBalanceRange, type AccountKind } from "@/lib/db/coa-repo";

export const Route = createFileRoute("/_authenticated/accounting/trial-balance")({
  head: () => ({
    meta: [
      { title: "ميزان المراجعة — مجاميع المدين والدائن | Salon Flow" },
      {
        name: "description",
        content:
          "ميزان مراجعة لأي فترة: مجموع المدين والدائن ورصيد كل حساب من القيود المرحّلة مع التحقق من توازن الطرفين.",
      },
      { property: "og:title", content: "ميزان المراجعة — Salon Flow" },
      { property: "og:description", content: "التحقق من توازن القيود المحاسبية لأي فترة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrialBalancePage,
});

const yearStart = () => new Date().toISOString().slice(0, 4) + "-01-01";
const today = () => new Date().toISOString().slice(0, 10);
const KINDS: (AccountKind | "all")[] = ["all", "asset", "liability", "equity", "revenue", "expense"];

function TrialBalancePage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const [from, setFrom] = useState(yearStart());
  const [to, setTo] = useState(today());
  const [kind, setKind] = useState<AccountKind | "all">("all");

  const tb = useQuery({
    queryKey: ["trial-balance", salonId, from, to],
    queryFn: () => loadTrialBalanceRange(salonId!, from, to),
    enabled: !!salonId,
  });

  const rows = useMemo(
    () => (tb.data?.rows ?? []).filter((r) => kind === "all" || r.kind === kind),
    [tb.data, kind],
  );

  return (
    <AppShell title="ميزان المراجعة" subtitle="مجاميع المدين والدائن لكل حساب خلال الفترة">
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
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={
                  kind === k
                    ? "h-10 px-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
                    : "h-10 px-3 rounded-xl border border-border font-bold text-sm text-muted-foreground"
                }
              >
                {k === "all" ? "كل الحسابات" : KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <div className="ms-auto flex gap-2 print:hidden">
            <button
              onClick={() =>
                exportCsv(
                  stampName("trial-balance"),
                  ["الرمز", "الحساب", "النوع", "مدين", "دائن", "الرصيد"],
                  rows.map((r) => [r.code, r.name, KIND_LABEL[r.kind], r.debit, r.credit, r.balance]),
                )
              }
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
              tb.data?.balanced
                ? "rounded-full bg-success/10 text-success px-3 py-1 text-xs font-bold"
                : "rounded-full bg-destructive/10 text-destructive px-3 py-1 text-xs font-bold"
            }
          >
            {tb.data?.balanced ? "القيود متوازنة" : "القيود غير متوازنة"}
          </span>
        </section>

        <section className="rounded-2xl border border-border bg-card overflow-x-auto">
          <h2 className="p-4 font-bold flex items-center gap-2">
            <Scale className="size-4 text-primary" /> ميزان المراجعة ({rows.length} حساب)
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-right">الرمز</th>
                <th className="p-3 text-right">الحساب</th>
                <th className="p-3 text-right">النوع</th>
                <th className="p-3 text-right">مدين</th>
                <th className="p-3 text-right">دائن</th>
                <th className="p-3 text-right">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{r.code}</td>
                  <td className="p-3 font-semibold">{r.name}</td>
                  <td className="p-3 text-muted-foreground text-xs">{KIND_LABEL[r.kind]}</td>
                  <td className="p-3">{r.debit ? formatSAR(r.debit) : "—"}</td>
                  <td className="p-3">{r.credit ? formatSAR(r.credit) : "—"}</td>
                  <td className={r.balance >= 0 ? "p-3 font-bold" : "p-3 font-bold text-destructive"}>
                    {formatSAR(r.balance)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    لا توجد قيود مرحّلة في هذه الفترة — رحّل الفترة من صفحة القيود اليومية.
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30 font-bold">
                  <td className="p-3" colSpan={3}>
                    الإجمالي
                  </td>
                  <td className="p-3">
                    {formatSAR(rows.reduce((a, r) => a + r.debit, 0))}
                  </td>
                  <td className="p-3">
                    {formatSAR(rows.reduce((a, r) => a + r.credit, 0))}
                  </td>
                  <td className="p-3">
                    {formatSAR(rows.reduce((a, r) => a + r.balance, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </section>
      </div>
    </AppShell>
  );
}
