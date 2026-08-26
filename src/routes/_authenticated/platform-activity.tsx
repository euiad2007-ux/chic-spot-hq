import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, ChevronDown, ChevronUp, History, Loader2 } from "lucide-react";

import { OwnerShell } from "@/components/platform/owner-shell";
import { useAccount } from "@/hooks/use-account";
import {
  listPlatformAudit,
  listPlatformNotifications,
  markPlatformNotificationRead,
  type PlatformAuditRow,
} from "@/lib/db/platform-repo";

export const Route = createFileRoute("/_authenticated/platform-activity")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "إشعارات وسجل عمليات المنصة" },
      { name: "description", content: "تنبيهات انتهاء الاشتراكات وسجل تعديلات المتاجر والباقات والفواتير." },
      { property: "og:title", content: "إشعارات وسجل عمليات المنصة" },
      { property: "og:description", content: "متابعة انتهاء الاشتراكات وكل تعديلات إدارة المنصة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlatformActivityPage,
});

const ACTION_LABEL: Record<string, string> = { insert: "إضافة", update: "تعديل", delete: "حذف" };
const ENTITY_LABEL: Record<string, string> = {
  salons: "المتاجر",
  platform_plans: "الباقات",
  subscription_invoices: "فواتير الاشتراك",
  subscription_payments: "مدفوعات الاشتراك",
  platform_settings: "إعدادات المنصة",
};

function changedFields(row: PlatformAuditRow) {
  const before = row.before ?? {};
  const after = row.after ?? {};
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => !["created_at", "updated_at"].includes(key))
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

function PlatformActivityPage() {
  const { data: account, isLoading: accountLoading } = useAccount();
  const isOwner = account?.role === "platform_owner";
  const qc = useQueryClient();
  const [open, setOpen] = useState<string | null>(null);
  const notifications = useQuery({
    queryKey: ["platform", "notifications"],
    queryFn: listPlatformNotifications,
    enabled: isOwner,
  });
  const audit = useQuery({
    queryKey: ["platform", "audit"],
    queryFn: listPlatformAudit,
    enabled: isOwner,
  });
  const markRead = useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => markPlatformNotificationRead(id, read),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform", "notifications"] }),
  });
  const unread = useMemo(() => (notifications.data ?? []).filter((item) => !item.read_at).length, [notifications.data]);

  return (
    <OwnerShell title="الإشعارات وسجل العمليات" subtitle="انتهاء الاشتراكات وكل تعديل إداري على بيانات المنصة">
      {accountLoading ? (
        <div className="grid place-items-center py-16"><Loader2 className="size-6 animate-spin text-primary" /></div>
      ) : !isOwner ? (
        <p className="text-sm text-muted-foreground">هذه الصفحة متاحة لمالك المنصة فقط.</p>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="font-bold flex items-center gap-2"><Bell className="size-5 text-primary" /> تنبيهات الاشتراكات <span className="text-xs text-muted-foreground">({unread} غير مقروء)</span></h2>
            {notifications.isLoading ? <Loader2 className="size-5 animate-spin" /> : (notifications.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد تنبيهات انتهاء حاليًا.</p>
            ) : (notifications.data ?? []).map((item) => (
              <div key={item.id} className={`border border-border p-4 ${item.read_at ? "bg-muted/30" : "bg-card"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div><div className="font-bold">{item.title}</div><p className="text-sm text-muted-foreground mt-1">{item.body}</p><time className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString("ar-SA")}</time></div>
                  <button type="button" aria-label={item.read_at ? "تحديد كغير مقروء" : "تحديد كمقروء"} title={item.read_at ? "تحديد كغير مقروء" : "تحديد كمقروء"} onClick={() => markRead.mutate({ id: item.id, read: !item.read_at })} className="size-9 shrink-0 grid place-items-center border border-border hover:bg-muted"><Check className="size-4" /></button>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="font-bold flex items-center gap-2"><History className="size-5 text-primary" /> سجل العمليات</h2>
            {audit.isLoading ? <Loader2 className="size-5 animate-spin" /> : (audit.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لم تُسجّل عمليات بعد.</p>
            ) : (audit.data ?? []).map((row) => {
              const fields = changedFields(row);
              const expanded = open === row.id;
              return (
                <div key={row.id} className="border border-border bg-card">
                  <button type="button" onClick={() => setOpen(expanded ? null : row.id)} className="w-full p-4 flex items-center gap-3 text-right hover:bg-muted/40">
                    <span className="font-bold text-sm">{ACTION_LABEL[row.action] ?? row.action}</span>
                    <span className="text-sm">{ENTITY_LABEL[row.entity] ?? row.entity}</span>
                    <span className="text-xs text-muted-foreground">بواسطة {row.actor_name || (row.user_id ? row.user_id.slice(0, 8) : "النظام")}</span>
                    <time className="mr-auto text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("ar-SA")}</time>
                    {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                  {expanded && <div className="border-t border-border p-4 text-xs space-y-2">{fields.length === 0 ? <p className="text-muted-foreground">لا توجد حقول متغيرة قابلة للعرض.</p> : fields.map((field) => <div key={field} className="grid sm:grid-cols-[180px_1fr_1fr] gap-2"><b>{field}</b><span className="text-muted-foreground break-all">قبل: {JSON.stringify(row.before?.[field] ?? null)}</span><span className="break-all">بعد: {JSON.stringify(row.after?.[field] ?? null)}</span></div>)}</div>}
                </div>
              );
            })}
          </section>
        </div>
      )}
    </OwnerShell>
  );
}