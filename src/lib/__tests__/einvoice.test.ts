import { describe, expect, it } from "vitest";
import { checkCompliance, ublInvoiceXml, zatcaQrPayload } from "../einvoice";

const seller = { name: "لمسة", vatNumber: "300000000000003" };
const inv = {
  number: "INV-1001",
  uuid: "abc",
  issuedAt: "2026-08-03T10:00:00.000Z",
  subtotal: 100,
  discount: 0,
  vat: 15,
  total: 115,
  vatRate: 15,
  customerName: "سارة",
  lines: [{ name: "صبغة", qty: 1, unitPrice: 100, total: 100 }],
};

describe("zatca e-invoice", () => {
  it("encodes the QR as base64 TLV with seller name and totals", () => {
    const b64 = zatcaQrPayload(seller, inv);
    const raw = Buffer.from(b64, "base64");
    expect(raw[0]).toBe(1); // tag 1 = seller name
    const text = raw.toString("utf8");
    expect(text).toContain("لمسة");
    expect(text).toContain("115.00");
    expect(text).toContain("15.00");
  });

  it("builds UBL xml with tax totals and line items", () => {
    const xml = ublInvoiceXml(seller, inv);
    expect(xml).toContain("<cbc:ID>INV-1001</cbc:ID>");
    expect(xml).toContain('<cbc:TaxInclusiveAmount currencyID="SAR">115.00');
    expect(xml).toContain("صبغة");
  });

  it("flags a bad vat number and mismatching total", () => {
    expect(checkCompliance({ name: "x", vatNumber: "123" }, inv)).toHaveLength(1);
    const bad = { ...inv, total: 200 };
    expect(checkCompliance(seller, bad).map((i) => i.field)).toContain("الإجمالي");
  });
});
