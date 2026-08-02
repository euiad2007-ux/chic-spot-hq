import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2, Wallet } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import {
  listExpenses,
  addExpense,
  deleteExpense,
  listBranches,
  listShifts,
  findOpenShift,
  EXPENSE_CATEGORIES,
  expenseCategoryLabel,
  PAY_METHODS,
  payMethodLabel,
} from "@/lib/db/ops-repo";

export const Route = createFileRoute("/_authenticated/expenses")({
  head: () => ({
    meta: [
      { title: "المصروفات — تسجيل ومتابعة التكاليف | Salon Flow" },
      {
        name: "description",
        content:
          "تسجيل مصروفات المشغل حسب التصنيف وطريقة الدفع والفرع، وربط المصروف النقدي بوردية الصندوق.",
      },
      { property: "og:title", content: "المصروفات — Salon Flow" },
      { property: "og:description", content: "متابعة مصروفات المشغل وتصنيفها ومقارنتها بالإيراد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExpensesPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => new Date().toISOString().slice(0, 8) + "01";

function ExpensesPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const qc = useQueryClient();

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [form, setForm] = useState({
    category: "supplies",
    amount: 0,
    method: "cash",
    spent_on: today(),
    vendor: "",
    note: "",
    branch_id: "",
  });

  const branches = useQuery({
    queryKey: ["branches", salonId],
    queryFn: () => listBranches(salonId!),
    enabled: !!salonId,
  });
  const shifts = useQuery({
    queryKey: ["shifts", salonId],
    queryFn: () => listShifts(salonId!),
    enabled: !!salonId,
  });
  const expenses = useQuery({
    queryKey: ["expenses", salonId, from, to],
    queryFn: () => listExpenses(salonId!, from, to),
    enabled: !!salonId,
  });

  const branchId = form.branch_id || branches.data?.[0]?.id || null;
  const openShift = useMemo(
    () => (shifts.data ? findOpenShift(shifts.data, branchId) : null),
    [shifts.data, branchId],
  );

  const total = (expenses.data ?? []).reduce((a, e) => a + Number(e.amount), 0);
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses.data ?? [])
      map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses.data]);

  const create = useMutation({
    mutationFn: () =>
      addExpense(salonId!, {
        category: form.category,
        amount: form.amount,
        method: form.method,
        spent_on: form.spent_on,
        vendor: form.vendor,
        note: form.note,
        branch_id: branchId,
        shift_id: form.method === "cash" ? (openShift?.id ?? null) : null,
      }),
    onSuccess: () => {
      toast.success("تم تسجيل المصروف");
      setForm((f) => ({ ...f, amount: 0, vendor: "", note: "" }));
      void qc.invalidateQueries({ queryKey: ["expenses", salonId] });
      void qc.invalidateQueries({ queryKey: ["shift-totals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      toast.success("تم الحذف");
      void qc.invalidateQueries({ queryKey: ["expenses", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="المصروفات" subtitle="سجّل التكاليف وصنّفها لمتابعة الربح الصافي">
      <div className="grid gap-4 lg:grid-cols-[360px_1fr] items-start">
        <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-bold flex items-center gap-2">
            <Wallet className="size-4 text-primary" /> مصروف جديد
          </h2>

          <Field label="التصنيف">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="المبلغ (ريال)">
            <input
              type="number"
              min={0}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) || 0 })}
              className="input"
            />
          </Field>

          <Field label="طريقة الدفع">
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="input"
            >
              {PAY_METHODS.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="التاريخ">
            <input
              type="date"
              value={form.spent_on}
              onChange={(e) => setForm({ ...form, spent_on: e.target.value })}
              className="input"
            />
          </Field>

          {branches.data && branches.data.length > 1 && (
            <Field label="الفرع">
              <select
                value={form.branch_id}
                onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
                className="input"
              >
                {branches.data.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="الجهة / المورد">
            <input
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              className="input"
            />
          </Field>

          <Field label="ملاحظة">
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="input py-2 h-auto"
            />
          </Field>

          {form.method === "cash" && (
            <p className="text-xs text-muted-foreground">
              {openShift
                ? "سيُخصم هذا المصروف من نقد الوردية المفتوحة."
                : "لا توجد وردية مفتوحة، سيُسجّل المصروف بدون ربطه بوردية."}
            </p>
          )}

          <button
            onClick={() => {
              if (form.amount <= 0) return toast.error("أدخل مبلغًا أكبر من صفر");
              create.mutate();
            }}
            disabled={create.isPending || !salonId}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-60"
          >
            تسجيل المصروف
          </button>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
            <Field label="من">
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="إلى">
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="input"
              />
            </Field>
            <div className="ms-auto text-sm">
              إجمالي الفترة: <strong className="text-destructive">{formatSAR(total)}</strong>
            </div>
          </div>

          {byCategory.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {byCategory.map(([code, amount]) => (
                <div key={code} className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">{expenseCategoryLabel(code)}</div>
                  <div className="font-bold mt-1">{formatSAR(amount)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="p-3 text-right">التاريخ</th>
                  <th className="p-3 text-right">التصنيف</th>
                  <th className="p-3 text-right">الجهة</th>
                  <th className="p-3 text-right">الدفع</th>
                  <th className="p-3 text-right">المبلغ</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {(expenses.data ?? []).map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="p-3 whitespace-nowrap">{e.spent_on}</td>
                    <td className="p-3">{expenseCategoryLabel(e.category)}</td>
                    <td className="p-3 text-muted-foreground">{e.vendor ?? "—"}</td>
                    <td className="p-3">{payMethodLabel(e.method)}</td>
                    <td className="p-3 font-bold">{formatSAR(Number(e.amount))}</td>
                    <td className="p-3">
                      <button
                        onClick={() => {
                          if (confirm("حذف المصروف؟")) remove.mutate(e.id);
                        }}
                        aria-label="حذف"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {(expenses.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      لا توجد مصروفات في هذه الفترة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
