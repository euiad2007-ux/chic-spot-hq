import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, Users2 } from "lucide-react";

import { OwnerShell } from "@/components/platform/owner-shell";
import { money, fmtDate, OwnerStat } from "@/components/platform/owner-ui";
import { listPlatformCustomers } from "@/lib/db/platform-repo";
import { useAccount } from "@/hooks/use-account";

export const Route = createFileRoute("/_authenticated/platform-customers")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "عملاء المتاجر — لوحة مالك المنصة" },
      {
        name: "description",
        content:
          "عرض جميع عملاء المتاجر على المنصة: المتجر المسجّل به العميل، الزيارات، إجمالي المشتريات، رصيد المحفظة ونقاط الولاء.",
      },
      { property: "og:title", content: "عملاء المتاجر — لوحة مالك المنصة" },
      {
        property: "og:description",
        content: "قاعدة عملاء المنصة كاملة مع الإيرادات ومتاجر كل عميل.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlatformCustomersPage,
});

function PlatformCustomersPage() {
  const { data: account, isLoading: accountLoading } = useAccount();
  const isOwner = account?.role === "platform_owner";
  const customers = useQuery({
    queryKey: ["platform", "customers"],
    queryFn: listPlatformCustomers,
    enabled: isOwner,
  });
  const [q, setQ] = useState("");
  const [salon, setSalon] = useState("");

  const rows = customers.data ?? [];
  const salons = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.salon_id, r.salon_name));
    return [...map.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (salon && r.salon_id !== salon) return false;
      if (!term) return true;
      return (
        r.name.toLowerCase().includes(term) ||
        (r.phone ?? "").includes(term) ||
        (r.email ?? "").toLowerCase().includes(term) ||
        r.salon_name.toLowerCase().includes(term)
      );
    });
  }, [rows, q, salon]);

  const revenue = filtered.reduce((s, r) => s + Number(r.total_spent || 0), 0);
  const wallets = filtered.reduce((s, r) => s + Number(r.wallet_balance || 0), 0);
  const multi = filtered.filter((r) => r.salons_count > 1).length;

  return (
    <OwnerShell title="عملاء المتاجر" subtitle="كل عملاء المنصة، متاجرهم، وعائدهم">
      {accountLoading || customers.isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : !isOwner ? (
        <p className="text-sm text-muted-foreground">هذه الصفحة متاحة لمالك المنصة فقط.</p>
      ) : customers.isError ? (
        <p className="text-sm text-destructive">تعذّر تحميل بيانات العملاء.</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <OwnerStat label="عدد العملاء" value={String(filtered.length)} />
            <OwnerStat label="إجمالي عائد العملاء" value={money(revenue)} />
            <OwnerStat label="أرصدة المحافظ" value={money(wallets)} />
            <OwnerStat label="عملاء في أكثر من متجر" value={String(multi)} />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث باسم العميل أو الجوال أو البريد أو المتجر"
                className="w-full h-11 rounded-xl border border-input bg-background pr-10 pl-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <select
              value={salon}
              onChange={(e) => setSalon(e.target.value)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">كل المتاجر</option>
              {salons.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/40">
                <tr>
                  <th className="p-2 text-right">العميل</th>
                  <th className="p-2 text-right">المتجر</th>
                  <th className="p-2 text-right">الجوال</th>
                  <th className="p-2 text-right">الزيارات</th>
                  <th className="p-2 text-right">الفواتير</th>
                  <th className="p-2 text-right">إجمالي المشتريات</th>
                  <th className="p-2 text-right">المحفظة</th>
                  <th className="p-2 text-right">النقاط</th>
                  <th className="p-2 text-right">متاجره</th>
                  <th className="p-2 text-right">آخر زيارة</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-xs text-muted-foreground">
                      <Users2 className="size-5 mx-auto mb-2 opacity-60" />
                      لا يوجد عملاء مطابقون.
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, 400).map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-2 font-semibold">{r.name}</td>
                      <td className="p-2 text-xs">{r.salon_name}</td>
                      <td className="p-2 text-xs" dir="ltr">
                        {r.phone}
                      </td>
                      <td className="p-2">{r.visits}</td>
                      <td className="p-2">{r.invoices_count}</td>
                      <td className="p-2 font-bold">{money(Number(r.total_spent))}</td>
                      <td className="p-2">{money(Number(r.wallet_balance))}</td>
                      <td className="p-2">{Number(r.loyalty_points)}</td>
                      <td className="p-2">{r.salons_count}</td>
                      <td className="p-2 text-xs">{fmtDate(r.last_visit)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filtered.length > 400 && (
            <p className="text-xs text-muted-foreground">
              يتم عرض أول 400 عميل — استخدم البحث لتضييق النتائج.
            </p>
          )}
        </div>
      )}
    </OwnerShell>
  );
}
