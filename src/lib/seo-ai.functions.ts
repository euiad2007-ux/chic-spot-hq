import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  brandName: z.string().min(1).max(120),
  lang: z.string().min(2).max(5).default("ar"),
  tagline: z.string().max(200).optional(),
  headline: z.string().max(200).optional(),
  subheadline: z.string().max(400).optional(),
  features: z.array(z.string().max(160)).max(20).optional(),
  services: z.array(z.string().max(160)).max(20).optional(),
  extraHint: z.string().max(500).optional(),
});

/** Platform owner only: drafts SEO title, description, keywords and section copy. */
export const generateSeoContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: isOwner, error } = await context.supabase.rpc("is_platform_owner", {
      _uid: context.userId,
    });
    if (error) throw new Error(error.message);
    if (!isOwner) throw new Error("هذه الميزة متاحة لمالك المنصة فقط");


    const { draftSeoContent } = await import("@/lib/seo-ai.server");
    return draftSeoContent(data);
  });
