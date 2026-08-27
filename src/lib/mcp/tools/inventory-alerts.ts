import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { resolveSalonId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "low_stock_items",
  title: "Low stock items",
  description: "List inventory items whose stock is at or below their minimum stock level.",
  inputSchema: { limit: z.number().int().min(1).max(200).optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const scope = await resolveSalonId(ctx);
    if ("error" in scope) return { content: [{ type: "text", text: scope.error }], isError: true };

    const { data, error } = await supabaseForUser(ctx)
      .from("inventory_items")
      .select("name, unit, stock, min_stock, cost_per_unit")
      .eq("salon_id", scope.salonId)
      .limit(limit ?? 200);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const low = (data ?? []).filter((i) => Number(i.stock) <= Number(i.min_stock));
    return {
      content: [{ type: "text", text: JSON.stringify(low, null, 2) }],
      structuredContent: { items: low },
    };
  },
});
