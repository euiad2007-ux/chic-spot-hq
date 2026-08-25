import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  RotateCcw,
  Wallet,
} from "lucide-react";


import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import { exportCsv, stampName } from "@/lib/export";
import { loadMoneyLedger, methodLabel, type LedgerKindFilter } from "@/lib/db/ledger-repo";

export const Route = createFileRoute("/_authenticated/ledger")({
  head: () => ({
    meta: [
      { title: "السجل المالي — كل حركة نقدية في المشغل | Salon Flow" },
      {
        name: "description",
        content:
          "سجل مالي رقمي يعرض كل تحصيل فاتورة واسترجاع ومصروف مع فلاتر الفترة والنوع وطريقة الدفع وإجماليات صافي الفترة وتصدير Excel.",
      },
      { property: "og:title", content: "السجل المالي — Salon Flow" },
      { property: "og:description", content: "كل الحركات النقدية للمشغل في مكان واحد مع فلاتر وتصدير." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LedgerPage,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

const KINDS: { id: LedgerKindFilter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "income", label: "تحصيل" },
  { id: "refund", label: "استرجاع" },
  { id: "expense", label: "مصروف" },
];

function LedgerPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(iso(monthStart));
  const [to, setTo] = useState(iso(today));
  const [kind, setKind] = useState<LedgerKindFilter>("all");
  const [method, setMethod] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const ledger = useQuery({
    queryKey: ["money-ledger", salonId, from, to],
    queryFn: () => loadMoneyLedger(salonId!, from, to),
    enabled: !!salonId,
    placeholderData: (prev) => prev,
  });

  const rows = useMemo(() => {
    const all = ledger.data?.rows ?? [];
    const term = q.trim();
    return all.filter(
      (r) =>
        (kind === "all" || r.kind === kind) &&
        (method === "all" || (r.method ?? "") === method) &&
        (!term || r.label.includes(term) || (r.reference ?? "").includes(term)),
    );
  }, [ledger.data, kind, method, q]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => rows.slice((current - 1) * pageSize, current * pageSize),
    [rows, current, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [from, to, kind, method, q, pageSize, salonId]);

  const busy = ledger.isLoading || ledger.isFetching;
  const filteredTotal = rows.reduce((s, r) => s + r.amount, 0);
  const d = ledger.data;


  return (
    <AppShell
      title="السجل المالي"
      subtitle="كل حركة نقدية للمشغل: التحصيلات، الاسترجاعات، والمصروفات"
      action={
        <button
          onClick={() =>
            exportCsv(
              stampName("money-ledger"),
              ["التاريخ", "النوع", "البيان", "المرجع", "طريقة الدفع", "المبلغ"],
              rows.map((r) => [
                new Date(r.at).toLocaleString("ar-SA"),
                r.kind === "income" ? "تحصيل" : r.kind === "refund" ? "استرجاع" : "مصروف",
                r.label,
                r.reference ?? "",
                methodLabel(r.method),
                r.amount,
              ]),
            )
          }
          disabled={rows.length === 0}
          className="h-10 px-4 rounded-xl border border-border font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Download className="size-4" /> تصدير Excel
        </button>
      }
    >
      <div className="space-y-4">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="إجمالي التحصيل" value={formatSAR(d?.income ?? 0)} icon={ArrowUpCircle} tone="good" />
          <Stat label="الاسترجاعات" value={formatSAR(d?.refunds ?? 0)} icon={RotateCcw} tone="bad" />
          <Stat label="المصروفات" value={formatSAR(d?.expenses ?? 0)} icon={ArrowDownCircle} tone="bad" />
          <Stat
            label="صافي الفترة"
            value={formatSAR(d?.net ?? 0)}
            icon={Wallet}
            tone={(d?.net ?? 0) >= 0 ? "good" : "bad"}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">من</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">إلى</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">طريقة الدفع</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm"
            >
              <option value="all">الكل</option>
              <option value="cash">نقدًا</option>
              <option value="card">شبكة</option>
              <option value="transfer">تحويل</option>
              <option value="wallet">محفظة</option>
            </select>
          </label>
          <label className="space-y-1 flex-1 min-w-40">
            <span className="block text-xs text-muted-foreground">بحث</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="رقم فاتورة، عميل، أو بند مصروف"
              className="w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={
                  kind === k.id
                    ? "h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
                    : "h-10 px-4 rounded-xl border border-border font-bold text-sm text-muted-foreground"
                }
              >
                {k.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="font-bold flex items-center gap-2">
              الحركات ({rows.length})
              {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            </h2>
            <span className={filteredTotal >= 0 ? "font-bold text-success" : "font-bold text-destructive"}>
              صافي المعروض: {formatSAR(filteredTotal)}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="p-2 text-right">التاريخ</th>
                  <th className="p-2 text-right">النوع</th>
                  <th className="p-2 text-right">البيان</th>
                  <th className="p-2 text-right">طريقة الدفع</th>
                  <th className="p-2 text-right">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {ledger.isLoading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="border-t border-border">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="p-2">
                          <div className="h-4 rounded bg-muted animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))}
                {!ledger.isLoading &&
                  pageRows.map((r) => (
                    <tr key={r.kind + r.id} className="border-t border-border">
                      <td className="p-2 whitespace-nowrap">{new Date(r.at).toLocaleString("ar-SA")}</td>
                      <td className="p-2 whitespace-nowrap">
                        <span
                          className={
                            "rounded-lg px-2 py-1 text-xs font-bold " +
                            (r.kind === "income"
                              ? "bg-success/10 text-success"
                              : "bg-destructive/10 text-destructive")
                          }
                        >
                          {r.kind === "income" ? "تحصيل" : r.kind === "refund" ? "استرجاع" : "مصروف"}
                        </span>
                      </td>
                      <td className="p-2">{r.label}</td>
                      <td className="p-2">{methodLabel(r.method)}</td>
                      <td
                        className={
                          "p-2 font-bold " + (r.amount >= 0 ? "text-success" : "text-destructive")
                        }
                      >
                        {formatSAR(r.amount)}
                      </td>
                    </tr>
                  ))}
                {!ledger.isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      لا توجد حركات في هذه الفترة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {rows.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>عدد الصفوف</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-9 rounded-xl border border-border bg-muted/40 px-2 text-sm"
                >
                  {[25, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span>
                  {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, rows.length)} من {rows.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(current - 1)}
                  disabled={current <= 1}
                  className="h-9 px-3 rounded-xl border border-border text-sm font-bold inline-flex items-center gap-1 disabled:opacity-40"
                >
                  <ChevronRight className="size-4" /> السابق
                </button>
                <span className="text-sm font-bold">
                  {current} / {pageCount}
                </span>
                <button
                  onClick={() => setPage(current + 1)}
                  disabled={current >= pageCount}
                  className="h-9 px-3 rounded-xl border border-border text-sm font-bold inline-flex items-center gap-1 disabled:opacity-40"
                >
                  التالي <ChevronLeft className="size-4" />
                </button>
              </div>
            </div>
          )}
        </section>

      </div>
    </AppShell>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: "good" | "bad";
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Icon className={tone === "good" ? "size-4 text-success" : "size-4 text-destructive"} />
        {label}
      </div>
      <div className="font-bold text-lg mt-1">{value}</div>
    </div>
  );
}
