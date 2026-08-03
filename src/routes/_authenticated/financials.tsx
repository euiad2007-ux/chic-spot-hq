import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy URL — financial statements now live inside the accounting section. */
export const Route = createFileRoute("/_authenticated/financials")({
  beforeLoad: () => {
    throw redirect({ to: "/accounting/financials", replace: true });
  },
});
