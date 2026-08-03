import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, BellRing, CalendarClock, PackageSearch, Save } from "lucide-react";

import {
  loadInventoryAlerts,
  saveInventorySettings,
  type InventorySettings,
} from "@/lib/db/inventory-repo";

const CYCLE_TEXT: Record<string, { text: string; tone: "good" | "warn" | "bad" }> = {
  off: { text: "الجرد الدوري معطّل", tone: "good" },
  ok: { text: "الجرد الدوري منتظم", tone: "good" },
  due_soon: { text: "موعد الجرد يقترب", tone: "warn" },
  overdue: { text: "الجرد الدوري متأخر", tone: "bad" },
  never: { text: "لم يُنفّذ أي جرد معتمد بعد", tone: "bad" },
};

/**
 * Periodic-stocktake schedule plus low-stock alerts. Shown on the stocktake
 * page so managers see what needs counting before they start a count sheet.
 */
export function InventoryAlertsPanel({ salonId }: { salonId: string | null }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<InventorySettings | null>(null);

  const alerts = useQuery({
    queryKey: ["inventory-alerts", salonId],
    queryFn: () => loadInventoryAlerts(salonId!),
    enabled: !!salonId,
  });

  const settings = draft ?? alerts.data?.settings ?? null;

  const save = useMutation({
    mutationFn: () => saveInventorySettings(salonId!, settings!),
    onSuccess: () => {
      toast.success("تم حفظ إعدادات الجرد والتنبيهات");
      setDraft(null);
      void qc.invalidateQueries({ queryKey: ["inventory-alerts", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cycle = alerts.data?.cycle;
  const status = cycle ? CYCLE_TEXT[cycle.state] : undefined;
  const stock = alerts.data?.stock ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr] items-start">
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-bold flex items-center gap-2">
          <CalendarClock className="size-4 text-primary" /> ضبط الجرد الدوري
        </h2>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">دورة الجرد (بالأيام) — 0 لتعطيلها</span>
          <input
            type="number"
            min={0}
            value={settings?.cycleDays ?? 30}
            onChange={(e) =>
              settings && setDraft({ ...settings, cycleDays: Math.max(0, Number(e.target.value) || 0) })
            }
            className="input"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">التنبيه قبل الموعد (أيام)</span>
          <input
            type="number"
            min={0}
            value={settings?.remindBeforeDays ?? 3}
            onChange={(e) =>
              settings &&
              setDraft({ ...settings, remindBeforeDays: Math.max(0, Number(e.target.value) || 0) })
            }
            className="input"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings?.lowStockAlerts ?? true}
            onChange={(e) => settings && setDraft({ ...settings, lowStockAlerts: e.target.checked })}
          />
          تنبيه عند وصول الرصيد للحد الأدنى
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings?.outOfStockAlerts ?? true}
            onChange={(e) => settings && setDraft({ ...settings, outOfStockAlerts: e.target.checked })}
          />
          تنبيه حرج عند نفاد الصنف
        </label>

        <button
          onClick={() => settings && save.mutate()}
          disabled={!salonId || !settings || save.isPending}
          className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-2 disabled:opacity-60"
        >
          <Save className="size-4" /> حفظ الإعدادات
        </button>
      </section>

      <div className="space-y-4">
        <section
          className={
            status?.tone === "bad"
              ? "rounded-2xl border border-destructive/40 bg-destructive/10 p-5"
              : status?.tone === "warn"
                ? "rounded-2xl border border-warning/40 bg-warning/10 p-5"
                : "rounded-2xl border border-border bg-card p-5"
          }
        >
          <h2 className="font-bold flex items-center gap-2">
            <BellRing className="size-4 text-primary" /> حالة الجرد الدوري
          </h2>
          <p className="mt-2 text-sm font-bold">{status?.text ?? "…"}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3 text-sm">
            <Info label="آخر جرد معتمد" value={cycle?.lastCountedOn ?? "—"} />
            <Info label="الجرد القادم" value={cycle?.nextDueOn ?? "—"} />
            <Info
              label="المتبقي"
              value={
                cycle?.daysLeft === null || cycle?.daysLeft === undefined
                  ? "—"
                  : cycle.daysLeft < 0
                    ? `متأخر ${Math.abs(cycle.daysLeft)} يوم`
                    : `${cycle.daysLeft} يوم`
              }
            />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-4 flex items-center justify-between gap-2">
            <h2 className="font-bold flex items-center gap-2">
              <AlertTriangle className="size-4 text-primary" /> تنبيهات النقص ({stock.length})
            </h2>
            <Link to="/stock-log" className="text-xs font-bold text-primary inline-flex items-center gap-1">
              <PackageSearch className="size-4" /> سجل الحركات
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {stock.map((s) => (
              <li key={s.item_id} className="p-3 flex items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.message}</div>
                </div>
                <span
                  className={
                    s.level === "critical"
                      ? "rounded-full border border-destructive/40 bg-destructive/15 text-destructive px-2 py-0.5 text-xs font-bold"
                      : "rounded-full border border-warning/40 bg-warning/15 text-warning px-2 py-0.5 text-xs font-bold"
                  }
                >
                  {s.stock} {s.unit}
                </span>
              </li>
            ))}
            {stock.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">
                لا توجد تنبيهات — جميع الأصناف فوق الحد الأدنى.
              </li>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold mt-0.5">{value}</div>
    </div>
  );
}
