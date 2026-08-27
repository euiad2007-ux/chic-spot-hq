import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { resolveSalonId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_bookings",
  title: "List bookings",
  description:
    "List bookings for the signed-in user's salon on a given date (defaults to today), with status, time, price and payment state.",
  inputSchema: {
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("Booking date in YYYY-MM-DD. Defaults to today."),
    status: z
      .enum([
        "new",
        "confirmed",
        "checked_in",
        "in_progress",
        "completed",
        "no_show",
        "cancelled",
      ])
      .optional()
      .describe("Optional booking status filter."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ date, status, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const scope = await resolveSalonId(ctx);
    if ("error" in scope) return { content: [{ type: "text", text: scope.error }], isError: true };

    const day = date ?? new Date().toISOString().slice(0, 10);
    let query = supabaseForUser(ctx)
      .from("bookings")
      .select("code, booking_date, starts_at, duration_min, price, status, pay_status, notes")
      .eq("salon_id", scope.salonId)
      .eq("booking_date", day)
      .order("starts_at", { ascending: true })
      .limit(limit ?? 50);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify({ date: day, bookings: data ?? [] }, null, 2) }],
      structuredContent: { date: day, bookings: data ?? [] },
    };
  },
});
