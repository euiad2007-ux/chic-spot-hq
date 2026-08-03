import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy URL — the chart of accounts now lives inside the accounting section. */
export const Route = createFileRoute("/_authenticated/accounts")({
  beforeLoad: () => {
    throw redirect({ to: "/accounting/accounts", replace: true });
  },
});
