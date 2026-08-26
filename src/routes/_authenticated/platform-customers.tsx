import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Loader2, Search, Store, Users2, X } from "lucide-react";

import { OwnerShell } from "@/components/platform/owner-shell";
import { money, fmtDate, OwnerStat, STATUS_LABEL } from "@/components/platform/owner-ui";
import {
  listPlatformCustomers,
  listSalonsOverview,
  type PlatformSalonOverview,
} from "@/lib/db/platform-repo";
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

const fmtDateTime = (v: string | null | undefined) =>
  v
    ? new Date(v).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" })
    : "—";

type SpendFilter = "" | "vip" | "active" | "new";
type PeriodFilter = "" | "week" | "month";

const SPEND_LABEL: Record<string, string> = {
  "": "كل المستويات",
  vip: "VIP (أكثر من 5,000)",
  active: "نشِط (له مشتريات)",
  new: "جديد (بدون مشتريات)",
};

const PERIOD_LABEL: Record<string, string> = {
  "": "كل الفترات",
  week: "آخر 7 أيام",
  month: "آخر 30 يومًا",
};

function PlatformCustomersPage() {
  const { data: account, isLoading: accountLoading } = useAccount();
  const isOwner = account?.role === "platform_owner";
  const customers = useQuery({
    queryKey: ["platform", "customers"],
    queryFn: listPlatformCustomers,
    enabled: isOwner,
  });
  const salonsQ = useQuery({
    queryKey: ["platform", "salons-overview"],
    queryFn: listSalonsOverview,
    enabled: isOwner,
  });

  const [q, setQ] = useState("");
  const [salon, setSalon] = useState("");
  const [spend, setSpend] = useState<SpendFilter>("");
  const [period, setPeriod] = useState<PeriodFilter>("");
  const [multiOnly, setMultiOnly] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);

  const rows = customers.data ?? [];
  const salonMap = useMemo(() => {
    const map = new Map<string, PlatformSalonOverview>();
    (salonsQ.data ?? []).forEach((s) => map.set(s.id, s));
    return map;
  }, [salonsQ.data]);

  const salons = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => map.set(r.salon_id, r.salon_name));
    return [...map.entries()];
  }, [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const now = Date.now();
    return rows.filter((r) => {
      if (salon && r.salon_id !== salon) return false;
      const spent = Number(r.total_spent || 0);
      if (spend === "vip" && spent < 5000) return false;
      if (spend === "active" && spent <= 0) return false;
      if (spend === "new" && spent > 0) return false;
      if (period) {
        const days = period === "week" ? 7 : 30;
        if (now - new Date(r.created_at).getTime() > days * 86400_000) return false;
      }
      if (multiOnly && r.salons_count <= 1) return false;
      if (!term) return true;
      return (
        r.name.toLowerCase().includes(term) ||
        (r.phone ?? "").includes(term) ||
        (r.email ?? "").toLowerCase().includes(term) ||
        r.salon_name.toLowerCase().includes(term)
      );
    });
  }, [rows, q, salon, spend, period, multiOnly]);

  const revenue = filtered.reduce((s, r) => s + Number(r.total_spent || 0), 0);
  const wallets = filtered.reduce((s, r) => s + Number(r.wallet_balance || 0), 0);
  const multi = filtered.filter((r) => r.salons_count > 1).length;

  const merchant = merchantId ? (salonMap.get(merchantId) ?? null) : null;

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

          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <div className="relative flex-1 min-w-52">
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
            <select
              value={spend}
              onChange={(e) => setSpend(e.target.value as SpendFilter)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              {Object.entries(SPEND_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
              className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
            >
              {Object.entries(PERIOD_LABEL).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 h-11 px-3 rounded-xl border border-input bg-background text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={multiOnly}
                onChange={(e) => setMultiOnly(e.target.checked)}
                className="accent-primary"
              />
              عملاء متعدد المتاجر
            </label>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/40">
                <tr>
                  <th className="p-2 text-right">العميل</th>
                  <th className="p-2 text-right">المتجر</th>
                  <th className="p-2 text-right">الجوال</th>
                  <th className="p-2 text-right">تاريخ التسجيل</th>
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
                    <td colSpan={11} className="p-8 text-center text-xs text-muted-foreground">
                      <Users2 className="size-5 mx-auto mb-2 opacity-60" />
                      لا يوجد عملاء مطابقون.
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, 400).map((r) => {
                    const m = salonMap.get(r.salon_id);
                    return (
                      <tr key={r.id} className="border-t border-border">
                        <td className="p-2 font-semibold">{r.name}</td>
                        <td className="p-2 text-xs">
                          <span className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setMerchantId(r.salon_id)}
                              className="text-primary hover:underline font-semibold"
                            >
                              {r.salon_name}
                            </button>
                            {m?.slug && (
                              <Link
                                to="/salon/$slug"
                                params={{ slug: m.slug }}
                                target="_blank"
                                className="text-muted-foreground hover:text-primary"
                                title="فتح موقع المتجر"
                              >
                                <ExternalLink className="size-3.5" />
                              </Link>
                            )}
                          </span>
                        </td>
                        <td className="p-2 text-xs" dir="ltr">
                          {r.phone}
                        </td>
                        <td className="p-2 text-xs whitespace-nowrap">
                          {fmtDateTime(r.created_at)}
                        </td>
                        <td className="p-2">{r.visits}</td>
                        <td className="p-2">{r.invoices_count}</td>
                        <td className="p-2 font-bold">{money(Number(r.total_spent))}</td>
                        <td className="p-2">{money(Number(r.wallet_balance))}</td>
                        <td className="p-2">{Number(r.loyalty_points)}</td>
                        <td className="p-2">{r.salons_count}</td>
                        <td className="p-2 text-xs">{fmtDate(r.last_visit)}</td>
                      </tr>
                    );
                  })
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

      {merchant && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          onClick={() => setMerchantId(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid place-items-center size-11 rounded-xl bg-primary/10 text-primary">
                  <Store className="size-5" />
                </span>
                <div>
                  <h3 className="font-bold text-lg">{merchant.name}</h3>
                  <p className="text-xs text-muted-foreground" dir="ltr">
                    {merchant.slug}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMerchantId(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <Info label="الباقة" value={merchant.plan_name ?? merchant.plan ?? "—"} />
              <Info
                label="حالة الاشتراك"
                value={STATUS_LABEL[merchant.subscription_status] ?? merchant.subscription_status}
              />
              <Info label="ينتهي في" value={fmtDate(merchant.subscription_ends_at)} />
              <Info
                label="التجربة تنتهي"
                value={fmtDate(merchant.trial_ends_at)}
              />
              <Info label="المالك" value={merchant.owner_name ?? "—"} />
              <Info label="بريد المالك" value={merchant.owner_email ?? "—"} ltr />
              <Info label="الفروع" value={String(merchant.branches_count)} />
              <Info label="الموظفون" value={String(merchant.staff_count)} />
              <Info label="العملاء" value={String(merchant.customers_count)} />
              <Info label="الحجوزات" value={String(merchant.bookings_count)} />
              <Info label="الفواتير" value={String(merchant.invoices_count)} />
              <Info label="إجمالي المبيعات" value={money(merchant.gross_sales)} />
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {merchant.slug && (
                <Link
                  to="/salon/$slug"
                  params={{ slug: merchant.slug }}
                  target="_blank"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
                >
                  <ExternalLink className="size-4" />
                  فتح موقع المتجر
                </Link>
              )}
              <Link
                to="/platform-subscriptions"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-sm font-semibold hover:bg-muted"
              >
                إدارة الاشتراك
              </Link>
            </div>
          </div>
        </div>
      )}
    </OwnerShell>
  );
}

function Info({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-semibold truncate" dir={ltr ? "ltr" : undefined}>
        {value}
      </p>
    </div>
  );
}
