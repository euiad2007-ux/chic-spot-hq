import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Banknote, LockOpen, Lock, Scale } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import {
  listBranches,
  listShifts,
  findOpenShift,
  openShift as openShiftRpc,
  closeShift as closeShiftRpc,
  shiftTotals,
} from "@/lib/db/ops-repo";

export const Route = createFileRoute("/_authenticated/cash")({
  head: () => ({
    meta: [
      { title: "الصندوق والورديات — عهدة ونقد متوقع | Salon Flow" },
      {
        name: "description",
        content:
          "فتح وإغلاق وردية الصندوق مع العهدة الافتتاحية، النقد المتوقع، النقد المعدود، والفرق لكل فرع.",
      },
      { property: "og:title", content: "الصندوق والورديات — Salon Flow" },
      { property: "og:description", content: "إدارة عهدة الصندوق والنقد المتوقع والفروقات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CashPage,
});

function CashPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const qc = useQueryClient();

  const [branchId, setBranchId] = useState<string | null>(null);
  const [float, setFloat] = useState(0);
  const [counted, setCounted] = useState(0);
  const [note, setNote] = useState("");

  const branches = useQuery({
    queryKey: ["branches", salonId],
    queryFn: () => listBranches(salonId!),
    enabled: !!salonId,
  });
  const shifts = useQuery({
    queryKey: ["shifts", salonId],
    queryFn: () => listShifts(salonId!),
    enabled: !!salonId,
  });

  const activeBranch = branchId ?? branches.data?.[0]?.id ?? null;
  const current = useMemo(
    () => (shifts.data ? findOpenShift(shifts.data, activeBranch) : null),
    [shifts.data, activeBranch],
  );

  const totals = useQuery({
    queryKey: ["shift-totals", current?.id],
    queryFn: () => shiftTotals(current!.id),
    enabled: !!current,
  });

  const expected =
    (current ? Number(current.opening_float) : 0) +
    (totals.data?.cash ?? 0) -
    (totals.data?.cashExpenses ?? 0);

  const open = useMutation({
    mutationFn: () => openShiftRpc(salonId!, activeBranch, float),
    onSuccess: () => {
      toast.success("تم فتح الوردية");
      setFloat(0);
      void qc.invalidateQueries({ queryKey: ["shifts", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const close = useMutation({
    mutationFn: () => closeShiftRpc(current!.id, counted, note || undefined),
    onSuccess: (res) => {
      toast.success(
        Number(res.difference) === 0
          ? "تم إغلاق الوردية والنقد مطابق"
          : `تم الإغلاق — الفرق ${formatSAR(Number(res.difference))}`,
      );
      setCounted(0);
      setNote("");
      void qc.invalidateQueries({ queryKey: ["shifts", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="الصندوق والورديات"
      subtitle="العهدة الافتتاحية، النقد المتوقع، والفرق عند الإغلاق"
      action={
        branches.data && branches.data.length > 1 ? (
          <select
            value={activeBranch ?? ""}
            onChange={(e) => setBranchId(e.target.value || null)}
            aria-label="الفرع"
            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
          >
            {branches.data.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        ) : undefined
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        {current ? (
          <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-bold flex items-center gap-2">
              <Scale className="size-4 text-primary" /> الوردية المفتوحة
            </h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="العهدة الافتتاحية" value={formatSAR(Number(current.opening_float))} />
              <Stat label="مبيعات نقدية" value={formatSAR(totals.data?.cash ?? 0)} />
              <Stat label="مبيعات شبكة/تحويل" value={formatSAR(totals.data?.card ?? 0)} />
              <Stat label="مصروفات نقدية" value={formatSAR(totals.data?.cashExpenses ?? 0)} />
              <div className="col-span-2 rounded-xl bg-primary/10 border border-primary/30 p-3 flex items-center justify-between">
                <span className="font-semibold">النقد المتوقع في الصندوق</span>
                <span className="font-bold text-primary">{formatSAR(expected)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-muted-foreground">النقد المعدود فعليًا</label>
              <input
                type="number"
                min={0}
                value={counted}
                onChange={(e) => setCounted(Number(e.target.value) || 0)}
                className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm"
              />
              <div className="text-sm">
                الفرق:{" "}
                <strong className={counted - expected === 0 ? "text-primary" : "text-destructive"}>
                  {formatSAR(counted - expected)}
                </strong>
              </div>
              <label className="block text-xs text-muted-foreground">ملاحظة الإغلاق</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-muted/40 p-3 text-sm"
              />
              <button
                onClick={() => close.mutate()}
                disabled={close.isPending}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Lock className="size-4" /> إغلاق الوردية
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-bold flex items-center gap-2">
              <LockOpen className="size-4 text-primary" /> فتح وردية جديدة
            </h2>
            <p className="text-sm text-muted-foreground">
              البيع النقدي في نقطة البيع يتطلب وردية مفتوحة لهذا الفرع.
            </p>
            <label className="block text-xs text-muted-foreground">العهدة الافتتاحية (ريال)</label>
            <input
              type="number"
              min={0}
              value={float}
              onChange={(e) => setFloat(Number(e.target.value) || 0)}
              className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm"
            />
            <button
              onClick={() => open.mutate()}
              disabled={open.isPending || !salonId}
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-60"
            >
              فتح الوردية
            </button>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold flex items-center gap-2 mb-3">
            <Banknote className="size-4 text-primary" /> سجل الورديات
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="p-2 text-right">الفتح</th>
                  <th className="p-2 text-right">العهدة</th>
                  <th className="p-2 text-right">نقدي</th>
                  <th className="p-2 text-right">متوقع</th>
                  <th className="p-2 text-right">معدود</th>
                  <th className="p-2 text-right">الفرق</th>
                  <th className="p-2 text-right">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {(shifts.data ?? []).map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-2 whitespace-nowrap">
                      {new Date(s.opened_at).toLocaleString("ar-SA")}
                    </td>
                    <td className="p-2">{formatSAR(Number(s.opening_float))}</td>
                    <td className="p-2">{formatSAR(Number(s.cash_sales))}</td>
                    <td className="p-2">
                      {s.expected_cash === null ? "—" : formatSAR(Number(s.expected_cash))}
                    </td>
                    <td className="p-2">
                      {s.counted_cash === null ? "—" : formatSAR(Number(s.counted_cash))}
                    </td>
                    <td
                      className={
                        "p-2 font-semibold " +
                        (s.difference !== null && Number(s.difference) !== 0
                          ? "text-destructive"
                          : "")
                      }
                    >
                      {s.difference === null ? "—" : formatSAR(Number(s.difference))}
                    </td>
                    <td className="p-2">{s.status === "open" ? "مفتوحة" : "مغلقة"}</td>
                  </tr>
                ))}
                {(shifts.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-muted-foreground">
                      لا توجد ورديات بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-bold mt-1">{value}</div>
    </div>
  );
}
