import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, ReceiptText, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import type { TablesUpdate } from "@/integrations/supabase/types";

import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { OwnerShell } from "@/components/platform/owner-shell";
import {
  FinanceCard,
  Field,
  money,
  fmtDate,
  STATUS_LABEL,
  useSalonsOverview,
  usePlans,
} from "@/components/platform/owner-ui";
import {
  listSubscriptionInvoices,
  listSubscriptionPayments,
  createSubscriptionInvoice,
  recordSubscriptionPayment,
  setSubscriptionInvoiceStatus,
  deleteSubscriptionInvoice,
  SUB_STATUS_LABEL,
} from "@/lib/db/platform-repo";

export const Route = createFileRoute("/_authenticated/platform-subscriptions")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إدارة الاشتراكات — الباقات والتواريخ والتحصيل" },
      {
        name: "description",
        content:
          "إدارة اشتراك كل متجر: الباقة، حالة الاشتراك، تاريخ البداية والانتهاء، إصدار فواتير الاشتراك وتسجيل المدفوعات.",
      },
      { property: "og:title", content: "إدارة الاشتراكات — لوحة مالك المنصة" },
      {
        property: "og:description",
        content: "الباقات، مدة الاشتراك، تاريخ الانتهاء، الفواتير والتحصيل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  return (
    <OwnerShell
      title="إدارة الاشتراكات"
      subtitle="الباقة، مدة الاشتراك، تاريخ الانتهاء، الفواتير والتحصيل"
    >
      <div className="space-y-6">
        <SalonSubscriptions />
        <BillingSection />
      </div>
    </OwnerShell>
  );
}

/* ------------------------- subscription per salon ------------------------- */

