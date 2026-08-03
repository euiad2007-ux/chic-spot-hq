import { supabase } from "@/integrations/supabase/client";

export type AccountKind = "asset" | "liability" | "equity" | "revenue" | "expense";

export const KIND_LABEL: Record<AccountKind, string> = {
  asset: "أصول",
  liability: "التزامات",
  equity: "حقوق ملكية",
  revenue: "إيرادات",
  expense: "مصروفات",
};

/** Normal (debit-positive) side of each account family. */
export const KIND_SIDE: Record<AccountKind, "debit" | "credit"> = {
  asset: "debit",
  liability: "credit",
  equity: "credit",
  revenue: "credit",
  expense: "debit",
};

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  kind: AccountKind;
  parent_code: string | null;
  is_system: boolean;
  is_active: boolean;
  note: string | null;
}

export interface LedgerRow {
  entry_id: string;
  entry_date: string;
  source: string;
  memo: string | null;
  debit: number;
  credit: number;
  balance: number;
}

export interface StatementLine {
  code: string;
  name: string;
  kind: AccountKind;
  amount: number;
}

export interface Financials {
  revenue: StatementLine[];
  expenses: StatementLine[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  assets: StatementLine[];
  liabilities: StatementLine[];
  equity: StatementLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  balanced: boolean;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export async function listAccounts(salonId: string): Promise<ChartAccount[]> {
  const { data, error } = await supabase
    .from("chart_accounts")
    .select("id,code,name,kind,parent_code,is_system,is_active,note")
    .eq("salon_id", salonId)
    .order("code");
  if (error) throw new Error(error.message);
  return (data ?? []) as ChartAccount[];
}

export async function seedAccounts(salonId: string): Promise<number> {
  const { data, error } = await supabase.rpc("seed_chart_accounts", { _salon: salonId });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

export async function saveAccount(
  salonId: string,
  input: {
    id?: string;
    code: string;
    name: string;
    kind: AccountKind;
    parent_code?: string | null;
    note?: string | null;
    is_active?: boolean;
  },
): Promise<void> {
  const row = {
    salon_id: salonId,
    code: input.code.trim(),
    name: input.name.trim(),
    kind: input.kind,
    parent_code: input.parent_code?.trim() || null,
    note: input.note?.trim() || null,
    is_active: input.is_active ?? true,
  };
  const q = input.id
    ? supabase.from("chart_accounts").update(row).eq("id", input.id)
    : supabase.from("chart_accounts").insert(row);
  const { error } = await q;
  if (error) throw new Error(error.message);
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from("chart_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** General ledger for one account across a date range, with a running balance. */
export async function loadLedger(
  salonId: string,
  accountCode: string,
  from: string,
  to: string,
  side: "debit" | "credit" = "debit",
): Promise<{ rows: LedgerRow[]; totalDebit: number; totalCredit: number; closing: number }> {
  const { data, error } = await supabase
    .from("journal_lines")
    .select("debit,credit,entry_id,journal_entries!inner(id,entry_date,source,memo,salon_id)")
    .eq("salon_id", salonId)
    .eq("account_code", accountCode)
    .gte("journal_entries.entry_date", from)
    .lte("journal_entries.entry_date", to)
    .limit(2000);
  if (error) throw new Error(error.message);

  type Raw = {
    debit: number | string;
    credit: number | string;
    entry_id: string;
    journal_entries: { entry_date: string; source: string; memo: string | null } | null;
  };

  const flat = ((data ?? []) as unknown as Raw[])
    .map((l) => ({
      entry_id: l.entry_id,
      entry_date: l.journal_entries?.entry_date ?? "",
      source: l.journal_entries?.source ?? "manual",
      memo: l.journal_entries?.memo ?? null,
      debit: Number(l.debit),
      credit: Number(l.credit),
    }))
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  let running = 0;
  const rows: LedgerRow[] = flat.map((l) => {
    running += side === "debit" ? l.debit - l.credit : l.credit - l.debit;
    return { ...l, balance: r2(running) };
  });

  return {
    rows,
    totalDebit: r2(flat.reduce((a, l) => a + l.debit, 0)),
    totalCredit: r2(flat.reduce((a, l) => a + l.credit, 0)),
    closing: r2(running),
  };
}

/** Income statement + balance sheet built from posted lines up to `to`. */
export async function loadFinancials(
  salonId: string,
  from: string,
  to: string,
): Promise<Financials> {
  const [accounts, lines] = await Promise.all([
    listAccounts(salonId),
    supabase
      .from("journal_lines")
      .select("account_code,debit,credit,journal_entries!inner(entry_date,salon_id)")
      .eq("salon_id", salonId)
      .gte("journal_entries.entry_date", from)
      .lte("journal_entries.entry_date", to)
      .limit(5000),
  ]);
  if (lines.error) throw new Error(lines.error.message);

  const meta = new Map(accounts.map((a) => [a.code, a]));
  const totals = new Map<string, number>();

  type Raw = { account_code: string; debit: number | string; credit: number | string };
  for (const l of (lines.data ?? []) as unknown as Raw[]) {
    const acc = meta.get(l.account_code);
    const kind: AccountKind = acc?.kind ?? "expense";
    const signed =
      KIND_SIDE[kind] === "debit"
        ? Number(l.debit) - Number(l.credit)
        : Number(l.credit) - Number(l.debit);
    totals.set(l.account_code, (totals.get(l.account_code) ?? 0) + signed);
  }

  const group = (kind: AccountKind): StatementLine[] =>
    [...totals.entries()]
      .filter(([code]) => (meta.get(code)?.kind ?? "expense") === kind)
      .map(([code, amount]) => ({
        code,
        name: meta.get(code)?.name ?? code,
        kind,
        amount: r2(amount),
      }))
      .filter((l) => Math.abs(l.amount) > 0.009)
      .sort((a, b) => a.code.localeCompare(b.code));

  const sum = (rows: StatementLine[]) => r2(rows.reduce((a, r) => a + r.amount, 0));

  const revenue = group("revenue");
  const expenses = group("expense");
  const assets = group("asset");
  const liabilities = group("liability");
  const equity = group("equity");

  const totalRevenue = sum(revenue);
  const totalExpenses = sum(expenses);
  const netProfit = r2(totalRevenue - totalExpenses);
  const totalAssets = sum(assets);
  const totalLiabilities = sum(liabilities);
  const totalEquity = r2(sum(equity) + netProfit);

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netProfit,
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.05,
  };
}
