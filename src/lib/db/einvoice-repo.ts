import { supabase } from "@/integrations/supabase/client";

import type { EInvoiceData, EInvoiceSeller } from "@/lib/einvoice";

export interface EInvoiceRow extends EInvoiceData {
  id: string;
  status: string;
  paymentMethod: string | null;
}

/** Seller identity used on the e-invoice (from the salon record). */
export async function loadSeller(salonId: string): Promise<EInvoiceSeller & { vatRate: number }> {
  const { data, error } = await supabase
    .from("salons")
    .select("name,vat_number,tax_number,vat_rate")
    .eq("id", salonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    name: data?.name ?? "",
    vatNumber: (data?.tax_number || data?.vat_number || "") as string,
    vatRate: Number(data?.vat_rate ?? 15),
  };
}

/** Invoices of a period with their lines, shaped for e-invoice generation. */
export async function loadEInvoices(
  salonId: string,
  from: string,
  to: string,
  vatRate: number,
): Promise<EInvoiceRow[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id,number,subtotal,discount,vat,total,status,payment_method,created_at,customers(name),invoice_items(name,qty,unit_price,total)",
    )
    .eq("salon_id", salonId)
    .gte("created_at", `${from}T00:00:00`)
    .lte("created_at", `${to}T23:59:59`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => {
    const items = (r.invoice_items ?? []) as { name: string; qty: number; unit_price: number; total: number }[];
    const customer = r.customers as { name: string } | null;
    return {
      id: r.id,
      uuid: r.id,
      number: r.number,
      issuedAt: r.created_at,
      subtotal: Number(r.subtotal),
      discount: Number(r.discount),
      vat: Number(r.vat),
      total: Number(r.total),
      vatRate,
      status: r.status,
      paymentMethod: r.payment_method,
      customerName: customer?.name ?? null,
      lines: items.length
        ? items.map((i) => ({
            name: i.name,
            qty: Number(i.qty),
            unitPrice: Number(i.unit_price),
            total: Number(i.total),
          }))
        : [
            {
              name: "خدمات الصالون",
              qty: 1,
              unitPrice: Number(r.subtotal),
              total: Number(r.subtotal),
            },
          ],
    };
  });
}
