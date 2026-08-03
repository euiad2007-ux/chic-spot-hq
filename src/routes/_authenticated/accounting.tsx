import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Calculator, Percent } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import { payMethodLabel } from "@/lib/db/ops-repo";
import { loadTaxReport, saveTaxSettings } from "@/lib/db/accounting-repo";

export const Route = createFileRoute("/_authenticated/accounting")({
  head: () => ({
    meta: [
      { title: "المحاسبة الضريبية — إقرار ضريبة القيمة المضافة | Salon Flow" },
      {
        name: "description",
        content:
          "برنامج محاسبي ضريبي للمشغل: ضريبة المخرجات من الفواتير وضريبة المدخلات من المصروفات وصافي الضريبة المستحقة والربح.",
      },
      { property: "og:title", content: "المحاسبة الضريبية — Salon Flow" },
      { property: "og:description", content: "حساب ضريبة القيمة المضافة والربح التشغيلي لأي فترة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountingPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => new Date().toISOString().slice(0, 8) + "01";

function AccountingPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const qc = useQueryClient();

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [taxNumber, setTaxNumber] = useState<string | null>(null);
  const [vatRate, setVatRate] = useState<number | null>(null);
  const [inclusive, setInclusive] = useState<boolean | null>(null);

  const report = useQuery({
    queryKey: ["tax-report", salonId, from, to],
    queryFn: () => loadTaxReport(salonId!, from, to),
    enabled: !!salonId,
  });

  const s = report.data?.settings;
  const numberValue = taxNumber ?? s?.tax_number ?? "";
  const rateValue = vatRate ?? s?.vat_rate ?? 15;
  const inclusiveValue = inclusive ?? s?.expenses_include_vat ?? true;

  const saveSettings = useMutation({
    mutationFn: () =>
      saveTaxSettings(salonId!, {
        tax_number: numberValue,
        vat_rate: rateValue,
        expenses_include_vat: inclusiveValue,
      }),
    onSuccess: () => {
      toast.success("تم حفظ الإعدادات الضريبية");
      void qc.invalidateQueries({ queryKey: ["tax-report", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const d = report.data;

  return (
    <AppShell title="المحاسبة الضريبية" subtitle="إقرار ضريبة القيمة المضافة والربح التشغيلي">
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">من</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">إلى</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
          </label>
          <div className="ms-auto text-sm text-muted-foreground">
            الرقم الضريبي: <strong className="text-foreground">{numberValue || "غير مسجل"}</strong>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="المبيعات الخاضعة للضريبة" value={formatSAR(d?.sales.taxable ?? 0)} />
          <Stat label="ضريبة المخرجات" value={formatSAR(d?.sales.outputVat ?? 0)} />
          <Stat label="ضريبة المدخلات" value={formatSAR(d?.purchases.inputVat ?? 0)} />
          <Stat
            label="صافي الضريبة المستحقة"
            value={formatSAR(d?.netVatDue ?? 0)}
            tone={(d?.netVatDue ?? 0) > 0 ? "bad" : "good"}
          />
          <Stat label="إجمالي المبيعات بالضريبة" value={formatSAR(d?.sales.gross ?? 0)} />
          <Stat label="المصروفات (بالضريبة)" value={formatSAR(d?.purchases.gross ?? 0)} />
          <Stat label="المصروفات بدون ضريبة" value={formatSAR(d?.purchases.net ?? 0)} />
          <Stat
            label="الربح التشغيلي"
            value={formatSAR(d?.profit ?? 0)}
            tone={(d?.profit ?? 0) >= 0 ? "good" : "bad"}
          />
        </section>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr] items-start">
          <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2">
              <Percent className="size-4 text-primary" /> الإعدادات الضريبية
            </h2>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">الرقم الضريبي</span>
              <input
                value={numberValue}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="input"
                inputMode="numeric"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">نسبة ضريبة القيمة المضافة %</span>
              <input
                type="number"
                min={0}
                max={100}
                value={rateValue}
                onChange={(e) => setVatRate(Number(e.target.value) || 0)}
                className="input"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <span className="text-xs text-muted-foreground">
                مبالغ المصروفات مسجّلة شاملة الضريبة
              </span>
              <input
                type="checkbox"
                checked={inclusiveValue}
                onChange={(e) => setInclusive(e.target.checked)}
                className="size-4 accent-primary"
              />
            </label>
            <button
              onClick={() => saveSettings.mutate()}
              disabled={saveSettings.isPending || !salonId}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-60"
            >
              حفظ الإعدادات
            </button>
            <p className="text-[11px] text-muted-foreground">
              ضريبة المدخلات تُستخرج من قيمة المصروف عند عدم إدخالها يدوياً.
            </p>
          </section>

          <section className="space-y-4">
            {(d?.byMethod.length ?? 0) > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {d!.byMethod.map((m) => (
                  <div key={m.method} className="rounded-xl border border-border bg-card p-3">
                    <div className="text-xs text-muted-foreground">{payMethodLabel(m.method)}</div>
                    <div className="font-bold mt-1">{formatSAR(m.total)}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      ضريبة {formatSAR(m.vat)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card overflow-x-auto">
              <h2 className="p-4 font-bold flex items-center gap-2">
                <Calculator className="size-4 text-primary" /> دفتر الفواتير الضريبية
              </h2>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3 text-right">التاريخ</th>
                    <th className="p-3 text-right">الفاتورة</th>
                    <th className="p-3 text-right">الدفع</th>
                    <th className="p-3 text-right">قبل الضريبة</th>
                    <th className="p-3 text-right">الخصم</th>
                    <th className="p-3 text-right">الضريبة</th>
                    <th className="p-3 text-right">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {(d?.ledger ?? []).map((row) => (
                    <tr key={row.number + row.date} className="border-t border-border">
                      <td className="p-3 whitespace-nowrap">{row.date}</td>
                      <td className="p-3 font-semibold">{row.number}</td>
                      <td className="p-3">{payMethodLabel(row.method)}</td>
                      <td className="p-3">{formatSAR(row.subtotal)}</td>
                      <td className="p-3 text-muted-foreground">{formatSAR(row.discount)}</td>
                      <td className="p-3">{formatSAR(row.vat)}</td>
                      <td className="p-3 font-bold">{formatSAR(row.total)}</td>
                    </tr>
                  ))}
                  {(d?.ledger ?? []).length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        لا توجد فواتير في هذه الفترة.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
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
