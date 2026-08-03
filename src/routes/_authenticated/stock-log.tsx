import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { History, PackageSearch } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import { listCountableItems } from "@/lib/db/stocktake-repo";
import {
  listStockMovements,
  STOCK_KIND_LABEL,
  type StockMoveKind,
} from "@/lib/db/inventory-repo";

export const Route = createFileRoute("/_authenticated/stock-log")({
  head: () => ({
    meta: [
      { title: "سجل حركات المخزون — تتبّع كل كمية | Salon Flow" },
      {
        name: "description",
        content:
          "سجل كامل لحركات مخزون المشغل: الشراء والاستهلاك والتلف والإرجاع وتسويات الجرد مع الكمية والقيمة والسبب والتاريخ.",
      },
      { property: "og:title", content: "سجل حركات المخزون — Salon Flow" },
      { property: "og:description", content: "تتبّع كل زيادة ونقص في المستودع مع سببه وقيمته." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StockLogPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => new Date().toISOString().slice(0, 8) + "01";

const KINDS: StockMoveKind[] = ["purchase", "consume", "adjust", "waste", "return"];

function StockLogPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [itemId, setItemId] = useState("");
  const [kind, setKind] = useState<StockMoveKind | "">("");

  const items = useQuery({
    queryKey: ["stocktake-items", salonId],
    queryFn: () => listCountableItems(salonId!),
    enabled: !!salonId,
  });

  const moves = useQuery({
    queryKey: ["stock-log", salonId, from, to, itemId, kind],
    queryFn: () => listStockMovements(salonId!, { from, to, itemId, kind }),
    enabled: !!salonId,
  });

  const rows = moves.data ?? [];

  const totals = useMemo(() => {
    let inQty = 0;
    let outQty = 0;
    let inValue = 0;
    let outValue = 0;
    for (const m of rows) {
      if (m.qty >= 0) {
        inQty += m.qty;
        inValue += m.value;
      } else {
        outQty += Math.abs(m.qty);
        outValue += Math.abs(m.value);
      }
    }
    return { inQty, outQty, inValue, outValue, net: inValue - outValue };
  }, [rows]);

  return (
    <AppShell title="سجل حركات المخزون" subtitle="كل زيادة ونقص في المستودع مع سببه وقيمته">
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">من</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">إلى</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">الصنف</span>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="input">
              <option value="">كل الأصناف</option>
              {(items.data ?? []).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">نوع الحركة</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as StockMoveKind | "")}
              className="input"
            >
              <option value="">كل الأنواع</option>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {STOCK_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="عدد الحركات" value={String(rows.length)} />
          <Stat label="إجمالي الداخل" value={`${totals.inQty.toFixed(2)}`} tone="good" />
          <Stat label="إجمالي الخارج" value={`${totals.outQty.toFixed(2)}`} tone="bad" />
          <Stat
            label="صافي قيمة الحركة"
            value={formatSAR(totals.net)}
            tone={totals.net >= 0 ? "good" : "bad"}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card overflow-x-auto">
          <h2 className="p-4 font-bold flex items-center gap-2">
            <History className="size-4 text-primary" /> الحركات
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">الصنف</th>
                <th className="p-3 text-right">النوع</th>
                <th className="p-3 text-right">الكمية</th>
                <th className="p-3 text-right">تكلفة الوحدة</th>
                <th className="p-3 text-right">القيمة</th>
                <th className="p-3 text-right">السبب</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap">
                    {new Date(m.created_at).toLocaleString("ar-SA", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="p-3 font-semibold">{m.item_name}</td>
                  <td className="p-3">
                    <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-bold">
                      {STOCK_KIND_LABEL[m.kind] ?? m.kind}
                    </span>
                  </td>
                  <td className={m.qty >= 0 ? "p-3 text-success font-bold" : "p-3 text-destructive font-bold"}>
                    {m.qty > 0 ? `+${m.qty}` : m.qty} {m.unit}
                  </td>
                  <td className="p-3">{formatSAR(m.unit_cost)}</td>
                  <td className="p-3">{formatSAR(Math.abs(m.value))}</td>
                  <td className="p-3 text-muted-foreground">{m.reason ?? "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    <PackageSearch className="size-6 mx-auto mb-2 opacity-60" />
                    لا توجد حركات مخزون في هذه الفترة.
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

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={
          tone === "bad"
            ? "font-bold mt-1 text-destructive"
            : tone === "good"
              ? "font-bold mt-1 text-success"
              : "font-bold mt-1"
        }
      >
        {value}
      </div>
    </div>
  );
}
