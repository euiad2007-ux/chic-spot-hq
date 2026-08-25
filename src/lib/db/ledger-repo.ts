import { supabase } from "@/integrations/supabase/client";

/**
 * Digital money ledger: every cash movement of the salon in one stream —
 * invoice payments, refunds and expenses — with period, type and method
 * filters plus period totals for the ledger page.
 */

export type LedgerKindFilter = "all" | "income" | "refund" | "expense";

export interface MoneyRow {
  id: string;
  at: string;
  kind: "income" | "refund" | "expense";
  label: string;
  reference: string | null;
  method: string | null;
  amount: number; // signed: income +, refund/expense -
}

export interface MoneyLedger {
  rows: MoneyRow[];
  income: number;
  refunds: number;
  expenses: number;
  net: number;
  cashIn: number;
  cardIn: number;
}

const num = (v: unknown) => Number(v ?? 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

export const methodLabel = (m: string | null) =>
  m === "cash"
    ? "نقدًا"
    : m === "card"
      ? "شبكة"
      : m === "transfer"
        ? "تحويل"
        : m === "wallet"
          ? "محفظة"
          : (m ?? "—");

/** Loads the salon money stream for an inclusive date range (local days). */
export async function loadMoneyLedger(
  salonId: string,
  from: string,
  to: string,
): Promise<MoneyLedger> {
  const startIso = new Date(`${from}T00:00:00`).toISOString();
  const endIso = new Date(`${to}T23:59:59.999`).toISOString();

  const [payments, expenses] = await Promise.all([
    supabase
      .from("invoice_payments")
      .select("id, amount, method, is_refund, created_at, invoice_id, invoices(number, customers(name))")
      .eq("salon_id", salonId)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("id, amount, method, category, vendor, note, spent_on, created_at")
      .eq("salon_id", salonId)
      .gte("spent_on", from)
      .lte("spent_on", to)
      .order("spent_on", { ascending: false }),
  ]);

  if (payments.error) throw payments.error;
  if (expenses.error) throw expenses.error;

  const rows: MoneyRow[] = [];

  for (const p of payments.data ?? []) {
    const inv = (p as { invoices?: { number?: string; customers?: { name?: string } | null } | null })
      .invoices;
    const customer = inv?.customers?.name ?? null;
    const refund = Boolean(p.is_refund);
    rows.push({
      id: p.id,
      at: p.created_at,
      kind: refund ? "refund" : "income",
      label: refund
        ? `استرجاع فاتورة ${inv?.number ?? ""}`.trim()
        : `تحصيل فاتورة ${inv?.number ?? ""}`.trim() + (customer ? ` — ${customer}` : ""),
      reference: inv?.number ?? null,
      method: p.method,
      amount: refund ? -r2(num(p.amount)) : r2(num(p.amount)),
    });
  }

  for (const e of expenses.data ?? []) {
    rows.push({
      id: e.id,
      at: e.created_at ?? `${e.spent_on}T00:00:00.000Z`,
      kind: "expense",
      label: `مصروف: ${e.category}` + (e.vendor ? ` — ${e.vendor}` : ""),
      reference: e.note ?? null,
      method: e.method,
      amount: -r2(num(e.amount)),
    });
  }

  rows.sort((a, b) => (a.at < b.at ? 1 : -1));

  const income = r2(rows.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0));
  const refunds = r2(rows.filter((r) => r.kind === "refund").reduce((s, r) => s - r.amount, 0));
  const expensesTotal = r2(rows.filter((r) => r.kind === "expense").reduce((s, r) => s - r.amount, 0));
  const cashIn = r2(
    rows.filter((r) => r.kind === "income" && r.method === "cash").reduce((s, r) => s + r.amount, 0),
  );
  const cardIn = r2(
    rows
      .filter((r) => r.kind === "income" && r.method !== "cash")
      .reduce((s, r) => s + r.amount, 0),
  );

  return {
    rows,
    income,
    refunds,
    expenses: expensesTotal,
    net: r2(income - refunds - expensesTotal),
    cashIn,
    cardIn,
  };
}
