import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, CheckCircle2, Trash2 } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import { listBranches } from "@/lib/db/ops-repo";
import {
  listCountableItems,
  listStocktakes,
  createStocktake,
  applyStocktake,
  deleteStocktake,
} from "@/lib/db/stocktake-repo";

export const Route = createFileRoute("/_authenticated/stocktake")({
  head: () => ({
    meta: [
      { title: "جرد المستودع — عدّ ومطابقة المخزون | Salon Flow" },
      {
        name: "description",
        content:
          "جرد فعلي لمواد ومنتجات المشغل: عدّ الكميات، حساب الفروق وقيمتها، ثم اعتماد الجرد لتحديث المخزون.",
      },
      { property: "og:title", content: "جرد المستودع — Salon Flow" },
      { property: "og:description", content: "عدّ المخزون ومطابقته مع النظام واعتماد الفروق." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StocktakePage,
});

const today = () => new Date().toISOString().slice(0, 10);

function StocktakePage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const qc = useQueryClient();

  const [countedOn, setCountedOn] = useState(today());
  const [branchId, setBranchId] = useState("");
  const [note, setNote] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});

  const items = useQuery({
    queryKey: ["stocktake-items", salonId],
    queryFn: () => listCountableItems(salonId!),
    enabled: !!salonId,
  });
  const branches = useQuery({
    queryKey: ["branches", salonId],
    queryFn: () => listBranches(salonId!),
    enabled: !!salonId,
  });
  const takes = useQuery({
    queryKey: ["stocktakes", salonId],
    queryFn: () => listStocktakes(salonId!),
    enabled: !!salonId,
  });

  const lines = useMemo(() => {
    return (items.data ?? []).map((it) => {
      const raw = counts[it.id];
      const counted = raw === undefined || raw === "" ? it.stock : Number(raw) || 0;
      const diff = Number((counted - it.stock).toFixed(4));
      return { item: it, counted, diff, value: Number((diff * it.cost_per_unit).toFixed(2)) };
    });
  }, [items.data, counts]);

  const diffLines = lines.filter((l) => l.diff !== 0);
  const diffValue = diffLines.reduce((a, l) => a + l.value, 0);
  const systemValue = lines.reduce((a, l) => a + l.item.stock * l.item.cost_per_unit, 0);

  const save = useMutation({
    mutationFn: () =>
      createStocktake(salonId!, {
        branch_id: branchId || branches.data?.[0]?.id || null,
        counted_on: countedOn,
        note,
        lines: lines.map((l) => ({
          item_id: l.item.id,
          system_qty: l.item.stock,
          counted_qty: l.counted,
          cost_per_unit: l.item.cost_per_unit,
        })),
      }),
    onSuccess: () => {
      toast.success("تم حفظ الجرد كمسودة");
      setCounts({});
      setNote("");
      void qc.invalidateQueries({ queryKey: ["stocktakes", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const apply = useMutation({
    mutationFn: (id: string) => applyStocktake(id),
    onSuccess: () => {
      toast.success("تم اعتماد الجرد وتحديث المخزون");
      void qc.invalidateQueries({ queryKey: ["stocktakes", salonId] });
      void qc.invalidateQueries({ queryKey: ["stocktake-items", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteStocktake(id),
    onSuccess: () => {
      toast.success("تم حذف الجرد");
      void qc.invalidateQueries({ queryKey: ["stocktakes", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="جرد المستودع" subtitle="عدّ الكميات الفعلية وطابقها مع أرصدة النظام">
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-end gap-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">تاريخ الجرد</span>
            <input
              type="date"
              value={countedOn}
              onChange={(e) => setCountedOn(e.target.value)}
              className="input"
            />
          </label>
          {(branches.data?.length ?? 0) > 1 && (
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">الفرع</span>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="input">
                {branches.data!.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block space-y-1 flex-1 min-w-[200px]">
            <span className="text-xs text-muted-foreground">ملاحظة</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
          </label>
          <button
            onClick={() => {
              if (!lines.length) return toast.error("لا توجد مواد في المخزون");
              save.mutate();
            }}
            disabled={save.isPending || !salonId}
            className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-60"
          >
            حفظ الجرد
          </button>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="قيمة المخزون بالنظام" value={formatSAR(systemValue)} />
          <Stat label="عدد الأصناف ذات الفروق" value={`${diffLines.length}`} />
          <Stat
            label="قيمة الفروق"
            value={formatSAR(diffValue)}
            tone={diffValue < 0 ? "bad" : diffValue > 0 ? "good" : undefined}
          />
        </div>

        <section className="rounded-2xl border border-border bg-card overflow-x-auto">
          <h2 className="p-4 font-bold flex items-center gap-2">
            <ClipboardCheck className="size-4 text-primary" /> ورقة العدّ
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-right">المادة</th>
                <th className="p-3 text-right">الوحدة</th>
                <th className="p-3 text-right">رصيد النظام</th>
                <th className="p-3 text-right">المعدود</th>
                <th className="p-3 text-right">الفرق</th>
                <th className="p-3 text-right">قيمة الفرق</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.item.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{l.item.name}</td>
                  <td className="p-3 text-muted-foreground">{l.item.unit}</td>
                  <td className="p-3">{l.item.stock}</td>
                  <td className="p-3">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={counts[l.item.id] ?? ""}
                      placeholder={String(l.item.stock)}
                      onChange={(e) => setCounts({ ...counts, [l.item.id]: e.target.value })}
                      className="input w-28"
                      aria-label={`الكمية المعدودة لـ ${l.item.name}`}
                    />
                  </td>
                  <td
                    className={
                      l.diff === 0 ? "p-3 text-muted-foreground" : l.diff < 0 ? "p-3 text-destructive font-bold" : "p-3 text-success font-bold"
                    }
                  >
                    {l.diff > 0 ? `+${l.diff}` : l.diff}
                  </td>
                  <td className="p-3">{formatSAR(l.value)}</td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    لا توجد مواد في المخزون بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-border bg-card overflow-x-auto">
          <h2 className="p-4 font-bold">سجل عمليات الجرد</h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">فرق الكمية</th>
                <th className="p-3 text-right">قيمة الفرق</th>
                <th className="p-3 text-right">ملاحظة</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {(takes.data ?? []).map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap">{t.counted_on}</td>
                  <td className="p-3">
                    <span
                      className={
                        t.status === "applied"
                          ? "rounded-full border border-success/40 bg-success/15 text-success px-2 py-0.5 text-xs font-bold"
                          : "rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-bold text-muted-foreground"
                      }
                    >
                      {t.status === "applied" ? "معتمد" : "مسودة"}
                    </span>
                  </td>
                  <td className="p-3">{t.diff_qty}</td>
                  <td className="p-3">{formatSAR(t.diff_value)}</td>
                  <td className="p-3 text-muted-foreground">{t.note ?? "—"}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3 justify-end">
                      {t.status !== "applied" && (
                        <button
                          onClick={() => {
                            if (confirm("اعتماد الجرد وتحديث أرصدة المخزون؟")) apply.mutate(t.id);
                          }}
                          className="text-success inline-flex items-center gap-1 text-xs font-bold"
                        >
                          <CheckCircle2 className="size-4" /> اعتماد
                        </button>
                      )}
                      {t.status !== "applied" && (
                        <button
                          onClick={() => {
                            if (confirm("حذف الجرد؟")) remove.mutate(t.id);
                          }}
                          aria-label="حذف"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {(takes.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    لم يتم تنفيذ أي جرد بعد.
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
