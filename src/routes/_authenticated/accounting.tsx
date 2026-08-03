import { Outlet, createFileRoute } from "@tanstack/react-router";

/** Layout for the accounting section; every sub-page renders its own shell. */
export const Route = createFileRoute("/_authenticated/accounting")({
  component: () => <Outlet />,
});
