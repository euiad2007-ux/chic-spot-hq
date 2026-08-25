import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(2000) }))
    .min(1)
    .max(20),
  context: z.object({
    salonName: z.string().min(1).max(120),
    tagline: z.string().max(200).optional(),
    about: z.string().max(2000).optional(),
    phone: z.string().max(40).optional(),
    waNumber: z.string().max(40).optional(),
    email: z.string().max(120).optional(),
    address: z.string().max(300).optional(),
    hours: z.string().max(300).optional(),
    mapsUrl: z.string().max(500).optional(),
    instagram: z.string().max(200).optional(),
    branches: z
      .array(
        z.object({
          name: z.string().max(120),
          address: z.string().max(300).optional(),
          phone: z.string().max(40).optional(),
        }),
      )
      .max(30)
      .optional(),
    services: z
      .array(
        z.object({
          name: z.string().max(150),
          category: z.string().max(80).optional(),
          price: z.number().optional(),
          durationMin: z.number().optional(),
        }),
      )
      .max(120)
      .optional(),
    team: z
      .array(z.object({ name: z.string().max(120), role: z.string().max(120).optional() }))
      .max(80)
      .optional(),
  }),
});

/** Public: answers a visitor's question using the salon's public data only. */
export const askSiteAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const { answerVisitorQuestion } = await import("@/lib/site-assistant.server");
    const reply = await answerVisitorQuestion(data.messages, data.context);
    return { reply };
  });
