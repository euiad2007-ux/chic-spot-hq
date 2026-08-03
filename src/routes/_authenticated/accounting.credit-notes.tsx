import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Download, FileMinus2, Search } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/salon/app-shell";
import { AccountingNav } from "@/components/salon/accounting-nav";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import { exportCsv, stampName } from "@/lib/export";
import {
  findInvoiceToCredit,
  issueCreditNote,
  listCreditNotes,
  type CreditableInvoice,
} from "@/lib/db/credit-note-repo";

export const Route = createFileRoute("/_authenticated/accounting/credit-notes")({
  head: () => ({
    meta: [
      { title: "الملاحظات الدائنة — مرتجعات الفواتير | Salon Flow" },
      {
        name: "description",
        content:
          "إصدار ملاحظات دائنة على فواتير المشغل مع قيد محاسبي عكسي تلقائي، تعديل الضريبة المستحقة، وسجل كامل للمرتجعات.",
      },
      { property: "og:title", content: "الملاحظات الدائنة — Salon Flow" },
      { property: "og:description", content: "مرتجعات الفواتير بقيود عكسية وضريبة معدّلة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CreditNotesPage,
});

const monthStart = () => new Date().toISOString().slice(0, 8) + "01";
const today = () => new Date().toISOString().slice(0, 10);

function CreditNotesPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const qc = useQueryClient();

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [term, setTerm] = useState("");
  const [invoice, setInvoice] = useState<CreditableInvoice | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");

  const notes = useQuery({
    queryKey: ["credit-notes", salonId, from, to],
    queryFn: () => listCreditNotes(salonId!, from, to),
    enabled: !!salonId,
  });

  const lookup = useMutation({
    mutationFn: () => findInvoiceToCredit(salonId!, term),
    onSuccess: (inv) => {
      if (!inv) {
        toast.error("لا توجد فاتورة بهذا الرقم");
        setInvoice(null);
        return;
      }
      setInvoice(inv);
      setQty(Object.fromEntries(inv.items.map((i) => [i.id, 0])));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const lines = (invoice?.items ?? [])
    .map((i) => ({ item: i, qty: qty[i.id] ?? 0 }))
    .filter((l) => l.qty > 0);
  const subtotal = Math.round(lines.reduce((a, l) => a + l.qty * l.item.unit_price, 0) * 100) / 100;
  const vatRate = 15;
  const vat = Math.round(((subtotal * vatRate) / 100) * 100) / 100;
  const total = Math.round((subtotal + vat) * 100) / 100;
  const remaining = invoice ? Math.round((invoice.total - invoice.creditedTotal) * 100) / 100 : 0;

  const issue = useMutation({
    mutationFn: () =>
      issueCreditNote(
        salonId!,
        invoice!.id,
        reason,
        lines.map((l) => ({
          kind: l.item.kind,
          ref_id: l.item.ref_id,
          name: l.item.name,
          qty: l.qty,
          unit_price: l.item.unit_price,
        })),
      ),
    onSuccess: () => {
      toast.success("تم إصدار الملاحظة الدائنة وترحيل القيد العكسي");
      setInvoice(null);
      setQty({});
      setReason("");
      setTerm("");
      qc.invalidateQueries({ queryKey: ["credit-notes"] });
      qc.invalidateQueries({ queryKey: ["journal"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["tax-report"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = notes.data ?? [];
  const totals = rows.reduce(
    (a, r) => ({ sub: a.sub + r.subtotal, vat: a.vat + r.vat, total: a.total + r.total }),
    { sub: 0, vat: 0, total: 0 },
  );

  return (
    <AppShell title="الملاحظات الدائنة" subtitle="مرتجعات الفواتير مع قيد عكسي وضريبة معدّلة">
      <div className="space-y-4">
        <AccountingNav />

        <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-bold flex-1 min-w-52">
              رقم الفاتورة
              <div className="mt-1 flex gap-2">
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") lookup.mutate();
                  }}
                  placeholder="مثال: INV-1024"
                  className="h-10 flex-1 rounded-xl border border-border bg-background px-3 text-sm"
                />
                <button
                  onClick={() => lookup.mutate()}
                  disabled={lookup.isPending || !term.trim()}
                  className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Search className="size-4" />
                  بحث
                </button>
              </div>
            </label>
          </div>

          {invoice && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-4 text-sm">
                <Info label="الفاتورة" value={invoice.number} />
                <Info label="إجمالي الفاتورة" value={formatSAR(invoice.total)} />
                <Info label="مرتجع سابقًا" value={formatSAR(invoice.creditedTotal)} />
                <Info label="المتاح للإرجاع" value={formatSAR(remaining)} />
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs">
                    <tr>
                      <th className="p-3 text-right">البند</th>
                      <th className="p-3 text-right">الكمية الأصلية</th>
                      <th className="p-3 text-right">سعر الوحدة</th>
                      <th className="p-3 text-right">كمية الإرجاع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((i) => (
                      <tr key={i.id} className="border-t border-border">
                        <td className="p-3">{i.name}</td>
                        <td className="p-3">{i.qty}</td>
                        <td className="p-3">{formatSAR(i.unit_price)}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            min={0}
                            max={i.qty}
                            step="1"
                            value={qty[i.id] ?? 0}
                            onChange={(e) =>
                              setQty((q) => ({
                                ...q,
                                [i.id]: Math.min(Math.max(Number(e.target.value) || 0, 0), i.qty),
                              }))
                            }
                            className="h-9 w-24 rounded-lg border border-border bg-background px-2 text-sm"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm font-bold flex-1 min-w-52">
                  سبب الإرجاع
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="إلغاء خدمة، خصم لاحق، خطأ في الفاتورة…"
                    className="mt-1 block w-full h-10 rounded-xl border border-border bg-background px-3 text-sm"
                  />
                </label>
                <div className="rounded-xl border border-border bg-background px-4 py-2 text-sm">
                  <div className="text-xs text-muted-foreground">الوعاء / الضريبة / الإجمالي</div>
                  <div className="font-bold">
                    {formatSAR(subtotal)} · {formatSAR(vat)} · {formatSAR(total)}
                  </div>
                </div>
                <button
                  onClick={() => issue.mutate()}
                  disabled={issue.isPending || total <= 0 || total > remaining + 0.01}
                  className="h-10 px-4 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <FileMinus2 className="size-4" />
                  إصدار ملاحظة دائنة
                </button>
              </div>
              {total > remaining + 0.01 && (
                <p className="text-xs text-destructive">
                  قيمة الإرجاع تتجاوز المتاح على هذه الفاتورة ({formatSAR(remaining)}).
                </p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex flex-wrap items-center gap-3">
            <span className="font-bold text-sm flex-1">سجل الملاحظات الدائنة</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
            <button
              onClick={() =>
                exportCsv(
                  stampName(`credit-notes-${from}-${to}`),
                  ["الرقم", "الفاتورة", "التاريخ", "الوعاء", "الضريبة", "الإجمالي", "السبب"],
                  rows.map((r) => [
                    r.number,
                    r.invoice_number ?? "",
                    r.created_at.slice(0, 10),
                    r.subtotal,
                    r.vat,
                    r.total,
                    r.reason ?? "",
                  ]),
                )
              }
              className="h-9 px-3 rounded-lg border border-border text-sm font-bold inline-flex items-center gap-2"
            >
              <Download className="size-4" />
              CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs">
                <tr>
                  <th className="p-3 text-right">الرقم</th>
                  <th className="p-3 text-right">الفاتورة</th>
                  <th className="p-3 text-right">التاريخ</th>
                  <th className="p-3 text-right">الوعاء</th>
                  <th className="p-3 text-right">الضريبة</th>
                  <th className="p-3 text-right">الإجمالي</th>
                  <th className="p-3 text-right">السبب</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 font-bold">{r.number}</td>
                    <td className="p-3">{r.invoice_number ?? "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.created_at.slice(0, 10)}</td>
                    <td className="p-3">{formatSAR(r.subtotal)}</td>
                    <td className="p-3">{formatSAR(r.vat)}</td>
                    <td className="p-3 font-bold">{formatSAR(r.total)}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.reason ?? "—"}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">
                      لا توجد ملاحظات دائنة في هذه الفترة.
                    </td>
                  </tr>
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-muted/30 font-bold">
                  <tr>
                    <td className="p-3" colSpan={3}>
                      الإجمالي
                    </td>
                    <td className="p-3">{formatSAR(totals.sub)}</td>
                    <td className="p-3">{formatSAR(totals.vat)}</td>
                    <td className="p-3">{formatSAR(totals.total)}</td>
                    <td className="p-3" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}
