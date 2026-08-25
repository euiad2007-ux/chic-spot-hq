import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const schema = z.object({
  to: z.string().email(),
  salonName: z.string().default("الصالون"),
  branchName: z.string().optional().default(""),
  logoUrl: z.string().optional().default(""),
  customerName: z.string().optional().default("عميلتنا"),
  invoiceNumber: z.string(),
  dateTime: z.string().optional().default(""),
  staffName: z.string().optional().default(""),
  total: z.string().optional().default(""),
  vat: z.string().optional().default(""),
  pdfUrl: z.string().optional().default(""),
  footerNote: z.string().optional().default(""),
});

/** Emails the customer a branded invoice message with a link to the PDF copy. */
export const sendInvoiceEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const { to, ...templateData } = data;
    try {
      const res = await sendTemplateEmail("invoice", to, { templateData });
      return res.sent ? { ok: true as const } : { ok: false as const, reason: res.reason };
    } catch (e) {
      return { ok: false as const, reason: e instanceof Error ? e.message : "send_failed" };
    }
  });
