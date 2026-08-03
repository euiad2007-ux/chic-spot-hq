import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { Download, History, Printer } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { listAuditTrail, type AuditEntry } from "@/lib/db/ops-repo";
import { exportCsv, exportJson, printReport, stampName } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/activity-log")({
  head: () => ({
    meta: [
      { title: "سجل التدقيق الشامل — كل التغييرات الإدارية | Salon Flow" },
      {
        name: "description",
        content:
          "سجل تدقيق شامل لكل عمليات المشغل: نوع العملية والجدول والوقت والقيمة قبل وبعد التعديل، مع فلاتر وتصدير CSV.",
      },
      { property: "og:title", content: "سجل التدقيق الشامل — Salon Flow" },
      { property: "og:description", content: "تتبع كل تغيير في بيانات المشغل مع المقارنة قبل/بعد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ActivityLogPage,
});

const ACTION_LABEL: Record<string, string> = {
  INSERT: "إضافة",
  UPDATE: "تعديل",
  DELETE: "حذف",
};

const ENTITY_LABEL: Record<string, string> = {
  branches: "الفروع",
  services: "الخدمات",
  staff: "الموظفون",
  customers: "العملاء",
  bookings: "الحجوزات",
  invoices: "الفواتير",
  invoice_payments: "مدفوعات الفواتير",
  inventory_items: "المخزون",
  stock_movements: "حركات المخزون",
  expenses: "المصروفات",
  cash_shifts: "الصندوق",
  journal_entries: "القيود اليومية",
  chart_accounts: "دليل الحسابات",
  fixed_assets: "الأصول الثابتة",
  payslips: "مسيّرات الرواتب",
  coupons: "الكوبونات",
  wallet_transactions: "حركات المحفظة",
  salons: "إعدادات المشغل",
  salon_members: "أعضاء الفريق",
};

const entityLabel = (e: string) => ENTITY_LABEL[e] ?? e;
const monthStart = () => new Date().toISOString().slice(0, 8) + "01";
const today = () => new Date().toISOString().slice(0, 10);

/** Field-level diff between the before/after JSON snapshots of one audit row. */
function diffFields(entry: AuditEntry): { field: string; before: string; after: string }[] {
  const before = (entry.before ?? {}) as Record<string, unknown>;
  const after = (entry.after ?? {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const show = (v: unknown) =>
    v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return keys
    .filter((k) => !["updated_at", "created_at"].includes(k))
    .filter((k) => show(before[k]) !== show(after[k]))
    .map((k) => ({ field: k, before: show(before[k]), after: show(after[k]) }));
}

function ActivityLogPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [open, setOpen] = useState<string | null>(null);

  const audit = useQuery({
    queryKey: ["audit-trail", salonId, action, entity, from, to],
    queryFn: () =>
      listAuditTrail(salonId!, { action: action || undefined, entity: entity || undefined, from, to, limit: 1000 }),
    enabled: !!salonId,
  });

  const rows = audit.data ?? [];
  const entities = useMemo(
    () => Array.from(new Set(rows.map((r) => r.entity))).sort(),
    [rows],
  );
  const counts = useMemo(
    () =>
      rows.reduce<Record<string, number>>((a, r) => {
        a[r.action] = (a[r.action] ?? 0) + 1;
        return a;
      }, {}),
    [rows],
  );

  return (
    <AppShell
      title="سجل التدقيق الشامل"
      subtitle={`${rows.length} عملية في الفترة المحددة`}
      action={
        <div className="flex gap-2 print:hidden">
          <button
            onClick={() =>
              exportCsv(
                stampName("audit-trail"),
                ["الوقت", "العملية", "الجدول", "معرّف السجل", "المستخدم", "التغييرات"],
                rows.map((r) => [
                  new Date(r.created_at).toISOString(),
                  ACTION_LABEL[r.action] ?? r.action,
                  entityLabel(r.entity),
                  r.entity_id ?? "",
                  r.user_id ?? "",
                  diffFields(r)
                    .map((d) => `${d.field}: ${d.before} → ${d.after}`)
                    .join(" | "),
                ]),
              )
            }
            className="h-10 px-3 rounded-xl border border-border font-bold text-sm inline-flex items-center gap-2"
          >
            <Download className="size-4" /> تصدير CSV
          </button>
          <button
            onClick={() => exportJson(stampName("audit-trail", "json"), rows)}
            className="h-10 px-3 rounded-xl border border-border font-bold text-sm"
          >
            JSON
          </button>
          <button
            onClick={printReport}
            className="h-10 px-3 rounded-xl border border-border font-bold text-sm inline-flex items-center gap-2"
          >
            <Printer className="size-4" /> طباعة
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3 print:hidden">
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">من</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">إلى</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">نوع العملية</span>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            >
              <option value="">كل العمليات</option>
              <option value="INSERT">إضافة</option>
              <option value="UPDATE">تعديل</option>
              <option value="DELETE">حذف</option>
            </select>
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">الجدول</span>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            >
              <option value="">كل الجداول</option>
              {entities.map((e) => (
                <option key={e} value={e}>
                  {entityLabel(e)}
                </option>
              ))}
            </select>
          </label>
          <div className="ms-auto flex gap-2 text-xs">
            {(["INSERT", "UPDATE", "DELETE"] as const).map((a) => (
              <span key={a} className="rounded-full bg-muted px-3 py-1 font-bold">
                {ACTION_LABEL[a]}: {counts[a] ?? 0}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card overflow-x-auto">
          <h2 className="p-4 font-bold flex items-center gap-2">
            <History className="size-4 text-primary" /> سجل العمليات
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-right">الوقت</th>
                <th className="p-3 text-right">العملية</th>
                <th className="p-3 text-right">الجدول</th>
                <th className="p-3 text-right">معرّف السجل</th>
                <th className="p-3 text-right">التغييرات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const diffs = diffFields(r);
                const isOpen = open === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setOpen(isOpen ? null : r.id)}
                      className="border-t border-border cursor-pointer hover:bg-muted/30"
                    >
                      <td className="p-3 text-xs font-mono">
                        {new Date(r.created_at).toLocaleString("ar-SA")}
                      </td>
                      <td className="p-3">
                        <span
                          className={
                            r.action === "DELETE"
                              ? "rounded-full bg-destructive/15 text-destructive px-2 py-1 text-[11px] font-bold"
                              : r.action === "INSERT"
                                ? "rounded-full bg-success/15 text-success px-2 py-1 text-[11px] font-bold"
                                : "rounded-full bg-primary/15 text-primary px-2 py-1 text-[11px] font-bold"
                          }
                        >
                          {ACTION_LABEL[r.action] ?? r.action}
                        </span>
                      </td>
                      <td className="p-3 font-semibold">{entityLabel(r.entity)}</td>
                      <td className="p-3 font-mono text-[11px] text-muted-foreground">
                        {r.entity_id?.slice(0, 8) ?? "—"}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {diffs.length ? `${diffs.length} حقل — اضغط للتفاصيل` : "—"}
                      </td>
                    </tr>
                    {isOpen && diffs.length > 0 && (
                      <tr className="bg-muted/20">
                        <td colSpan={5} className="p-3">
                          <table className="w-full text-xs">
                            <thead className="text-muted-foreground">
                              <tr>
                                <th className="p-2 text-right">الحقل</th>
                                <th className="p-2 text-right">قبل</th>
                                <th className="p-2 text-right">بعد</th>
                              </tr>
                            </thead>
                            <tbody>
                              {diffs.map((d) => (
                                <tr key={d.field} className="border-t border-border/60">
                                  <td className="p-2 font-mono">{d.field}</td>
                                  <td className="p-2 text-destructive break-all">{d.before}</td>
                                  <td className="p-2 text-success break-all">{d.after}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    لا توجد عمليات مسجلة في هذه الفترة.
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
