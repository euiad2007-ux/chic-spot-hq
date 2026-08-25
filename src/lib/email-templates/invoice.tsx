import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

export interface InvoiceEmailProps {
  salonName?: string;
  branchName?: string;
  logoUrl?: string;
  customerName?: string;
  invoiceNumber?: string;
  dateTime?: string;
  staffName?: string;
  total?: string;
  vat?: string;
  pdfUrl?: string;
  footerNote?: string;
}

export function InvoiceEmail({
  salonName = "الصالون",
  branchName = "",
  logoUrl = "",
  customerName = "عميلتنا",
  invoiceNumber = "",
  dateTime = "",
  staffName = "",
  total = "",
  vat = "",
  pdfUrl = "",
  footerNote = "شكراً لزيارتك",
}: InvoiceEmailProps) {
  return (
    <Html dir="rtl" lang="ar">
      <Head />
      <Preview>{`فاتورتك ${invoiceNumber} من ${salonName}`}</Preview>
      <Body style={{ backgroundColor: "#faf7fb", fontFamily: "Tahoma, Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "24px auto", background: "#fff", borderRadius: 16, padding: 24 }}>
          {logoUrl ? (
            <Img src={logoUrl} alt={salonName} height={56} style={{ margin: "0 auto 12px", display: "block" }} />
          ) : null}
          <Heading style={{ fontSize: 20, textAlign: "center", margin: "0 0 4px" }}>{salonName}</Heading>
          {branchName ? (
            <Text style={{ textAlign: "center", color: "#8a8a8a", fontSize: 13, margin: 0 }}>{branchName}</Text>
          ) : null}

          <Section style={{ marginTop: 20 }}>
            <Text style={{ fontSize: 15, margin: "0 0 12px" }}>مرحباً {customerName}،</Text>
            <Text style={{ fontSize: 14, color: "#444", margin: "0 0 12px" }}>
              نشكرك على زيارتك. هذه تفاصيل فاتورتك، ونسخة PDF مرفقة بالرابط أدناه.
            </Text>
            <Text style={{ fontSize: 14, margin: "4px 0" }}>رقم الفاتورة: <b>{invoiceNumber}</b></Text>
            {dateTime ? <Text style={{ fontSize: 14, margin: "4px 0" }}>التاريخ والوقت: {dateTime}</Text> : null}
            {staffName ? <Text style={{ fontSize: 14, margin: "4px 0" }}>الأخصائية: {staffName}</Text> : null}
            {vat ? <Text style={{ fontSize: 14, margin: "4px 0" }}>ضريبة القيمة المضافة: {vat}</Text> : null}
            <Text style={{ fontSize: 16, margin: "10px 0" }}>الإجمالي: <b>{total}</b></Text>
          </Section>

          {pdfUrl ? (
            <Section style={{ textAlign: "center", marginTop: 18 }}>
              <Link
                href={pdfUrl}
                style={{
                  background: "#7c3aed",
                  color: "#fff",
                  padding: "12px 22px",
                  borderRadius: 12,
                  fontSize: 15,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                تحميل الفاتورة PDF
              </Link>
            </Section>
          ) : null}

          <Text style={{ textAlign: "center", color: "#8a8a8a", fontSize: 12, marginTop: 22 }}>{footerNote}</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const template: TemplateEntry = {
  component: InvoiceEmail,
  subject: (data) => `فاتورتك ${data["invoiceNumber"] ?? ""} من ${data["salonName"] ?? "الصالون"}`,
  displayName: "فاتورة العميل",
  previewData: {
    salonName: "لمسة",
    customerName: "سارة",
    invoiceNumber: "INV-1024",
    total: "345.00 ر.س",
  },
};

export default InvoiceEmail;
