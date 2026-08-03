import { supabase } from "@/integrations/supabase/client";

export type JournalSource = "invoice" | "expense" | "stocktake";

export const SOURCE_LABEL: Record<string, string> = {
  invoice: "فاتورة مبيعات",
  expense: "مصروف",
  stocktake: "تسوية جرد",
};

export interface JournalLine {
  id: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  entry_date: string;
  period: string;
  source: string;
  memo: string | null;
  amount: number;
  lines: JournalLine[];
}

export interface TrialBalanceRow {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface PostResult {
  period: string;
  invoices: number;
  expenses: number;
  stocktakes: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Generates journal entries for the period. Already-posted documents are skipped. */
export async function postPeriod(salonId: string, from: string, to: string): Promise<PostResult> {
  const { data, error } = await supabase.rpc("post_accounting_period", {
    _salon: salonId,
    _from: from,
    _to: to,
  });
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as Partial<PostResult>;
  return {
    period: d.period ?? from.slice(0, 7),
    invoices: Number(d.invoices ?? 0),
    expenses: Number(d.expenses ?? 0),
    stocktakes: Number(d.stocktakes ?? 0),
  };
}

/** Removes every entry posted for a month, so the period can be re-posted. */
export async function unpostPeriod(salonId: string, period: string): Promise<number> {
  const { data, error } = await supabase.rpc("unpost_accounting_period", {
    _salon: salonId,
    _period: period,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function listJournal(salonId: string, period: string): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("id,entry_date,period,source,memo,amount,journal_lines(id,account_code,account_name,debit,credit)")
    .eq("salon_id", salonId)
    .eq("period", period)
    .order("entry_date", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);

  return (data ?? []).map((e) => ({
    id: e.id,
    entry_date: e.entry_date,
    period: e.period,
    source: e.source,
    memo: e.memo,
    amount: Number(e.amount),
    lines: ((e.journal_lines ?? []) as JournalLine[])
      .map((l) => ({
        id: l.id,
        account_code: l.account_code,
        account_name: l.account_name,
        debit: Number(l.debit),
        credit: Number(l.credit),
      }))
      .sort((a, b) => b.debit - a.debit || a.account_code.localeCompare(b.account_code)),
  }));
}

/** Aggregates the posted lines of a month into a trial balance. */
export function trialBalance(entries: JournalEntry[]): {
  rows: TrialBalanceRow[];
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
} {
  const map = new Map<string, TrialBalanceRow>();
  for (const e of entries) {
    for (const l of e.lines) {
      const cur =
        map.get(l.account_code) ??
        { account_code: l.account_code, account_name: l.account_name, debit: 0, credit: 0, balance: 0 };
      cur.debit += l.debit;
      cur.credit += l.credit;
      map.set(l.account_code, cur);
    }
  }
  const rows = [...map.values()]
    .map((r) => ({ ...r, debit: r2(r.debit), credit: r2(r.credit), balance: r2(r.debit - r.credit) }))
    .sort((a, b) => a.account_code.localeCompare(b.account_code));
  const totalDebit = r2(rows.reduce((a, r) => a + r.debit, 0));
  const totalCredit = r2(rows.reduce((a, r) => a + r.credit, 0));
  return { rows, totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) < 0.01 };
}
