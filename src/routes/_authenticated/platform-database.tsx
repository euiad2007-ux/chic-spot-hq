import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Database, Loader2 } from "lucide-react";

import { OwnerShell } from "@/components/platform/owner-shell";
import { formatBytes, OwnerStat } from "@/components/platform/owner-ui";
import { listSalonStorage, listTableSizes } from "@/lib/db/platform-repo";

export const Route = createFileRoute("/_authenticated/platform-database")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "قواعد بيانات المتاجر — لوحة مالك المنصة" },
      {
        name: "description",
        content:
          "حجم بيانات كل متجر على المنصة، عدد السجلات في كل جدول، وحجم جداول قاعدة البيانات الكلي.",
      },
      { property: "og:title", content: "قواعد بيانات المتاجر — لوحة مالك المنصة" },
      {
        property: "og:description",
        content: "مراقبة استهلاك التخزين لكل متجر وحجم جداول قاعدة البيانات.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlatformDatabasePage,
});

const TABLE_LABEL: Record<string, string> = {
  bookings: "الحجوزات",
  booking_services: "خدمات الحجوزات",
  invoices: "الفواتير",
  invoice_items: "بنود الفواتير",
  invoice_payments: "مدفوعات الفواتير",
  customers: "العملاء",
  staff: "الموظفون",
  services: "الخدمات",
  branches: "الفروع",
  inventory_items: "أصناف المخزون",
  stock_movements: "حركات المخزون",
  attendance: "الحضور",
  expenses: "المصروفات",
  journal_entries: "القيود",
  journal_lines: "سطور القيود",
  wallet_transactions: "حركات المحافظ",
  loyalty_transactions: "حركات النقاط",
  notification_events: "الإشعارات",
  audit_log: "سجل التدقيق",
  support_messages: "رسائل الدعم",
};

function PlatformDatabasePage() {
  const storage = useQuery({ queryKey: ["platform", "storage"], queryFn: listSalonStorage });
  const tables = useQuery({ queryKey: ["platform", "table-sizes"], queryFn: listTableSizes });

  const rows = storage.data ?? [];
  const totalRows = rows.reduce((s, r) => s + Number(r.rows_total || 0), 0);
  const totalSalonBytes = rows.reduce((s, r) => s + Number(r.est_bytes || 0), 0);
  const dbBytes = (tables.data ?? []).reduce((s, t) => s + Number(t.total_bytes || 0), 0);

  return (
    <OwnerShell
      title="قواعد بيانات المتاجر"
      subtitle="حجم البيانات المخزّنة لكل متجر وحجم جداول قاعدة البيانات"
    >
      {storage.isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : storage.isError ? (
        <p className="text-sm text-destructive">تعذّر قراءة بيانات التخزين.</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <OwnerStat label="عدد المتاجر" value={String(rows.length)} />
            <OwnerStat label="إجمالي السجلات" value={totalRows.toLocaleString("ar-SA")} />
            <OwnerStat label="حجم بيانات المتاجر (تقديري)" value={formatBytes(totalSalonBytes)} />
            <OwnerStat label="حجم قاعدة البيانات الكلي" value={formatBytes(dbBytes)} />
          </div>

          <div className="space-y-3">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">لا توجد متاجر بعد.</p>
            )}
            {rows
              .slice()
              .sort((a, b) => Number(b.est_bytes) - Number(a.est_bytes))
              .map((r) => {
                const share =
                  totalSalonBytes > 0 ? (Number(r.est_bytes) / totalSalonBytes) * 100 : 0;
                const entries = Object.entries(r.tables ?? {}).sort((a, b) => b[1] - a[1]);
                return (
                  <div
                    key={r.salon_id}
                    className="rounded-2xl border border-border bg-card p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold inline-flex items-center gap-2">
                        <Database className="size-4 text-primary" /> {r.salon_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Number(r.rows_total).toLocaleString("ar-SA")} سجل ·{" "}
                        <b className="text-foreground">{formatBytes(Number(r.est_bytes))}</b>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.max(2, Math.round(share))}%` }}
                      />
                    </div>
                    {entries.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        لا توجد بيانات مسجّلة لهذا المتجر.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                        {entries.map(([table, count]) => (
                          <div key={table} className="rounded-xl border border-border p-2">
                            <div className="text-[10px] text-muted-foreground truncate">
                              {TABLE_LABEL[table] ?? table}
                            </div>
                            <div className="text-sm font-bold">
                              {Number(count).toLocaleString("ar-SA")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <h2 className="p-4 pb-2 font-bold text-sm">حجم جداول قاعدة البيانات</h2>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/40">
                <tr>
                  <th className="p-2 text-right">الجدول</th>
                  <th className="p-2 text-right">عدد السجلات (تقديري)</th>
                  <th className="p-2 text-right">الحجم</th>
                </tr>
              </thead>
              <tbody>
                {(tables.data ?? []).slice(0, 40).map((t) => (
                  <tr key={t.table_name} className="border-t border-border">
                    <td className="p-2 font-semibold" dir="ltr">
                      {t.table_name}
                    </td>
                    <td className="p-2">{Number(t.row_estimate).toLocaleString("ar-SA")}</td>
                    <td className="p-2">{formatBytes(Number(t.total_bytes))}</td>
                  </tr>
                ))}
                {(tables.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-xs text-muted-foreground">
                      لا تتوفر معلومات الحجم.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </OwnerShell>
  );
}
