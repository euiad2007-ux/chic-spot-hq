import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/booking-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
        const provided = request.headers.get("apikey") ?? "";
        if (!expected || provided !== expected) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({})) as { limit?: unknown };
        const limit = typeof body.limit === "number" ? body.limit : 50;
        const { processDueBookingReminders } = await import("@/lib/reminders.server");
        const result = await processDueBookingReminders(limit);
        return Response.json({ success: true, ...result });
      },
    },
  },
});
