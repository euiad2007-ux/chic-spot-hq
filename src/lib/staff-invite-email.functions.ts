import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendStaffInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    inviteId: z.string().uuid(),
    to: z.string().email(),
    salonName: z.string().default("Chic Spot"),
    branchName: z.string().optional().default(""),
    staffName: z.string().default(""),
    jobTitle: z.string().optional().default(""),
    inviteUrl: z.string().url(),
    code: z.string(),
    expiresAt: z.string().optional().default(""),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const templateData = {
      salonName: data.salonName,
      branchName: data.branchName,
      staffName: data.staffName,
      jobTitle: data.jobTitle,
      inviteUrl: data.inviteUrl,
      code: data.code,
      expiresAt: data.expiresAt,
    };

    try {
      const res = await sendTemplateEmail("staff_invite", data.to, {
        templateData,
        idempotencyKey: `staff-invite:${data.inviteId}`,
      });
      if (!res.sent) {
        await context.supabase.from("staff_invites").update({ email_error: res.reason }).eq("id", data.inviteId);
        return { ok: false as const, reason: res.reason };
      }
      await context.supabase.from("staff_invites").update({ email_sent_at: new Date().toISOString(), email_error: null }).eq("id", data.inviteId);
      return { ok: true as const };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "send_failed";
      await context.supabase.from("staff_invites").update({ email_error: reason }).eq("id", data.inviteId);
      return { ok: false as const, reason };
    }
  });
