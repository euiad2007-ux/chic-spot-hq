import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarRange } from "lucide-react";

import { formatSAR } from "@/lib/salon-store";
import { loadMonthlyTaxSeries } from "@/lib/db/accounting-repo";

/** Twelve monthly VAT returns for a calendar year. */
export function MonthlyTaxPanel({ salonId }: { salonId: string | null }) {
  const [year, setYear] = useState(new Date().getFullYear());

  const q = useQuery({
    queryKey: ["monthly-tax", salonId, year],
    queryFn: () => loadMonthlyTaxSeries(salonId!, year),
    enabled: !!salonId,
  });

  const rows = q.data ?? [];
  const sum = (k: "taxable" | "outputVat" | "inputVat" | "netVatDue" | "gross" | "expenses" | "profit") =>
    Math.round(rows.reduce((a, r) => a + r[k], 0) * 100) / 100;

  const years = [0, 1, 2].map((i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">السنة الضريبية</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input">
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground ms-auto max-w-md">
          كل صف يمثل إقرار ضريبة القيمة المضافة لشهر كامل: ضريبة المخرجات من الفواتير ناقص ضريبة
          المدخلات من المصروفات.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-x-auto">
        <h2 className="p-4 font-bold flex items-center gap-2">
          <CalendarRange className="size-4 text-primary" /> الإقرارات الشهرية {year}
        </h2>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="p-3 text-right">الشهر</th>
              <th className="p-3 text-right">الفواتير</th>
              <th className="p-3 text-right">المبيعات الخاضعة</th>
              <th className="p-3 text-right">ضريبة المخرجات</th>
              <th className="p-3 text-right">المصروفات</th>
              <th className="p-3 text-right">ضريبة المدخلات</th>
              <th className="p-3 text-right">صافي الضريبة</th>
              <th className="p-3 text-right">الربح</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.period} className="border-t border-border">
                <td className="p-3 font-semibold whitespace-nowrap">{r.label}</td>
                <td className="p-3">{r.invoices}</td>
                <td className="p-3">{formatSAR(r.taxable)}</td>
                <td className="p-3">{formatSAR(r.outputVat)}</td>
                <td className="p-3 text-muted-foreground">{formatSAR(r.expenses)}</td>
                <td className="p-3">{formatSAR(r.inputVat)}</td>
                <td className={r.netVatDue > 0 ? "p-3 font-bold text-destructive" : "p-3 font-bold text-success"}>
                  {formatSAR(r.netVatDue)}
                </td>
                <td className={r.profit >= 0 ? "p-3 text-success" : "p-3 text-destructive"}>
                  {formatSAR(r.profit)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-muted/30 font-bold">
              <td className="p-3">إجمالي السنة</td>
              <td className="p-3">{rows.reduce((a, r) => a + r.invoices, 0)}</td>
              <td className="p-3">{formatSAR(sum("taxable"))}</td>
              <td className="p-3">{formatSAR(sum("outputVat"))}</td>
              <td className="p-3">{formatSAR(sum("expenses"))}</td>
              <td className="p-3">{formatSAR(sum("inputVat"))}</td>
              <td className="p-3">{formatSAR(sum("netVatDue"))}</td>
              <td className="p-3">{formatSAR(sum("profit"))}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  );
}
