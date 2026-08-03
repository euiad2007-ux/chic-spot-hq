import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { reportDocument } from "@/lib/zatca.server";

const schema = z.object({
  salonId: z.string().uuid(),
  uuid: z.string().min(4).max(64),
  invoiceHash: z.string().min(10).max(200),
  xmlBase64: z.string().min(20).max(2_000_000),
  clearance: z.boolean().default(false),
});

/** Sends one document to ZATCA using the salon's stored onboarding credentials. */
export const sendToZatca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: cfg, error } = await context.supabase
      .from("zatca_config")
      .select("enabled,env,binary_token,secret")
      .eq("salon_id", data.salonId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (!cfg?.enabled) {
      return {
        status: "generated" as const,
        env: "offline",
        response: { note: "الربط مع هيئة الضريبة غير مفعّل — تم التوليد والأرشفة محليًا" },
        error: null,
      };
    }

    return reportDocument({
      env: cfg.env ?? "sandbox",
      binaryToken: cfg.binary_token ?? null,
      secret: cfg.secret ?? null,
      uuid: data.uuid,
      invoiceHash: data.invoiceHash,
      xmlBase64: data.xmlBase64,
      clearance: data.clearance,
    });
  });
