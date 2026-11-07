import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Route as RouteIcon, Search, Users2 } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { formatSAR, formatDate } from "@/lib/salon-store";
import { listCustomerSummaries } from "@/lib/db/customer-journey-repo";

export const Route = createFileRoute("/_authenticated/customers-ledger")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "سجل العملاء — الحجوزات والدفعات والكاش | NOVAA" },
      {
        name: "description",
        content: "كل العملاء مع عدد الحجوزات والفواتير والمدفوعات والكاش المحصّل في كل وردية.",
      },
      { property: "og:title", content: "سجل العملاء — NOVAA" },
      { property: "og:description", content: "حجوزات ودفعات وكاش كل عميل حسب الوردية." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomersLedgerPage,
});

function CustomersLedgerPage() {
  const q = useQuery({ queryKey: ["customers-ledger"], queryFn: listCustomerSummaries });
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const rows = useMemo(() => {
    const t = term.trim();
    return (q.data ?? []).filter((r) => !t || r.name.includes(t) || r.phone.includes(t));
  }, [q.data, term]);

  const totals = rows.reduce(
    (s, r) => ({ paid: s.paid + r.paid, cash: s.cash + r.cashPaid, bookings: s.bookings + r.bookings }),
    { paid: 0, cash: 0, bookings: 0 },
  );

  return (
    <AppShell title="سجل العملاء" subtitle="الحجوزات والدفعات والكاش لكل وردية">
      {q.isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : q.isError ? (
        <p className="text-sm text-destructive">تعذّر تحميل العملاء: {(q.error as Error).message}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="العملاء" value={String(rows.length)} />
            <Stat label="الحجوزات" value={String(totals.bookings)} />
            <Stat label="إجمالي المدفوعات" value={formatSAR(totals.paid)} />
            <Stat label="الكاش المحصّل" value={formatSAR(totals.cash)} />
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="ابحث بالاسم أو الجوال"
              className="w-full h-11 rounded-xl border border-input bg-background pr-10 pl-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/40">
                <tr>
                  <th className="p-2 text-right">العميل</th>
                  <th className="p-2 text-right">الجوال</th>
                  <th className="p-2 text-right">الحجوزات</th>
                  <th className="p-2 text-right">الفواتير</th>
                  <th className="p-2 text-right">المدفوع</th>
                  <th className="p-2 text-right">كاش</th>
                  <th className="p-2 text-right">الورديات</th>
                  <th className="p-2 text-right">آخر حجز</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-xs text-muted-foreground">
                      <Users2 className="size-5 mx-auto mb-2 opacity-60" />
                      لا يوجد عملاء.
                    </td>
                  </tr>
                ) : (
                  rows.slice(0, 500).map((r) => (
                    <>
                      <tr key={r.id} className="border-t border-border">
                        <td className="p-2 font-semibold">{r.name}</td>
                        <td className="p-2 text-xs" dir="ltr">{r.phone}</td>
                        <td className="p-2">{r.bookings}</td>
                        <td className="p-2">{r.invoices}</td>
                        <td className="p-2 font-bold">{formatSAR(r.paid)}</td>
                        <td className="p-2">{formatSAR(r.cashPaid)}</td>
                        <td className="p-2">
                          {r.shifts.length ? (
                            <button
                              type="button"
                              onClick={() => setOpen(open === r.id ? null : r.id)}
                              className="text-primary text-xs font-semibold hover:underline"
                            >
                              {r.shifts.length} وردية
                            </button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-2 text-xs">{r.lastBooking ? formatDate(r.lastBooking) : "—"}</td>
                        <td className="p-2">
                          <Link
                            to="/customer-journey/$id"
                            params={{ id: r.id }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
                          >
                            <RouteIcon className="size-3.5" /> المسار
                          </Link>
                        </td>
                      </tr>
                      {open === r.id && (
                        <tr key={`${r.id}-s`} className="bg-muted/30">
                          <td colSpan={9} className="p-3">
                            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {r.shifts.map((s) => (
                                <div key={s.shiftId} className="rounded-xl border border-border bg-card p-2 text-xs">
                                  <div className="font-semibold">
                                    {s.openedAt ? formatDate(s.openedAt) : "—"} · {s.cashierName ?? "—"}
                                  </div>
                                  <div>كاش العميل: {formatSAR(s.customerCash)}</div>
                                  <div className="text-muted-foreground">
                                    الكاش المتبقي بالوردية: {formatSAR(s.shiftCashRemaining)} (
                                    {s.status === "closed" ? "مغلقة" : "مفتوحة"})
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}
