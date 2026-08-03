/**
 * ZATCA (Saudi e-invoicing) helpers.
 *
 * Phase 1 requires a Base64 TLV QR code on every simplified tax invoice and a
 * fixed set of seller/tax fields. Phase 2 additionally requires a UBL 2.1 XML
 * document per invoice — generated here so it can be archived or uploaded to
 * the ZATCA integration portal.
 */

export interface EInvoiceSeller {
  name: string;
  vatNumber: string;
  address?: string | null;
}

export interface EInvoiceLine {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface EInvoiceData {
  number: string;
  uuid: string;
  issuedAt: string;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  vatRate: number;
  customerName?: string | null;
  lines: EInvoiceLine[];
}

const enc = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  if (typeof btoa === "function") return btoa(bin);
  return Buffer.from(bytes).toString("base64");
}

/** One TLV field: 1-byte tag, 1-byte length, UTF-8 value. */
function tlv(tag: number, value: string): Uint8Array {
  const v = enc.encode(value);
  const out = new Uint8Array(v.length + 2);
  out[0] = tag;
  out[1] = v.length;
  out.set(v, 2);
  return out;
}

/**
 * Builds the Base64 TLV payload ZATCA expects inside the invoice QR code:
 * 1 seller name, 2 VAT number, 3 timestamp, 4 invoice total, 5 VAT amount.
 */
export function zatcaQrPayload(seller: EInvoiceSeller, inv: EInvoiceData): string {
  const parts = [
    tlv(1, seller.name || "—"),
    tlv(2, seller.vatNumber || "—"),
    tlv(3, new Date(inv.issuedAt).toISOString()),
    tlv(4, inv.total.toFixed(2)),
    tlv(5, inv.vat.toFixed(2)),
  ];
  const size = parts.reduce((a, p) => a + p.length, 0);
  const buf = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    buf.set(p, at);
    at += p.length;
  }
  return toBase64(buf);
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const n2 = (v: number) => v.toFixed(2);

/** Generates a simplified-tax-invoice UBL 2.1 XML document (ZATCA phase 2 shape). */
export function ublInvoiceXml(seller: EInvoiceSeller, inv: EInvoiceData): string {
  const taxable = inv.subtotal - inv.discount;
  const lines = inv.lines
    .map((l, i) => {
      const lineVat = taxable > 0 ? (inv.vat * l.total) / taxable : 0;
      return `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">${l.qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="SAR">${n2(l.total)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="SAR">${n2(lineVat)}</cbc:TaxAmount>
      <cbc:RoundingAmount currencyID="SAR">${n2(l.total + lineVat)}</cbc:RoundingAmount>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${esc(l.name)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${n2(inv.vatRate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="SAR">${n2(l.unitPrice)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`;
    })
    .join("\n");

  const issued = new Date(inv.issuedAt);
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${esc(inv.number)}</cbc:ID>
  <cbc:UUID>${esc(inv.uuid)}</cbc:UUID>
  <cbc:IssueDate>${issued.toISOString().slice(0, 10)}</cbc:IssueDate>
  <cbc:IssueTime>${issued.toISOString().slice(11, 19)}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference>
    <cbc:ID>QR</cbc:ID>
    <cac:Attachment>
      <cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${zatcaQrPayload(seller, inv)}</cbc:EmbeddedDocumentBinaryObject>
    </cac:Attachment>
  </cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification><cbc:ID schemeID="CRN">${esc(seller.vatNumber)}</cbc:ID></cac:PartyIdentification>
      <cac:PostalAddress><cbc:StreetName>${esc(seller.address ?? "—")}</cbc:StreetName>
        <cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${esc(seller.vatNumber)}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity><cbc:RegistrationName>${esc(seller.name)}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyLegalEntity><cbc:RegistrationName>${esc(inv.customerName ?? "عميل نقدي")}</cbc:RegistrationName></cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="SAR">${n2(inv.vat)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="SAR">${n2(taxable)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="SAR">${n2(inv.vat)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${n2(inv.vatRate)}</cbc:Percent>
        <cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${n2(inv.subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${n2(taxable)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${n2(inv.total)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="SAR">${n2(inv.discount)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="SAR">${n2(inv.total)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines}
</Invoice>`;
}

export interface ComplianceIssue {
  field: string;
  message: string;
}

/** Checks the seller/invoice fields ZATCA rejects invoices for when missing. */
export function checkCompliance(seller: EInvoiceSeller, inv: EInvoiceData): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  if (!seller.name) issues.push({ field: "اسم البائع", message: "أضف اسم المنشأة في إعدادات المشغل" });
  if (!/^3\d{13}3$/.test(seller.vatNumber || ""))
    issues.push({
      field: "الرقم الضريبي",
      message: "الرقم الضريبي يجب أن يكون 15 رقمًا يبدأ وينتهي بالرقم 3",
    });
  if (inv.vat <= 0 && inv.total > 0)
    issues.push({ field: "الضريبة", message: "لا توجد ضريبة محتسبة على الفاتورة" });
  const expected = Math.round((inv.subtotal - inv.discount + inv.vat) * 100) / 100;
  if (Math.abs(expected - inv.total) > 0.02)
    issues.push({ field: "الإجمالي", message: "الإجمالي لا يساوي الوعاء الضريبي + الضريبة" });
  return issues;
}
