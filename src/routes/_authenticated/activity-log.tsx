import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { History } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { listAudit } from "@/lib/db/ops-repo";

export const Route = createFileRoute("/_authenticated/activity-log")({
  head: () => ({
    meta: [
      { title: "سجل النشاط — آخر التغييرات الإدارية | Salon Flow" },
      {
        name: "description",
        content:
          "عرض آخر العمليات الإدارية في المشغل: نوع العملية والجدول والوقت، لمتابعة تغييرات الفريق.",
      },
      { property: "og:title", content: "سجل النشاط — Salon Flow" },
      { property: "og:description", content: "متابعة آخر التغييرات الإدارية داخل المشغل." },
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
  inventory_items: "المخزون",
  expenses: "المصروفات",
  cash_shifts: "الصندوق",
  salons: "إعدادات المشغل",
  salon_members: "أعضاء الفريق",
};

function ActivityLogPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const [action, setAction] = useState("");

  const audit = useQuery({
    queryKey: ["audit", salonId],
    queryFn: () => listAudit(salonId!, 100),
    enabled: !!salonId,
  });

  const rows = useMemo(
    () => (audit.data ?? []).filter((e) => !action || e.action === action),
    [audit.data, action],
  );

  return (
    <AppShell
      title="سجل النشاط"
      subtitle="آخر 100 عملية إدارية في المشغل"
      action={
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          aria-label="نوع العملية"
          className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
        >
          <option value="">كل العمليات</option>
          <option value="INSERT">إضافة</option>
          <option value="UPDATE">تعديل</option>
          <option value="DELETE">حذف</option>
        </select>
      }
    >
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold flex items-center gap-2 mb-3">
          <History className="size-4 text-primary" /> العمليات
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-right">الوقت</th>
                <th className="p-2 text-right">العملية</th>
                <th className="p-2 text-right">القسم</th>
                <th className="p-2 text-right">المرجع</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="p-2 whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString("ar-SA")}
                  </td>
                  <td className="p-2">{ACTION_LABEL[e.action] ?? e.action}</td>
                  <td className="p-2">{ENTITY_LABEL[e.entity] ?? e.entity}</td>
                  <td className="p-2 text-xs text-muted-foreground">
                    {e.entity_id ? e.entity_id.slice(0, 8) : "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    لا توجد عمليات مسجلة.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
