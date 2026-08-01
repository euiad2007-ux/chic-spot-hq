import { supabase } from "@/integrations/supabase/client";
import { getDataContext } from "@/lib/db/context";
import { diffSync, enqueue, debounce, num, str } from "@/lib/db/sync";
import type { PayrollPayment } from "@/lib/payroll-store";

type Row = Record<string, unknown> & { id: string };

let snap: Row[] = [];
let ready = false;

const toRow = (p: PayrollPayment, salon_id: string): Row => ({
  id: p.id,
  salon_id,
  staff_id: p.staffId,
  period: p.periodFrom ?? p.periodTo ?? p.paidAt.slice(0, 7),
  net_amount: p.amount,
  paid_amount: p.amount,
  status: "paid",
  note: p.note ?? null,
  created_at: p.paidAt,
});

export async function loadPayrollPayments(salonId: string): Promise<PayrollPayment[]> {
  const { data } = await supabase
    .from("payslips")
    .select("*")
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false });
  const payments: PayrollPayment[] = (data ?? []).map((r) => ({
    id: r.id,
    staffId: str(r.staff_id),
    amount: num(r.paid_amount) || num(r.net_amount),
    paidAt: str(r.created_at),
    periodFrom: r.period ?? undefined,
    periodTo: r.period ?? undefined,
    note: r.note ?? undefined,
  }));
  snap = payments.map((p) => toRow(p, salonId));
  ready = true;
  return payments;
}

let pendingPayments: PayrollPayment[] | null = null;

const flush = debounce(() => {
  const payments = pendingPayments;
  pendingPayments = null;
  const ctx = getDataContext();
  if (!payments || !ctx?.salonId || !ready) return;
  const salonId = ctx.salonId;
  void enqueue(async () => {
    const next = payments.map((p) => toRow(p, salonId));
    const prev = snap;
    snap = next;
    await diffSync("payslips", next, prev);
  });
}, 300);

export function schedulePayrollSave(payments: PayrollPayment[]) {
  pendingPayments = payments;
  flush();
}
