import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpenCheck, RefreshCw, Scale } from "lucide-react";

import { formatSAR } from "@/lib/salon-store";
import { periodLabel } from "@/lib/db/accounting-repo";
import { listJournal, postPeriod, unpostPeriod, trialBalance, SOURCE_LABEL } from "@/lib/db/journal-repo";

const lastDay = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
};

/** Automatic double-entry posting: invoices, expenses and stocktake differences. */
export function JournalPanel({ salonId }: { salonId: string | null }) {
  const qc = useQueryClient();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));

  const entries = useQuery({
    queryKey: ["journal", salonId, period],
    queryFn: () => listJournal(salonId!, period),
    enabled: !!salonId,
  });

  const rows = entries.data ?? [];
  const tb = useMemo(() => trialBalance(rows), [rows]);

  const post = useMutation({
    mutationFn: () => postPeriod(salonId!, `${period}-01`, lastDay(period)),
    onSuccess: (r) => {
      const total = r.invoices + r.expenses + r.stocktakes;
      toast.success(
        total === 0
          ? "لا توجد مستندات جديدة للترحيل في هذه الفترة"
          : `تم ترحيل ${total} قيد (فواتير ${r.invoices} · مصروفات ${r.expenses} · جرد ${r.stocktakes})`,
      );
      void qc.invalidateQueries({ queryKey: ["journal", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unpost = useMutation({
    mutationFn: () => unpostPeriod(salonId!, period),
    onSuccess: (n) => {
      toast.success(`تم حذف ${n} قيد من الفترة`);
      void qc.invalidateQueries({ queryKey: ["journal", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">فترة الترحيل (شهر)</span>
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value || period)}
            className="input"
          />
        </label>
        <button
          onClick={() => post.mutate()}
          disabled={!salonId || post.isPending}
          className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-2 disabled:opacity-60"
        >
          <BookOpenCheck className="size-4" /> ترحيل تلقائي للفترة
        </button>
        <button
          onClick={() => {
            if (confirm("حذف كل قيود هذه الفترة لإعادة الترحيل؟")) unpost.mutate();
          }}
          disabled={!salonId || unpost.isPending || rows.length === 0}
          className="h-11 px-4 rounded-xl border border-border font-bold inline-flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className="size-4" /> إعادة الترحيل
        </button>
        <p className="text-xs text-muted-foreground ms-auto max-w-sm">
          الترحيل لا يكرر أي مستند مُرحَّل مسبقاً، فيمكن تشغيله في أي وقت خلال الشهر.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Box label="عدد القيود" value={String(rows.length)} />
        <Box label="إجمالي المدين" value={formatSAR(tb.totalDebit)} />
        <Box
          label="إجمالي الدائن"
          value={formatSAR(tb.totalCredit)}
          tone={tb.balanced ? "good" : "bad"}
        />
      </div>

      <section className="rounded-2xl border border-border bg-card overflow-x-auto">
        <h2 className="p-4 font-bold flex items-center gap-2">
          <Scale className="size-4 text-primary" /> ميزان المراجعة — {periodLabel(period)}
          {rows.length > 0 && (
            <span
              className={
                tb.balanced
                  ? "ms-2 rounded-full border border-success/40 bg-success/15 text-success px-2 py-0.5 text-xs"
                  : "ms-2 rounded-full border border-destructive/40 bg-destructive/15 text-destructive px-2 py-0.5 text-xs"
              }
            >
              {tb.balanced ? "متوازن" : "غير متوازن"}
            </span>
          )}
        </h2>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="p-3 text-right">رمز الحساب</th>
              <th className="p-3 text-right">الحساب</th>
              <th className="p-3 text-right">مدين</th>
              <th className="p-3 text-right">دائن</th>
              <th className="p-3 text-right">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {tb.rows.map((r) => (
              <tr key={r.account_code} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{r.account_code}</td>
                <td className="p-3 font-semibold">{r.account_name}</td>
                <td className="p-3">{formatSAR(r.debit)}</td>
                <td className="p-3">{formatSAR(r.credit)}</td>
                <td className={r.balance >= 0 ? "p-3" : "p-3 text-muted-foreground"}>
                  {formatSAR(r.balance)}
                </td>
              </tr>
            ))}
            {tb.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  لم يتم ترحيل هذه الفترة بعد — اضغط «ترحيل تلقائي للفترة».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <h2 className="p-4 font-bold">دفتر اليومية</h2>
        <ul className="divide-y divide-border">
          {rows.map((e) => (
            <li key={e.id} className="p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold">{e.entry_date}</span>
                <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-bold">
                  {SOURCE_LABEL[e.source] ?? e.source}
                </span>
                <span className="text-muted-foreground">{e.memo}</span>
                <span className="ms-auto font-bold">{formatSAR(e.amount)}</span>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                {e.lines.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center gap-3 px-3 py-1.5 text-xs border-b border-border last:border-b-0"
                  >
                    <span className="font-mono text-muted-foreground w-12">{l.account_code}</span>
                    <span className="flex-1">{l.account_name}</span>
                    <span className="w-24 text-start">
                      {l.debit ? `مدين ${formatSAR(l.debit)}` : ""}
                    </span>
                    <span className="w-24 text-start">
                      {l.credit ? `دائن ${formatSAR(l.credit)}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="p-6 text-center text-sm text-muted-foreground">لا توجد قيود مرحّلة.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Box({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
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
