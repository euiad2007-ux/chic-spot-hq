import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowLeft, Building2, Download, Printer, Users } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { listBranchSwitches } from "@/lib/db/ops-repo";
import { exportCsv, printReport, stampName } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/branch-audit")({
  head: () => ({
    meta: [
      { title: "سجل تدقيق تبديل الفروع — من قام بالتبديل ومتى | Salon Flow" },
      {
        name: "description",
        content:
          "سجل كامل لتغييرات نطاق الفرع في لوحة التحكم: الفرع السابق والفرع الجديد ووقت التبديل والمستخدم الذي قام به، مع فلترة بالتاريخ وتصدير CSV.",
      },
      { property: "og:title", content: "سجل تدقيق تبديل الفروع — Salon Flow" },
      {
        property: "og:description",
        content: "تتبّع من بدّل نطاق الفرع في لوحة التحكم ومتى، فرعًا بفرع.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BranchAuditPage,
});

const monthStart = () => new Date().toISOString().slice(0, 8) + "01";
const today = () => new Date().toISOString().slice(0, 10);

function BranchAuditPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [user, setUser] = useState("");

  const trail = useQuery({
    queryKey: ["branch-switch-audit", salonId, from, to],
    queryFn: () => listBranchSwitches(salonId!, { from, to, limit: 1000 }),
    enabled: !!salonId,
  });

  const all = trail.data ?? [];
  const users = useMemo(
    () => Array.from(new Set(all.map((r) => r.userName))).sort(),
    [all],
  );
  const rows = user ? all.filter((r) => r.userName === user) : all;
  const branchCount = useMemo(
    () => new Set(rows.map((r) => r.toBranchId).filter(Boolean)).size,
    [rows],
  );

  return (
    <AppShell
      title="سجل تدقيق الفروع"
      subtitle={`${rows.length} عملية تبديل فرع في الفترة المحددة`}
      action={
        <div className="flex gap-2 print:hidden">
          <button
            onClick={() =>
              exportCsv(
                stampName("branch-switch-audit"),
                ["الوقت", "المستخدم", "من فرع", "إلى فرع"],
                rows.map((r) => [
                  new Date(r.created_at).toISOString(),
                  r.userName,
                  r.fromBranchName,
                  r.toBranchName,
                ]),
              )
            }
            className="h-10 px-3 rounded-xl border border-border font-bold text-sm inline-flex items-center gap-2"
          >
            <Download className="size-4" /> تصدير CSV
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">عمليات التبديل</p>
            <p className="text-2xl font-extrabold">{rows.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">مستخدمون قاموا بالتبديل</p>
            <p className="text-2xl font-extrabold">{users.length}</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">فروع تم الدخول إليها</p>
            <p className="text-2xl font-extrabold">{branchCount}</p>
          </div>
        </div>

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
            <span className="text-xs text-muted-foreground">المستخدم</span>
            <select
              value={user}
              onChange={(e) => setUser(e.target.value)}
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            >
              <option value="">كل المستخدمين</option>
              {users.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="rounded-2xl border border-border bg-card overflow-x-auto">
          <h2 className="p-4 font-bold flex items-center gap-2">
            <Building2 className="size-4 text-primary" /> تغييرات نطاق الفرع
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-right">الوقت</th>
                <th className="p-3 text-right">المستخدم</th>
                <th className="p-3 text-right">من فرع</th>
                <th className="p-3 text-right">إلى فرع</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 text-xs font-mono whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("ar-SA")}
                  </td>
                  <td className="p-3 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <Users className="size-3.5 text-muted-foreground" />
                      {r.userName}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.fromBranchName}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-2 font-bold text-primary">
                      <ArrowLeft className="size-3.5" />
                      {r.toBranchName}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    {trail.isLoading ? "جارٍ تحميل السجل..." : "لا توجد عمليات تبديل فرع في هذه الفترة."}
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
