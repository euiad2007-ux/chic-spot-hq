import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, Loader2, ReceiptText, Wallet } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { formatSAR, formatDate } from "@/lib/salon-store";
import { loadCustomerJourney } from "@/lib/db/customer-journey-repo";

export const Route = createFileRoute("/_authenticated/customer-journey/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "مسار العميل — الحجوزات والفواتير والورديات | NOVAA" },
      { name: "description", content: "كل حجوزات العميل وفواتيره ومدفوعاته والكاش المتبقي لكل وردية." },
      { property: "og:title", content: "مسار العميل — NOVAA" },
      { property: "og:description", content: "متابعة رحلة العميل الكاملة داخل المتجر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JourneyPage,
});

const STATUS: Record<string, string> = {
  new: "جديد", confirmed: "مؤكد", checked_in: "حضر", in_progress: "قيد التنفيذ",
  completed: "مكتمل", no_show: "لم يحضر", cancelled: "ملغي",
  unpaid: "غير مدفوع", partial: "جزئي", paid: "مدفوع", refunded: "مسترد", void: "ملغاة",
};
const METHOD: Record<string, string> = { cash: "كاش", card: "شبكة", wallet: "محفظة", transfer: "تحويل" };

function JourneyPage() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: ["customer-journey", id], queryFn: () => loadCustomerJourney(id) });
  const j = q.data;

  return (
    <AppShell
      title={j ? `مسار العميل: ${j.customer.name}` : "مسار العميل"}
      subtitle="الحجوزات والفواتير والكاش لكل وردية"
      action={
        <Link to="/customers-ledger" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted">
          <ArrowRight className="size-4" /> سجل العملاء
        </Link>
      }
    >
      {q.isLoading ? (
        <div className="grid place-items-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : q.isError ? (
        <p className="text-sm text-destructive">تعذّر التحميل: {(q.error as Error).message}</p>
      ) : !j ? (
        <p className="text-sm text-muted-foreground">العميل غير موجود.</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="إجمالي المشتريات" value={formatSAR(j.customer.totalSpent)} />
            <Stat label="رصيد المحفظة" value={formatSAR(j.customer.walletBalance)} />
            <Stat label="النقاط" value={String(j.customer.loyaltyPoints)} />
            <Stat label="الزيارات" value={String(j.customer.visits)} />
          </div>

          <Section title={`الحجوزات (${j.bookings.length})`} icon={CalendarDays}>
            {j.bookings.length === 0 ? <Empty /> : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground"><tr>
                  <th className="p-2 text-right">التاريخ</th><th className="p-2 text-right">الخدمات</th>
                  <th className="p-2 text-right">الأخصائي</th><th className="p-2 text-right">الحالة</th>
                  <th className="p-2 text-right">الدفع</th><th className="p-2 text-right">المبلغ</th>
                </tr></thead>
                <tbody>{j.bookings.map((b) => (
                  <tr key={b.id} className="border-t border-border">
                    <td className="p-2 text-xs whitespace-nowrap">{formatDate(b.startsAt)}</td>
                    <td className="p-2 text-xs">{b.services.join("، ") || "—"}</td>
                    <td className="p-2 text-xs">{b.staffName ?? "—"}</td>
                    <td className="p-2 text-xs">{STATUS[b.status] ?? b.status}</td>
                    <td className="p-2 text-xs">{STATUS[b.payStatus] ?? b.payStatus}</td>
                    <td className="p-2 font-semibold">{formatSAR(b.price)}</td>
                  </tr>))}
                </tbody>
              </table>
            )}
          </Section>

          <Section title={`الفواتير والمدفوعات (${j.invoices.length})`} icon={ReceiptText}>
            {j.invoices.length === 0 ? <Empty /> : (
              <div className="space-y-2">{j.invoices.map((i) => (
                <div key={i.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-semibold">فاتورة {i.number ?? "—"} · {formatDate(i.createdAt)}</span>
                    <span>{formatSAR(i.paid)} / {formatSAR(i.total)} · {STATUS[i.status] ?? i.status}</span>
                  </div>
                  {i.payments.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{i.payments.map((p) => (
                      <li key={p.id}>
                        {p.isRefund ? "استرداد" : "دفعة"} {formatSAR(p.amount)} — {METHOD[p.method] ?? p.method} — {formatDate(p.createdAt)}
                        {p.shiftId ? " · مسجلة في وردية" : ""}
                      </li>))}
                    </ul>
                  )}
                </div>))}
              </div>
            )}
          </Section>

          <Section title="الكاش حسب الوردية" icon={Wallet}>
            {j.shifts.length === 0 ? <Empty text="لا توجد دفعات كاش مرتبطة بوردية." /> : (
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground"><tr>
                  <th className="p-2 text-right">الوردية</th><th className="p-2 text-right">الكاشير</th>
                  <th className="p-2 text-right">الحالة</th><th className="p-2 text-right">كاش العميل</th>
                  <th className="p-2 text-right">الكاش المتبقي بالوردية</th>
                </tr></thead>
                <tbody>{j.shifts.map((s) => (
                  <tr key={s.shiftId} className="border-t border-border">
                    <td className="p-2 text-xs">{s.openedAt ? formatDate(s.openedAt) : "—"}</td>
                    <td className="p-2 text-xs">{s.cashierName ?? "—"}</td>
                    <td className="p-2 text-xs">{s.status === "closed" ? "مغلقة" : "مفتوحة"}</td>
                    <td className="p-2 font-semibold">{formatSAR(s.customerCash)}</td>
                    <td className="p-2">{formatSAR(s.shiftCashRemaining)}</td>
                  </tr>))}
                </tbody>
              </table>
            )}
          </Section>
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

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Wallet; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 overflow-x-auto">
      <h2 className="flex items-center gap-2 font-bold text-sm mb-3"><Icon className="size-4 text-primary" /> {title}</h2>
      {children}
    </section>
  );
}

function Empty({ text = "لا توجد بيانات." }: { text?: string }) {
  return <p className="text-xs text-muted-foreground py-4 text-center">{text}</p>;
}
