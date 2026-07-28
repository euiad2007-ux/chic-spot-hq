import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { useSalon, formatSAR, formatDate, type Invoice } from "@/lib/salon-store";
import { Receipt, TrendingUp, CheckCircle2, Eye } from "lucide-react";
import { useState } from "react";
import { InvoiceReceipt } from "@/components/salon/invoice-receipt";

export const Route = createFileRoute("/invoices")({
  head: () => ({
    meta: [
      { title: "الفواتير — لمسة" },
      { name: "description", content: "سجل الفواتير والمدفوعات." },
      { property: "og:title", content: "الفواتير" },
      { property: "og:description", content: "سجل الفواتير." },
    ],
  }),
  component: InvoicesPage,
});

const METHOD_LABEL = {
  cash: "نقدي", mada: "مدى", card: "بطاقة", apple_pay: "Apple Pay", transfer: "تحويل",
} as const;

function InvoicesPage() {
  const { invoices, customers, bookings } = useSalon((s) => s);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const total = invoices.reduce((a, i) => a + i.total, 0);
  const vat = invoices.reduce((a, i) => a + i.vat, 0);

  return (
    <AppShell title="الفواتير" subtitle={`${invoices.length} فاتورة`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-primary/20 text-primary grid place-items-center"><Receipt className="size-6" /></div>
          <div>
            <div className="text-xs text-muted-foreground">عدد الفواتير</div>
            <div className="text-2xl font-bold">{invoices.length}</div>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-success/20 text-success grid place-items-center"><TrendingUp className="size-6" /></div>
          <div>
            <div className="text-xs text-muted-foreground">إجمالي المبيعات</div>
            <div className="text-2xl font-bold">{formatSAR(total)}</div>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-accent/20 text-accent grid place-items-center"><CheckCircle2 className="size-6" /></div>
          <div>
            <div className="text-xs text-muted-foreground">ضريبة القيمة المضافة</div>
            <div className="text-2xl font-bold">{formatSAR(vat)}</div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3 font-medium">رقم الفاتورة</th>
                <th className="text-right p-3 font-medium">الحجز</th>
                <th className="text-right p-3 font-medium">العميل</th>
                <th className="text-right p-3 font-medium">التاريخ</th>
                <th className="text-right p-3 font-medium">قبل الضريبة</th>
                <th className="text-right p-3 font-medium">الضريبة</th>
                <th className="text-right p-3 font-medium">الإجمالي</th>
                <th className="text-right p-3 font-medium">الدفع</th>
                <th className="text-right p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 && (
                <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">لا توجد فواتير بعد</td></tr>
              )}
              {invoices.slice().reverse().map((i) => {
                const c = customers.find((x) => x.id === i.customerId);
                const b = bookings.find((x) => x.id === i.bookingId);
                return (
                  <tr key={i.id} onClick={() => setSelected(i)} className="border-t border-border hover:bg-muted/20 cursor-pointer">
                    <td className="p-3 font-mono text-xs text-primary">{i.number}</td>
                    <td className="p-3 font-mono text-xs">{b?.code}</td>
                    <td className="p-3 font-semibold">{c?.name}</td>
                    <td className="p-3 text-xs">{formatDate(i.createdAt)}</td>
                    <td className="p-3">{formatSAR(i.subtotal - i.discount)}</td>
                    <td className="p-3 text-muted-foreground">{formatSAR(i.vat)}</td>
                    <td className="p-3 font-bold gradient-text">{formatSAR(i.total)}</td>
                    <td className="p-3"><span className="text-xs px-2 py-1 rounded-full bg-success/15 text-success border border-success/30">{METHOD_LABEL[i.method]}</span></td>
                    <td className="p-3">
                      <button onClick={(e) => { e.stopPropagation(); setSelected(i); }} className="size-8 rounded-lg bg-primary/15 text-primary grid place-items-center hover:bg-primary/25" aria-label="عرض الفاتورة">
                        <Eye className="size-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <InvoiceReceipt invoice={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}
