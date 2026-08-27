import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { resolveSalonId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "sales_summary",
  title: "Sales summary",
  description:
    "Summarize invoiced sales for the salon between two dates: invoice count, subtotal, VAT, total, paid and outstanding amounts.",
  inputSchema: {
    from: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("Start date (inclusive) in YYYY-MM-DD."),
    to: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("End date (inclusive) in YYYY-MM-DD."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from, to }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const scope = await resolveSalonId(ctx);
    if ("error" in scope) return { content: [{ type: "text", text: scope.error }], isError: true };

    const { data, error } = await supabaseForUser(ctx)
      .from("invoices")
      .select("subtotal, discount, vat, total, paid, status, created_at")
      .eq("salon_id", scope.salonId)
      .gte("created_at", `${from}T00:00:00Z`)
      .lte("created_at", `${to}T23:59:59Z`)
      .limit(1000);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = data ?? [];
    const sum = (k: "subtotal" | "discount" | "vat" | "total" | "paid") =>
      Math.round(rows.reduce((acc, r) => acc + Number(r[k] ?? 0), 0) * 100) / 100;
    const summary = {
      from,
      to,
      invoices: rows.length,
      subtotal: sum("subtotal"),
      discount: sum("discount"),
      vat: sum("vat"),
      total: sum("total"),
      paid: sum("paid"),
      outstanding: Math.round((sum("total") - sum("paid")) * 100) / 100,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      structuredContent: summary,
    };
  },
});
