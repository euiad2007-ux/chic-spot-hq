import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hydrateAll } from "@/lib/db/hydrate";
import { formatSAR, useSalon } from "@/lib/salon-store";
import { Check, X, CreditCard } from "lucide-react";
import { toast } from "sonner";

type Row = {
  id: string;
  customer_id: string;
  amount: number;
  method: string;
  note: string | null;
  status: string;
  created_at: string;
};

/**
 * Wallet top-up requests filed by customers. Balance is credited only when a
 * salon manager approves, so a customer can never credit their own wallet.
 */
export function TopupRequestsPanel() {
  const customers = useSalon((s) => s.customers);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("wallet_topup_requests")
      .select("id, customer_id, amount, method, note, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    setRows((data as Row[] | null) ?? []);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const approve = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc("approve_wallet_topup", { _request: id });
    if (error) { setBusy(null); return toast.error(error.message || "تعذر اعتماد الطلب"); }
    await hydrateAll(true);
    await load();
    setBusy(null);
    toast.success("تم اعتماد الشحن");
  };

  const reject = async (id: string) => {
    setBusy(id);
    const { error } = await supabase
      .from("wallet_topup_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setBusy(null);
    if (error) return toast.error("تعذر رفض الطلب");
    await load();
    toast.success("تم رفض الطلب");
  };

  if (rows.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="font-bold flex items-center gap-2">
        <CreditCard className="size-4 text-primary" /> طلبات شحن المحفظة
        <span className="text-xs font-normal text-muted-foreground">({rows.length} بانتظار الاعتماد)</span>
      </h3>
      <div className="mt-3 divide-y divide-border">
        {rows.map((r) => {
          const c = customers.find((x) => x.id === r.customer_id);
          return (
            <div key={r.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{c?.name ?? "عميلة"}</div>
                <div className="text-xs text-muted-foreground truncate">{r.note ?? r.method}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold">{formatSAR(r.amount)}</span>
                <button
                  disabled={busy === r.id}
                  onClick={() => void approve(r.id)}
                  className="size-9 rounded-lg bg-primary/15 text-primary grid place-items-center hover:bg-primary/25 disabled:opacity-50"
                  aria-label="اعتماد"
                >
                  <Check className="size-4" />
                </button>
                <button
                  disabled={busy === r.id}
                  onClick={() => void reject(r.id)}
                  className="size-9 rounded-lg border border-border grid place-items-center hover:bg-muted disabled:opacity-50"
                  aria-label="رفض"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
