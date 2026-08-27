import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listBookings from "./tools/list-bookings";
import listServices from "./tools/list-services";
import salesSummary from "./tools/sales-summary";
import lowStockItems from "./tools/inventory-alerts";

// The OAuth issuer must be the direct Supabase host; the project ref is the only
// value that survives publish unchanged.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "novaa",
  title: "NOVAA",
  version: "0.1.0",
  instructions:
    "Tools for the NOVAA salon platform. All tools act as the signed-in user and are scoped to the salon they belong to: `list_bookings` for a day's schedule, `list_services` for the service menu, `sales_summary` for invoiced revenue in a date range, and `low_stock_items` for inventory that needs restocking.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listBookings, listServices, salesSummary, lowStockItems],
});
