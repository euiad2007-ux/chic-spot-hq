import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy URL — fixed assets now live inside the accounting section. */
export const Route = createFileRoute("/_authenticated/assets")({
  beforeLoad: () => {
    throw redirect({ to: "/accounting/assets", replace: true });
  },
});
