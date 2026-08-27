import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { resolveSalonId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_services",
  title: "List services",
  description: "List the salon's services with price, duration and category.",
  inputSchema: {
    activeOnly: z.boolean().optional().describe("Return only active services. Defaults to true."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ activeOnly, limit }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const scope = await resolveSalonId(ctx);
    if ("error" in scope) return { content: [{ type: "text", text: scope.error }], isError: true };

    let query = supabaseForUser(ctx)
      .from("services")
      .select("name, category, price, duration_min, active")
      .eq("salon_id", scope.salonId)
      .order("name")
      .limit(limit ?? 100);
    if (activeOnly !== false) query = query.eq("active", true);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { services: data ?? [] },
    };
  },
});
