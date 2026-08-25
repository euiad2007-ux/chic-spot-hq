import * as React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

export interface BookingReminderEmailProps {
  salonName?: string;
  branchName?: string;
  customerName?: string;
  bookingCode?: string;
  serviceNames?: string;
  staffName?: string;
  dateTime?: string;
  branchPhone?: string;
  mapsUrl?: string;
}

export function BookingReminderEmail({
  salonName = "الصالون",
  branchName = "",
  customerName = "عميلتنا",
  bookingCode = "",
  serviceNames = "",
  staffName = "",
  dateTime = "",
  branchPhone = "",
  mapsUrl = "",
}: BookingReminderEmailProps) {
  return (
    <Html dir="rtl" lang="ar">
      <Head />
      <Preview>{`تذكير بموعدك في ${salonName}`}</Preview>
      <Body style={{ backgroundColor: "#fff7fb", fontFamily: "Tahoma, Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "24px auto", background: "#ffffff", borderRadius: 16, padding: 24 }}>
          <Heading style={{ fontSize: 22, textAlign: "center", margin: "0 0 8px", color: "#241425" }}>
            تذكير بموعدك
          </Heading>
          <Text style={{ fontSize: 15, color: "#3f3042", margin: "16px 0 8px" }}>مرحباً {customerName}،</Text>
          <Text style={{ fontSize: 14, color: "#55465a", lineHeight: "24px", margin: 0 }}>
            نذكرك بموعدك القادم في {salonName}{branchName ? ` — ${branchName}` : ""}.
          </Text>
          <Section style={{ marginTop: 18, borderTop: "1px solid #f0ddea", paddingTop: 14 }}>
            {bookingCode ? <Text style={{ fontSize: 14, margin: "4px 0" }}>رقم الحجز: <b>{bookingCode}</b></Text> : null}
            {dateTime ? <Text style={{ fontSize: 14, margin: "4px 0" }}>الموعد: <b>{dateTime}</b></Text> : null}
            {serviceNames ? <Text style={{ fontSize: 14, margin: "4px 0" }}>الخدمات: {serviceNames}</Text> : null}
            {staffName ? <Text style={{ fontSize: 14, margin: "4px 0" }}>الأخصائية: {staffName}</Text> : null}
            {branchPhone ? <Text style={{ fontSize: 14, margin: "4px 0" }}>رقم الفرع: {branchPhone}</Text> : null}
          </Section>
          {mapsUrl ? (
            <Section style={{ textAlign: "center", marginTop: 20 }}>
              <Link href={mapsUrl} style={{ color: "#be185d", fontWeight: 700, textDecoration: "none" }}>
                فتح موقع الفرع
              </Link>
            </Section>
          ) : null}
        </Container>
      </Body>
    </Html>
  );
}

export const template: TemplateEntry = {
  component: BookingReminderEmail,
  subject: (data) => `تذكير بموعد ${data["bookingCode"] ?? "الحجز"}`,
  displayName: "تذكير موعد",
  previewData: {
    salonName: "صالون نوفا",
    branchName: "فرع الرياض",
    customerName: "سارة",
    bookingCode: "000128-000022-0003",
    serviceNames: "تصفيف شعر، مكياج",
    staffName: "ليان",
    dateTime: "الخميس 27 أغسطس 2026، 05:30 م",
    branchPhone: "+966500000000",
    mapsUrl: "https://maps.google.com",
  },
};

export default BookingReminderEmail;
