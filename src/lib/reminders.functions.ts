import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const processBookingReminders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ limit: z.number().int().min(1).max(200).optional() }).parse(input ?? {}))
  .handler(async ({ data }) => {
    const { processDueBookingReminders } = await import("@/lib/reminders.server");
    return processDueBookingReminders(data.limit ?? 50);
  });
