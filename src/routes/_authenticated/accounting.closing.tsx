import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Lock, LockOpen, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/salon/app-shell";
import { AccountingNav } from "@/components/salon/accounting-nav";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import { loadFinancials } from "@/lib/db/coa-repo";
import { closeFiscalYear, listFiscalYears, reopenFiscalYear } from "@/lib/db/close-repo";

export const Route = createFileRoute("/_authenticated/accounting/closing")({
  head: () => ({
    meta: [
      { title: "الإقفال السنوي — ترحيل الأرباح وقفل الفترة | Salon Flow" },
      {
        name: "description",
        content:
          "إقفال السنة المالية للمشغل: ترحيل الإيرادات والمصروفات إلى الأرباح المحتجزة، قفل القيود، وإعادة فتح السنة عند الحاجة.",
      },
      { property: "og:title", content: "الإقفال السنوي — Salon Flow" },
      { property: "og:description", content: "ترحيل صافي الربح إلى الأرباح المحتجزة وقفل الفترة المحاسبية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClosingPage,
});

function ClosingPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const isOwner = account?.role === "salon_owner" || account?.role === "platform_owner";
  const qc = useQueryClient();

  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear - 1);
  const [note, setNote] = useState("");

  const years = useQuery({
    queryKey: ["fiscal-years", salonId],
    queryFn: () => listFiscalYears(salonId!),
    enabled: !!salonId,
  });

  const preview = useQuery({
    queryKey: ["fiscal-preview", salonId, year],
    queryFn: () => loadFinancials(salonId!, `${year}-01-01`, `${year}-12-31`),
    enabled: !!salonId,
  });

  const closed = (years.data ?? []).find((y) => y.year === year && y.status === "closed");

  const close = useMutation({
    mutationFn: () => closeFiscalYear(salonId!, year, note),
    onSuccess: () => {
      toast.success(`تم إقفال السنة ${year} وترحيل صافي الربح إلى الأرباح المحتجزة`);
      setNote("");
      qc.invalidateQueries({ queryKey: ["fiscal-years"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["financials"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reopen = useMutation({
    mutationFn: (y: number) => reopenFiscalYear(salonId!, y),
    onSuccess: () => {
      toast.success("تم إعادة فتح السنة وحذف قيد الإقفال");
      qc.invalidateQueries({ queryKey: ["fiscal-years"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["financials"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const f = preview.data;

  return (
    <AppShell title="الإقفال السنوي" subtitle="ترحيل نتيجة النشاط إلى الأرباح المحتجزة وقفل الفترة">
      <div className="space-y-4">
        <AccountingNav />

        {!isOwner && (
          <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3 text-sm">
            <ShieldAlert className="size-5 text-muted-foreground" />
            الإقفال وإعادة الفتح متاحان لمالك الصالون فقط — يمكنك الاطلاع على السنوات المقفلة فقط.
          </div>
        )}

        <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-bold">
              السنة المالية
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="mt-1 block h-10 rounded-xl border border-border bg-background px-3 text-sm"
              >
                {Array.from({ length: 6 }, (_, i) => thisYear - i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold flex-1 min-w-52">
              ملاحظة القيد
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={`قيد إقفال السنة المالية ${year}`}
                className="mt-1 block w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
              />
            </label>
            {closed ? (
              <button
                disabled={!isOwner || reopen.isPending}
                onClick={() => reopen.mutate(year)}
                className="h-10 px-4 rounded-xl border border-border font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                <LockOpen className="size-4" />
                إعادة فتح السنة
              </button>
            ) : (
              <button
                disabled={!isOwner || close.isPending || !f}
                onClick={() => close.mutate()}
                className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Lock className="size-4" />
                إقفال السنة {year}
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="إجمالي الإيرادات" value={formatSAR(f?.totalRevenue ?? 0)} />
            <Stat label="إجمالي المصروفات" value={formatSAR(f?.totalExpenses ?? 0)} />
            <Stat
              label="صافي الربح المرحّل"
              value={formatSAR(f?.netProfit ?? 0)}
              tone={(f?.netProfit ?? 0) >= 0 ? "good" : "bad"}
            />
          </div>

          <p className="text-xs text-muted-foreground leading-6">
            قيد الإقفال يعكس أرصدة حسابات الإيرادات والمصروفات بتاريخ 31/12 ويحوّل الفرق إلى حساب
            «الأرباح المحتجزة 3090». بعد الإقفال لا يمكن إضافة أو تعديل أو حذف أي قيد يقع داخل السنة
            حتى إعادة فتحها.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border font-bold text-sm">سجل السنوات المالية</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs">
                <tr>
                  <th className="p-3 text-right">السنة</th>
                  <th className="p-3 text-right">الحالة</th>
                  <th className="p-3 text-right">الإيرادات</th>
                  <th className="p-3 text-right">المصروفات</th>
                  <th className="p-3 text-right">صافي الربح</th>
                  <th className="p-3 text-right">تاريخ الإقفال</th>
                </tr>
              </thead>
              <tbody>
                {(years.data ?? []).map((y) => (
                  <tr key={y.id} className="border-t border-border">
                    <td className="p-3 font-bold">{y.year}</td>
                    <td className="p-3">
                      <span
                        className={
                          y.status === "closed"
                            ? "px-2 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-bold"
                            : "px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold"
                        }
                      >
                        {y.status === "closed" ? "مقفلة" : "مفتوحة"}
                      </span>
                    </td>
                    <td className="p-3">{formatSAR(y.total_revenue)}</td>
                    <td className="p-3">{formatSAR(y.total_expenses)}</td>
                    <td className="p-3 font-bold">{formatSAR(y.net_profit)}</td>
                    <td className="p-3 text-muted-foreground text-xs">
                      {y.closed_at ? new Date(y.closed_at).toLocaleString("ar-SA") : "—"}
                    </td>
                  </tr>
                ))}
                {(years.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground text-sm">
                      لم يتم إقفال أي سنة مالية بعد.
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          "mt-1 text-lg font-bold " +
          (tone === "bad" ? "text-destructive" : tone === "good" ? "text-primary" : "")
        }
      >
        {value}
      </div>
    </div>
  );
}