function SalonSubscriptions() {
  const qc = useQueryClient();
  const salons = useSalonsOverview();
  const plans = usePlans();
  const [q, setQ] = useState("");

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"salons"> }) => {
      const { error } = await supabase.from("salons").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تم تحديث الاشتراك");
      await qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر التحديث"),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (salons.data ?? []).filter(
      (s) => !term || s.name.toLowerCase().includes(term) || s.slug.toLowerCase().includes(term),
    );
  }, [salons.data, q]);

  const daysLeft = (end: string | null) =>
    end ? Math.ceil((new Date(end).getTime() - Date.now()) / 86400000) : null;

  if (salons.isLoading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن متجر"
          className="w-full sm:w-80 h-11 rounded-xl border border-input bg-background pr-10 pl-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-3">
        {rows.map((s) => {
          const plan = (plans.data ?? []).find((p) => p.code === s.plan) ?? null;
          const end = s.subscription_ends_at ?? s.trial_ends_at;
          const left = daysLeft(end);
          return (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    /{s.slug} · {s.owner_email || "بدون بريد"} · بداية الحساب {fmtDate(s.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-1 rounded-full",
                      s.is_suspended
                        ? "bg-destructive/10 text-destructive"
                        : s.subscription_status === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {s.is_suspended
                      ? "موقوف"
                      : STATUS_LABEL[s.subscription_status ?? "trial"] ?? s.subscription_status}
                  </span>
                  {left !== null && (
                    <span
                      className={cn(
                        "text-[11px] font-bold px-2.5 py-1 rounded-full",
                        left < 0
                          ? "bg-destructive/10 text-destructive"
                          : left <= 14
                            ? "bg-accent/15 text-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {left < 0 ? `منتهٍ منذ ${Math.abs(left)} يوم` : `يتبقى ${left} يوم`}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => update.mutate({ id: s.id, patch: { is_suspended: !s.is_suspended } })}
                    className="h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted/50"
                  >
                    {s.is_suspended ? "إلغاء الإيقاف" : "إيقاف"}
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">الباقة</span>
                  <select
                    value={s.plan ?? ""}
                    onChange={(e) => update.mutate({ id: s.id, patch: { plan: e.target.value } })}
                    className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                  >
                    <option value="">— غير محددة —</option>
                    {(plans.data ?? []).map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">حالة الاشتراك</span>
                  <select
                    value={s.subscription_status ?? "trial"}
                    onChange={(e) =>
                      update.mutate({ id: s.id, patch: { subscription_status: e.target.value } })
                    }
                    className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                  >
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">نهاية التجربة</span>
                  <input
                    type="date"
                    defaultValue={(s.trial_ends_at ?? "").slice(0, 10)}
                    onBlur={(e) =>
                      update.mutate({
                        id: s.id,
                        patch: {
                          trial_ends_at: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        },
                      })
                    }
                    className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">نهاية الاشتراك</span>
                  <input
                    type="date"
                    defaultValue={(s.subscription_ends_at ?? "").slice(0, 10)}
                    onBlur={(e) =>
                      update.mutate({
                        id: s.id,
                        patch: {
                          subscription_ends_at: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        },
                      })
                    }
                    className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid sm:grid-cols-4 gap-2 text-xs">
                <Mini label="سعر الباقة" value={plan ? money(Number(plan.price_monthly)) : "—"} />
                <Mini label="مبيعات المتجر" value={money(s.gross_sales)} />
                <Mini label="اشتراكات محصّلة" value={money(s.sub_paid)} />
                <Mini label="مستحق الاشتراك" value={money(s.sub_due)} bad={s.sub_due > 0} />
              </div>

              <div className="flex flex-wrap gap-2">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      const base = s.subscription_ends_at
                        ? new Date(s.subscription_ends_at)
                        : new Date();
                      const next = base.getTime() < Date.now() ? new Date() : base;
                      next.setMonth(next.getMonth() + m);
                      update.mutate({
                        id: s.id,
                        patch: {
                          subscription_ends_at: next.toISOString(),
                          subscription_status: "active",
                        },
                      });
                    }}
                    className="h-8 px-3 rounded-lg border border-primary/30 text-xs font-semibold hover:bg-primary/5"
                  >
                    تجديد {m} شهر
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">لا توجد متاجر مطابقة.</p>
        )}
      </div>
    </section>
  );
}

function Mini({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border p-2",
        bad ? "border-destructive/40 bg-destructive/5" : "border-border",
      )}
    >
      <div className="text-muted-foreground">{label}</div>
      <div className="font-bold mt-0.5">{value}</div>
    </div>
  );
}

/* ------------------------------ billing ---------------------------------- */

function BillingSection() {
  const qc = useQueryClient();
  const salons = useSalonsOverview();
  const plans = usePlans();
  const [salonId, setSalonId] = useState("");
  const invoices = useQuery({
    queryKey: ["platform", "sub-invoices"],
    queryFn: () => listSubscriptionInvoices(),
  });
  const payments = useQuery({
    queryKey: ["platform", "sub-payments"],
    queryFn: () => listSubscriptionPayments(),
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["platform"] });
  };

  const [form, setForm] = useState({
    salonId: "",
    planCode: "",
    periodStart: new Date().toISOString().slice(0, 10),
    months: 1,
    amount: 0,
    vatRate: 15,
    dueDate: "",
    note: "",
  });

  const create = useMutation({
    mutationFn: () =>
      createSubscriptionInvoice({
        salonId: form.salonId,
        planCode: form.planCode || null,
        periodStart: form.periodStart,
        months: Number(form.months) || 1,
        amount: Number(form.amount) || 0,
        vatRate: Number(form.vatRate) || 0,
        dueDate: form.dueDate || null,
        note: form.note || null,
      }),
    onSuccess: async () => {
      toast.success("تم إصدار فاتورة الاشتراك");
      await refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر الإصدار"),
  });

  const pay = useMutation({
    mutationFn: (v: { salonId: string; invoiceId: string; amount: number; method: string }) =>
      recordSubscriptionPayment({ ...v, reference: null }),
    onSuccess: async () => {
      toast.success("تم تسجيل الدفعة");
      await refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر تسجيل الدفعة"),
  });

  const voidInv = useMutation({
    mutationFn: (id: string) => setSubscriptionInvoiceStatus(id, "void"),
    onSuccess: refresh,
  });
  const removeInv = useMutation({
    mutationFn: (id: string) => deleteSubscriptionInvoice(id),
    onSuccess: async () => {
      toast.success("تم الحذف");
      await refresh();
    },
  });

  const nameOf = (id: string) => salons.data?.find((s) => s.id === id)?.name ?? "—";
  const rows = (invoices.data ?? []).filter((i) => !salonId || i.salon_id === salonId);
  const totals = rows.reduce(
    (acc, i) => {
      acc.total += Number(i.total);
      acc.paid += Number(i.paid);
      if (i.status !== "void") acc.due += Number(i.total) - Number(i.paid);
      return acc;
    },
    { total: 0, paid: 0, due: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/30 bg-card p-4 space-y-3">
        <h2 className="font-bold text-sm inline-flex items-center gap-2">
          <ReceiptText className="size-4 text-primary" /> إصدار فاتورة اشتراك
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">المتجر</span>
            <select
              value={form.salonId}
              onChange={(e) => setForm({ ...form, salonId: e.target.value })}
              className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
            >
              <option value="">— اختر المتجر —</option>
              {(salons.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">الباقة</span>
            <select
              value={form.planCode}
              onChange={(e) => {
                const p = (plans.data ?? []).find((x) => x.code === e.target.value);
                setForm({
                  ...form,
                  planCode: e.target.value,
                  amount: p ? Number(p.price_monthly) * (Number(form.months) || 1) : form.amount,
                });
              }}
              className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
            >
              <option value="">— بدون —</option>
              {(plans.data ?? []).map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <Field
            label="بداية الفترة"
            type="date"
            value={form.periodStart}
            onChange={(v) => setForm({ ...form, periodStart: v })}
          />
          <Field
            label="عدد الأشهر"
            type="number"
            value={String(form.months)}
            onChange={(v) => setForm({ ...form, months: Number(v) || 1 })}
          />
          <Field
            label="المبلغ قبل الضريبة"
            type="number"
            value={String(form.amount)}
            onChange={(v) => setForm({ ...form, amount: Number(v) || 0 })}
          />
          <Field
            label="نسبة الضريبة %"
            type="number"
            value={String(form.vatRate)}
            onChange={(v) => setForm({ ...form, vatRate: Number(v) || 0 })}
          />
          <Field
            label="تاريخ الاستحقاق"
            type="date"
            value={form.dueDate}
            onChange={(v) => setForm({ ...form, dueDate: v })}
          />
          <Field label="ملاحظة" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            الإجمالي مع الضريبة:{" "}
            <b className="text-foreground">
              {money(form.amount + (form.amount * form.vatRate) / 100)}
            </b>
          </span>
          <button
            type="button"
            disabled={!form.salonId || create.isPending}
            onClick={() => create.mutate()}
            className="h-10 px-4 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center gap-2 disabled:opacity-60"
          >
            {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            إصدار
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 items-center">
        <select
          value={salonId}
          onChange={(e) => setSalonId(e.target.value)}
          className="h-10 rounded-xl border border-input bg-background px-3 text-sm w-full sm:w-64"
        >
          <option value="">كل المتاجر</option>
          {(salons.data ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-2 flex-1 w-full">
          <FinanceCard label="إجمالي" value={money(totals.total)} />
          <FinanceCard label="محصّل" value={money(totals.paid)} tone="good" />
          <FinanceCard label="مستحق" value={money(totals.due)} tone={totals.due > 0 ? "bad" : "good"} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground bg-muted/40">
            <tr>
              <th className="p-2 text-right">المتجر</th>
              <th className="p-2 text-right">الفترة</th>
              <th className="p-2 text-right">الإجمالي</th>
              <th className="p-2 text-right">المدفوع</th>
              <th className="p-2 text-right">الحالة</th>
              <th className="p-2 text-right">الاستحقاق</th>
              <th className="p-2 text-right">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground text-xs">
                  لا توجد فواتير اشتراك بعد.
                </td>
              </tr>
            ) : (
              rows.map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="p-2 font-semibold">{nameOf(i.salon_id)}</td>
                  <td className="p-2 text-xs">
                    {i.period_start} → {i.period_end}
                  </td>
                  <td className="p-2">{money(Number(i.total))}</td>
                  <td className="p-2">{money(Number(i.paid))}</td>
                  <td className="p-2 text-xs">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full font-bold",
                        i.status === "paid"
                          ? "bg-primary/10 text-primary"
                          : i.status === "void"
                            ? "bg-muted text-muted-foreground"
                            : "bg-destructive/10 text-destructive",
                      )}
                    >
                      {SUB_STATUS_LABEL[i.status] ?? i.status}
                    </span>
                  </td>
                  <td className="p-2 text-xs">{i.due_date ?? "—"}</td>
                  <td className="p-2">
                    <div className="flex gap-1 justify-end">
                      {i.status !== "paid" && i.status !== "void" && (
                        <button
                          type="button"
                          onClick={() =>
                            pay.mutate({
                              salonId: i.salon_id,
                              invoiceId: i.id,
                              amount: Number(i.total) - Number(i.paid),
                              method: "transfer",
                            })
                          }
                          className="h-8 px-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted/50"
                        >
                          سداد كامل
                        </button>
                      )}
                      {i.status !== "void" && (
                        <button
                          type="button"
                          onClick={() => voidInv.mutate(i.id)}
                          className="h-8 px-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted/50"
                        >
                          إلغاء
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeInv.mutate(i.id)}
                        className="size-8 grid place-items-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10"
                        aria-label="حذف"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold text-sm mb-3">آخر الدفعات</h2>
        <ul className="divide-y divide-border text-sm">
          {(payments.data ?? [])
            .filter((p) => !salonId || p.salon_id === salonId)
            .slice(0, 15)
            .map((p) => (
              <li key={p.id} className="py-2 flex items-center justify-between gap-2">
                <span className="font-semibold truncate">{nameOf(p.salon_id)}</span>
                <span className="text-xs text-muted-foreground">
                  {fmtDate(p.paid_at)} · {p.method}
                </span>
                <span className="font-bold">{money(Number(p.amount))}</span>
              </li>
            ))}
          {(payments.data ?? []).length === 0 && (
            <li className="py-3 text-xs text-muted-foreground">لا توجد دفعات مسجّلة.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
