import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { hydrateAll } from "@/lib/db/hydrate";
import { getDataContext } from "@/lib/db/context";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Load the tenant workspace from the database before rendering any page.
    await hydrateAll();
    // Signed in but not attached to any salon and with no client profile:
    // finish setup instead of landing on an empty dashboard.
    const ctx = getDataContext();
    if (
      ctx &&
      ctx.role !== "platform_owner" &&
      !ctx.salonId &&
      !ctx.customerId &&
      !location.pathname.startsWith("/onboarding")
    ) {
      throw redirect({ to: "/onboarding" });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
