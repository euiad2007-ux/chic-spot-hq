import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Building, Plus, Trash2, TrendingDown } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { AccountingNav } from "@/components/salon/accounting-nav";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import {
  bookValue,
  deleteAsset,
  disposeAsset,
  listAssets,
  loadPostedDepreciation,
  monthlyCharge,
  postDepreciation,
  saveAsset,
} from "@/lib/db/assets-repo";

export const Route = createFileRoute("/_authenticated/accounting/assets")({
  head: () => ({
    meta: [
      { title: "الأصول الثابتة والإهلاك الشهري | Salon Flow" },
      {
        name: "description",
        content:
          "سجل الأصول الثابتة للمشغل: التكلفة، العمر الإنتاجي، الإهلاك الشهري بالقسط الثابت، القيمة الدفترية، والاستبعاد.",
      },
      { property: "og:title", content: "الأصول الثابتة — Salon Flow" },
      { property: "og:description", content: "متابعة الأصول والإهلاك وترحيله محاسبياً." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssetsPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const thisPeriod = () => new Date().toISOString().slice(0, 7);

type FormState = {
  id?: string;
  name: string;
  category: string;
  acquired_on: string;
  cost: number;
  salvage_value: number;
  useful_life_months: number;
  note: string;
};

function AssetsPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const qc = useQueryClient();

  const [form, setForm] = useState<FormState | null>(null);
  const [period, setPeriod] = useState(thisPeriod());

  const assets = useQuery({
    queryKey: ["fixed-assets", salonId],
    queryFn: () => listAssets(salonId!),
    enabled: !!salonId,
  });

  const posted = useQuery({
    queryKey: ["asset-depreciation", salonId],
    queryFn: () => loadPostedDepreciation(salonId!),
    enabled: !!salonId,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["fixed-assets", salonId] });
    void qc.invalidateQueries({ queryKey: ["asset-depreciation", salonId] });
    void qc.invalidateQueries({ queryKey: ["journal", salonId] });
  };

  const rows = useMemo(() => {
    const map = posted.data;
    return (assets.data ?? []).map((a) => {
      const accumulated = map?.get(a.id) ?? 0;
      return { asset: a, accumulated, monthly: monthlyCharge(a), book: bookValue(a, accumulated) };
    });
  }, [assets.data, posted.data]);

  const totals = useMemo(
    () => ({
      cost: rows.reduce((s, r) => s + r.asset.cost, 0),
      accumulated: rows.reduce((s, r) => s + r.accumulated, 0),
      book: rows.reduce((s, r) => s + (r.asset.status === "active" ? r.book : 0), 0),
      monthly: rows.reduce((s, r) => s + (r.asset.status === "active" ? r.monthly : 0), 0),
    }),
    [rows],
  );

  const save = useMutation({
    mutationFn: () => saveAsset(salonId!, form!),
    onSuccess: () => {
      toast.success("تم حفظ الأصل");
      setForm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAsset(id),
    onSuccess: () => {
      toast.success("تم حذف الأصل");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dispose = useMutation({
    mutationFn: (v: { id: string; amount: number }) => disposeAsset(v.id, today(), v.amount),
    onSuccess: () => {
      toast.success("تم استبعاد الأصل");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const depreciate = useMutation({
    mutationFn: () => postDepreciation(salonId!, period),
    onSuccess: (r) =>
      toast.success(
        r.assets > 0
          ? `تم ترحيل إهلاك ${r.assets} أصل بقيمة ${formatSAR(r.amount)}`
          : "لا يوجد إهلاك جديد لهذه الفترة",
      ),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="الأصول الثابتة"
      subtitle="التكلفة والعمر الإنتاجي والإهلاك الشهري والقيمة الدفترية"
      action={
        <button
          onClick={() =>
            setForm({
              name: "",
              category: "",
              acquired_on: today(),
              cost: 0,
              salvage_value: 0,
              useful_life_months: 60,
              note: "",
            })
          }
          className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-2"
        >
          <Plus className="size-4" /> أصل جديد
        </button>
      }
    >
      <div className="space-y-4">
        <AccountingNav />
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="إجمالي تكلفة الأصول" value={formatSAR(totals.cost)} />
          <Stat label="مجمّع الإهلاك المرحّل" value={formatSAR(totals.accumulated)} />
          <Stat label="القيمة الدفترية الحالية" value={formatSAR(totals.book)} />
          <Stat label="الإهلاك الشهري المتوقع" value={formatSAR(totals.monthly)} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">فترة الإهلاك</span>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="input"
            />
          </label>
          <button
            onClick={() => depreciate.mutate()}
            disabled={!salonId || depreciate.isPending}
            className="h-11 px-5 rounded-xl border border-border font-bold inline-flex items-center gap-2 disabled:opacity-50"
          >
            <TrendingDown className="size-4" /> ترحيل إهلاك الفترة
          </button>
          <p className="text-xs text-muted-foreground max-w-md">
            الإهلاك بالقسط الثابت: (التكلفة − القيمة المتبقية) ÷ العمر الإنتاجي بالأشهر، ويُرحّل مرة
            واحدة لكل فترة.
          </p>
        </section>

        {form && (
          <section className="rounded-2xl border border-primary/30 bg-card p-4 space-y-3">
            <h2 className="font-bold">{form.id ? "تعديل أصل" : "أصل جديد"}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="اسم الأصل">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="كرسي حلاقة كهربائي"
                  className="input"
                />
              </Field>
              <Field label="التصنيف">
                <input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="أجهزة ومعدات"
                  className="input"
                />
              </Field>
              <Field label="تاريخ الشراء">
                <input
                  type="date"
                  value={form.acquired_on}
                  onChange={(e) => setForm({ ...form, acquired_on: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="التكلفة">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: Number(e.target.value) || 0 })}
                  className="input"
                />
              </Field>
              <Field label="القيمة المتبقية">
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.salvage_value}
                  onChange={(e) => setForm({ ...form, salvage_value: Number(e.target.value) || 0 })}
                  className="input"
                />
              </Field>
              <Field label="العمر الإنتاجي (شهر)">
                <input
                  type="number"
                  min={1}
                  value={form.useful_life_months}
                  onChange={(e) =>
                    setForm({ ...form, useful_life_months: Number(e.target.value) || 1 })
                  }
                  className="input"
                />
              </Field>
            </div>
            <Field label="ملاحظات">
              <input
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="input"
              />
            </Field>
            <div className="flex gap-2">
              <button
                onClick={() => save.mutate()}
                disabled={!form.name.trim() || form.cost <= 0 || save.isPending}
                className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
              >
                حفظ
              </button>
              <button
                onClick={() => setForm(null)}
                className="h-11 px-5 rounded-xl border border-border font-bold"
              >
                إلغاء
              </button>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card overflow-x-auto">
          <h2 className="p-4 font-bold flex items-center gap-2">
            <Building className="size-4 text-primary" /> سجل الأصول ({rows.length})
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-right">الأصل</th>
                <th className="p-3 text-right">تاريخ الشراء</th>
                <th className="p-3 text-right">التكلفة</th>
                <th className="p-3 text-right">العمر</th>
                <th className="p-3 text-right">إهلاك شهري</th>
                <th className="p-3 text-right">مجمّع الإهلاك</th>
                <th className="p-3 text-right">القيمة الدفترية</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ asset, accumulated, monthly, book }) => (
                <tr key={asset.id} className="border-t border-border">
                  <td className="p-3">
                    <div className="font-semibold">{asset.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {asset.category ?? "غير مصنّف"}
                      {asset.status === "disposed" && " · مستبعد"}
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">{asset.acquired_on}</td>
                  <td className="p-3">{formatSAR(asset.cost)}</td>
                  <td className="p-3">{asset.useful_life_months} شهر</td>
                  <td className="p-3">{formatSAR(monthly)}</td>
                  <td className="p-3">{formatSAR(accumulated)}</td>
                  <td className="p-3 font-bold">{formatSAR(book)}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setForm({
                            id: asset.id,
                            name: asset.name,
                            category: asset.category ?? "",
                            acquired_on: asset.acquired_on,
                            cost: asset.cost,
                            salvage_value: asset.salvage_value,
                            useful_life_months: asset.useful_life_months,
                            note: asset.note ?? "",
                          })
                        }
                        className="h-9 px-3 rounded-lg border border-border text-xs font-bold"
                      >
                        تعديل
                      </button>
                      {asset.status === "active" && (
                        <button
                          onClick={() => {
                            const v = prompt("قيمة بيع/استبعاد الأصل", "0");
                            if (v !== null) dispose.mutate({ id: asset.id, amount: Number(v) || 0 });
                          }}
                          className="h-9 px-3 rounded-lg border border-border text-xs font-bold"
                        >
                          استبعاد
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (confirm(`حذف الأصل ${asset.name}؟`)) remove.mutate(asset.id);
                        }}
                        aria-label="حذف"
                        className="h-9 w-9 rounded-lg border border-border grid place-items-center text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-muted-foreground">
                    لا توجد أصول ثابتة مسجّلة بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
