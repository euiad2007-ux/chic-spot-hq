import { supabase } from "@/integrations/supabase/client";

export interface CreditNoteLineInput {
  kind?: string;
  ref_id?: string | null;
  name: string;
  qty: number;
  unit_price: number;
}

export interface CreditNote {
  id: string;
  number: string;
  invoice_id: string | null;
  invoice_number: string | null;
  reason: string | null;
  subtotal: number;
  vat: number;
  total: number;
  vat_rate: number;
  status: string;
  created_at: string;
  journal_entry_id: string | null;
}

export interface CreditableInvoice {
  id: string;
  number: string;
  total: number;
  subtotal: number;
  vat: number;
  discount: number;
  refunded_amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  customer_id: string | null;
  items: { id: string; name: string; kind: string; qty: number; unit_price: number; total: number; ref_id: string | null }[];
  creditedTotal: number;
}

const num = (v: unknown) => Number(v ?? 0);

/** Credit notes issued in a date range, newest first. */
export async function listCreditNotes(salonId: string, from: string, to: string): Promise<CreditNote[]> {
  const { data, error } = await supabase
    .from("credit_notes")
    .select(
      "id,number,invoice_id,invoice_number,reason,subtotal,vat,total,vat_rate,status,created_at,journal_entry_id",
    )
    .eq("salon_id", salonId)
    .gte("created_at", from)
    .lte("created_at", to + "T23:59:59")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ...r,
    subtotal: num(r.subtotal),
    vat: num(r.vat),
    total: num(r.total),
    vat_rate: num(r.vat_rate),
  }));
}

/** Looks up an invoice by number (or partial number) with its lines, ready to credit. */
export async function findInvoiceToCredit(
  salonId: string,
  query: string,
): Promise<CreditableInvoice | null> {
  const term = query.trim();
  if (!term) return null;

  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id,number,total,subtotal,vat,discount,refunded_amount,status,payment_method,created_at,customer_id",
    )
    .eq("salon_id", salonId)
    .ilike("number", `%${term}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const [items, credited] = await Promise.all([
    supabase
      .from("invoice_items")
      .select("id,name,kind,qty,unit_price,total,ref_id")
      .eq("invoice_id", data.id),
    supabase.from("credit_notes").select("total").eq("invoice_id", data.id).eq("status", "issued"),
  ]);
  if (items.error) throw new Error(items.error.message);

  return {
    ...data,
    total: num(data.total),
    subtotal: num(data.subtotal),
    vat: num(data.vat),
    discount: num(data.discount),
    refunded_amount: num(data.refunded_amount),
    items: (items.data ?? []).map((i) => ({
      ...i,
      qty: num(i.qty),
      unit_price: num(i.unit_price),
      total: num(i.total),
    })),
    creditedTotal:
      Math.round((credited.data ?? []).reduce((a, c) => a + num(c.total), 0) * 100) / 100,
  };
}

/** Issues a credit note against an invoice and posts the reversing journal entry. */
export async function issueCreditNote(
  salonId: string,
  invoiceId: string,
  reason: string,
  lines: CreditNoteLineInput[],
): Promise<string> {
  const payload = lines
    .filter((l) => l.qty > 0 && l.unit_price > 0)
    .map((l) => ({
      kind: l.kind ?? "service",
      ref_id: l.ref_id ?? null,
      name: l.name,
      qty: l.qty,
      unit_price: l.unit_price,
    }));
  if (payload.length === 0) throw new Error("أضف بندًا واحدًا على الأقل بقيمة أكبر من صفر");

  const { data, error } = await supabase.rpc("issue_credit_note", {
    _salon: salonId,
    _invoice: invoiceId,
    _reason: reason,
    _lines: payload,
  });
  if (error) throw new Error(error.message);
  return data as string;
}
