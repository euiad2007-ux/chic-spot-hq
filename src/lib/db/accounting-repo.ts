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
