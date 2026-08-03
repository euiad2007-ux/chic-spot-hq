import { supabase } from "@/integrations/supabase/client";

export interface TaxSettings {
  tax_number: string;
  vat_rate: number;
  expenses_include_vat: boolean;
}

export interface TaxLedgerRow {
  date: string;
  number: string;
  method: string;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
}

export interface TaxReport {
  settings: TaxSettings;
  sales: { taxable: number; outputVat: number; gross: number; count: number };
  purchases: { net: number; inputVat: number; gross: number; count: number };
  netVatDue: number;
  profit: number;
  byMethod: { method: string; total: number; vat: number }[];
  ledger: TaxLedgerRow[];
}

export async function loadTaxSettings(salonId: string): Promise<TaxSettings> {
  const { data, error } = await supabase
    .from("salons")
    .select("tax_number,vat_rate,expenses_include_vat")
    .eq("id", salonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    tax_number: data?.tax_number ?? "",
    vat_rate: Number(data?.vat_rate ?? 15),
    expenses_include_vat: data?.expenses_include_vat ?? true,
  };
}

export async function saveTaxSettings(salonId: string, patch: Partial<TaxSettings>) {
  const { error } = await supabase
    .from("salons")
    .update({
      ...(patch.tax_number !== undefined ? { tax_number: patch.tax_number || null } : {}),
      ...(patch.vat_rate !== undefined ? { vat_rate: patch.vat_rate } : {}),
      ...(patch.expenses_include_vat !== undefined
        ? { expenses_include_vat: patch.expenses_include_vat }
        : {}),
    })
    .eq("id", salonId);
  if (error) throw new Error(error.message);
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** VAT return figures for a period: output VAT from invoices, input VAT from expenses. */
export async function loadTaxReport(salonId: string, from: string, to: string): Promise<TaxReport> {
  const settings = await loadTaxSettings(salonId);
  const fromIso = `${from}T00:00:00`;
  const toIso = `${to}T23:59:59`;

  const [invRes, expRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("number,subtotal,discount,vat,total,payment_method,created_at")
      .eq("salon_id", salonId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("expenses")
      .select("amount,vat_amount,spent_on,category")
      .eq("salon_id", salonId)
      .gte("spent_on", from)
      .lte("spent_on", to),
  ]);
  if (invRes.error) throw new Error(invRes.error.message);
  if (expRes.error) throw new Error(expRes.error.message);

  const invoices = invRes.data ?? [];
  const expenses = expRes.data ?? [];
  const rate = settings.vat_rate / 100;

  const ledger: TaxLedgerRow[] = invoices.map((i) => ({
    date: String(i.created_at).slice(0, 10),
    number: i.number ?? "—",
    method: i.payment_method ?? "—",
    subtotal: Number(i.subtotal),
    discount: Number(i.discount),
    vat: Number(i.vat),
    total: Number(i.total),
  }));

  const taxable = ledger.reduce((a, i) => a + i.subtotal - i.discount, 0);
  const outputVat = ledger.reduce((a, i) => a + i.vat, 0);
  const gross = ledger.reduce((a, i) => a + i.total, 0);

  let inputVat = 0;
  let purchasesGross = 0;
  for (const e of expenses) {
    const amount = Number(e.amount);
    const explicit = Number(e.vat_amount ?? 0);
    const vat = explicit > 0
      ? explicit
      : settings.expenses_include_vat && rate > 0
        ? amount - amount / (1 + rate)
        : 0;
    inputVat += vat;
    purchasesGross += amount;
  }

  const methodMap = new Map<string, { total: number; vat: number }>();
  for (const i of ledger) {
    const cur = methodMap.get(i.method) ?? { total: 0, vat: 0 };
    methodMap.set(i.method, { total: cur.total + i.total, vat: cur.vat + i.vat });
  }

  return {
    settings,
    sales: { taxable: r2(taxable), outputVat: r2(outputVat), gross: r2(gross), count: ledger.length },
    purchases: {
      net: r2(purchasesGross - inputVat),
      inputVat: r2(inputVat),
      gross: r2(purchasesGross),
      count: expenses.length,
    },
    netVatDue: r2(outputVat - inputVat),
    profit: r2(taxable - (purchasesGross - inputVat)),
    byMethod: [...methodMap.entries()]
      .map(([method, v]) => ({ method, total: r2(v.total), vat: r2(v.vat) }))
      .sort((a, b) => b.total - a.total),
    ledger,
  };
}

/* --------------------------- monthly VAT summary -------------------------- */

export interface MonthlyTaxRow {
  period: string;       // "YYYY-MM"
  label: string;        // Arabic month label
  invoices: number;
  taxable: number;
  outputVat: number;
  gross: number;
  expenses: number;
  inputVat: number;
  netVatDue: number;
  profit: number;
}

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export const periodLabel = (period: string) => {
  const [y, m] = period.split("-");
  const idx = Number(m) - 1;
  return `${AR_MONTHS[idx] ?? m} ${y}`;
};

/** Twelve monthly VAT returns for one calendar year, ready for filing. */
export async function loadMonthlyTaxSeries(salonId: string, year: number): Promise<MonthlyTaxRow[]> {
  const settings = await loadTaxSettings(salonId);
  const rate = settings.vat_rate / 100;
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;

  const [invRes, expRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("subtotal,discount,vat,total,created_at")
      .eq("salon_id", salonId)
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`),
    supabase
      .from("expenses")
      .select("amount,vat_amount,spent_on")
      .eq("salon_id", salonId)
      .gte("spent_on", from)
      .lte("spent_on", to),
  ]);
  if (invRes.error) throw new Error(invRes.error.message);
  if (expRes.error) throw new Error(expRes.error.message);

  const rows: MonthlyTaxRow[] = Array.from({ length: 12 }, (_, i) => {
    const period = `${year}-${String(i + 1).padStart(2, "0")}`;
    return {
      period,
      label: periodLabel(period),
      invoices: 0,
      taxable: 0,
      outputVat: 0,
      gross: 0,
      expenses: 0,
      inputVat: 0,
      netVatDue: 0,
      profit: 0,
    };
  });

  for (const i of invRes.data ?? []) {
    const idx = Number(String(i.created_at).slice(5, 7)) - 1;
    const row = rows[idx];
    if (!row) continue;
    row.invoices += 1;
    row.taxable += Number(i.subtotal) - Number(i.discount);
    row.outputVat += Number(i.vat);
    row.gross += Number(i.total);
  }

  for (const e of expRes.data ?? []) {
    const idx = Number(String(e.spent_on).slice(5, 7)) - 1;
    const row = rows[idx];
    if (!row) continue;
    const amount = Number(e.amount);
    const explicit = Number(e.vat_amount ?? 0);
    const vat = explicit > 0
      ? explicit
      : settings.expenses_include_vat && rate > 0
        ? amount - amount / (1 + rate)
        : 0;
    row.expenses += amount;
    row.inputVat += vat;
  }

  return rows.map((r) => ({
    ...r,
    taxable: r2(r.taxable),
    outputVat: r2(r.outputVat),
    gross: r2(r.gross),
    expenses: r2(r.expenses),
    inputVat: r2(r.inputVat),
    netVatDue: r2(r.outputVat - r.inputVat),
    profit: r2(r.taxable - (r.expenses - r.inputVat)),
  }));
}
