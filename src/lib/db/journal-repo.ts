import { supabase } from "@/integrations/supabase/client";

export type JournalSource =
  | "invoice"
  | "expense"
  | "stocktake"
  | "payslip"
  | "purchase"
  | "depreciation"
  | "manual";

export const SOURCE_LABEL: Record<string, string> = {
  invoice: "فاتورة مبيعات",
  expense: "مصروف",
  stocktake: "تسوية جرد",
  payslip: "راتب موظف",
  purchase: "شراء مخزون",
  depreciation: "إهلاك أصل",
  manual: "قيد يدوي",
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
  source_id?: string | null;
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
  payslips: number;
  purchases: number;
}

export interface JournalLineInput {
  account_code: string;
  debit: number;
  credit: number;
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
    payslips: Number(d.payslips ?? 0),
    purchases: Number(d.purchases ?? 0),
  };
}

/** Records a balanced manual journal entry. */
export async function createEntry(
  salonId: string,
  date: string,
  memo: string,
  lines: JournalLineInput[],
): Promise<string> {
  const clean = lines
    .filter((l) => l.account_code.trim() && (l.debit > 0 || l.credit > 0))
    .map((l) => ({
      account_code: l.account_code.trim(),
      debit: Math.max(0, l.debit),
      credit: Math.max(0, l.credit),
    }));
  const { data, error } = await supabase.rpc("create_journal_entry", {
    _salon: salonId,
    _date: date,
    _memo: memo,
    _lines: clean,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Deletes a manual entry. Auto-posted entries are removed by re-posting the period. */
export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_journal_entry", { _entry: id });
  if (error) throw new Error(error.message);
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
    .select("id,entry_date,period,source,source_id,memo,amount,journal_lines(id,account_code,account_name,debit,credit)")
    .eq("salon_id", salonId)
    .eq("period", period)
    .order("entry_date", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);

  return (data ?? []).map((e) => ({
    id: e.id,
    source_id: (e as { source_id?: string | null }).source_id ?? null,
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
