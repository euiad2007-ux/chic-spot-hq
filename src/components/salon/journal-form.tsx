import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, NotebookPen } from "lucide-react";

import { formatSAR } from "@/lib/salon-store";
import { listAccounts } from "@/lib/db/coa-repo";
import { createEntry } from "@/lib/db/journal-repo";

interface Row {
  account_code: string;
  debit: string;
  credit: string;
}

const emptyRows = (): Row[] => [
  { account_code: "", debit: "", credit: "" },
  { account_code: "", debit: "", credit: "" },
];

const num = (v: string) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** Manual double-entry form validated against the chart of accounts. */
export function JournalForm({ salonId }: { salonId: string | null }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState("");
  const [rows, setRows] = useState<Row[]>(emptyRows);

  const accounts = useQuery({
    queryKey: ["chart-accounts", salonId],
    queryFn: () => listAccounts(salonId!),
    enabled: !!salonId,
  });

  const usable = (accounts.data ?? []).filter((a) => a.is_active);

  const totals = useMemo(() => {
    const debit = rows.reduce((a, r) => a + num(r.debit), 0);
    const credit = rows.reduce((a, r) => a + num(r.credit), 0);
    return {
      debit: Math.round(debit * 100) / 100,
      credit: Math.round(credit * 100) / 100,
      balanced: Math.abs(debit - credit) < 0.01 && debit > 0,
    };
  }, [rows]);

  const save = useMutation({
    mutationFn: () =>
      createEntry(
        salonId!,
        date,
        memo,
        rows.map((r) => ({ account_code: r.account_code, debit: num(r.debit), credit: num(r.credit) })),
      ),
    onSuccess: () => {
      toast.success("تم تسجيل القيد اليدوي");
      setRows(emptyRows());
      setMemo("");
      void qc.invalidateQueries({ queryKey: ["journal", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <h2 className="font-bold flex items-center gap-2">
        <NotebookPen className="size-4 text-primary" /> قيد يومي يدوي
      </h2>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 block">
          <span className="text-xs text-muted-foreground">تاريخ القيد</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </label>
        <label className="space-y-1 block sm:col-span-2">
          <span className="text-xs text-muted-foreground">البيان / الوصف</span>
          <input
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="مثال: إيداع نقدي في البنك"
            className="input"
          />
        </label>
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto] items-end">
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">الحساب</span>
              <select
                value={r.account_code}
                onChange={(e) => setRow(i, { account_code: e.target.value })}
                className="input"
              >
                <option value="">— اختر الحساب —</option>
                {usable.map((a) => (
                  <option key={a.code} value={a.code}>
                    {a.code} — {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">مدين</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={r.debit}
                onChange={(e) => setRow(i, { debit: e.target.value, credit: "" })}
                className="input"
              />
            </label>
            <label className="space-y-1 block">
              <span className="text-xs text-muted-foreground">دائن</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={r.credit}
                onChange={(e) => setRow(i, { credit: e.target.value, debit: "" })}
                className="input"
              />
            </label>
            <button
              onClick={() => setRows((prev) => (prev.length > 2 ? prev.filter((_, x) => x !== i) : prev))}
              aria-label="حذف السطر"
              className="h-11 w-11 rounded-xl border border-border grid place-items-center text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setRows((p) => [...p, { account_code: "", debit: "", credit: "" }])}
          className="h-10 px-4 rounded-xl border border-border font-bold text-sm inline-flex items-center gap-2"
        >
          <Plus className="size-4" /> سطر جديد
        </button>
        <span className="text-sm">
          مدين <b>{formatSAR(totals.debit)}</b> · دائن <b>{formatSAR(totals.credit)}</b>
        </span>
        <span
          className={
            totals.balanced
              ? "rounded-full border border-success/40 bg-success/15 text-success px-3 py-1 text-xs font-bold"
              : "rounded-full border border-destructive/40 bg-destructive/15 text-destructive px-3 py-1 text-xs font-bold"
          }
        >
          {totals.balanced ? "القيد متوازن" : "القيد غير متوازن"}
        </span>
        <button
          onClick={() => save.mutate()}
          disabled={!salonId || !totals.balanced || save.isPending}
          className="ms-auto h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
        >
          حفظ القيد
        </button>
      </div>
    </section>
  );
}
