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

export interface StaffInviteEmailProps {
  salonName?: string;
  branchName?: string;
  staffName?: string;
  jobTitle?: string;
  inviteUrl?: string;
  code?: string;
  expiresAt?: string;
}

export function StaffInviteEmail({
  salonName = "Chic Spot",
  branchName = "",
  staffName = "زميلتنا",
  jobTitle = "",
  inviteUrl = "",
  code = "",
  expiresAt = "",
}: StaffInviteEmailProps) {
  return (
    <Html dir="rtl" lang="ar">
      <Head />
      <Preview>{`دعوة للانضمام إلى ${salonName}`}</Preview>
      <Body style={{ backgroundColor: "#fff7fb", fontFamily: "Tahoma, Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "24px auto", background: "#ffffff", borderRadius: 16, padding: 24 }}>
          <Heading style={{ fontSize: 22, textAlign: "center", margin: "0 0 8px", color: "#241425" }}>
            دعوة موظف
          </Heading>
          <Text style={{ fontSize: 15, color: "#3f3042", margin: "16px 0 8px" }}>مرحباً {staffName}،</Text>
          <Text style={{ fontSize: 14, color: "#55465a", lineHeight: "24px", margin: 0 }}>
            تمت دعوتك للانضمام إلى لوحة {salonName}{branchName ? ` — ${branchName}` : ""}{jobTitle ? ` كـ ${jobTitle}` : ""}.
          </Text>
          {inviteUrl ? (
            <Section style={{ textAlign: "center", marginTop: 22 }}>
              <Link
                href={inviteUrl}
                style={{
                  background: "#be185d",
                  color: "#ffffff",
                  padding: "12px 22px",
                  borderRadius: 12,
                  fontSize: 15,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                قبول الدعوة
              </Link>
            </Section>
          ) : null}
          {code ? <Text style={{ fontSize: 13, color: "#6b5b70", marginTop: 18 }}>رمز الدعوة: <b>{code}</b></Text> : null}
          {expiresAt ? <Text style={{ fontSize: 12, color: "#8b7c91", marginTop: 8 }}>تنتهي الدعوة في: {expiresAt}</Text> : null}
        </Container>
      </Body>
    </Html>
  );
}

export const template: TemplateEntry = {
  component: StaffInviteEmail,
  subject: (data) => `دعوة للانضمام إلى ${data["salonName"] ?? "Chic Spot"}`,
  displayName: "دعوة موظف",
  previewData: {
    salonName: "صالون نوفا",
    branchName: "فرع الرياض",
    staffName: "ليان",
    jobTitle: "أخصائية شعر",
    inviteUrl: "https://example.com/onboarding?invite=ABC123",
    code: "ABC123",
    expiresAt: "2026-09-01",
  },
};

export default StaffInviteEmail;
