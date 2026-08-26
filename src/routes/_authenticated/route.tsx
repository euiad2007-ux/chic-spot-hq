import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { resolveUserResilient } from "@/lib/auth-session";
import { hydrateAll } from "@/lib/db/hydrate";
import { getDataContext } from "@/lib/db/context";
import { resolveTenant } from "@/lib/tenant-domain";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { user } = await resolveUserResilient();
    if (!user) throw redirect({ to: "/auth" });
    const data = { user };

    // Load the tenant workspace from the database before rendering any page.
    await hydrateAll();
    const ctx = getDataContext();

    // When the app is reached through a salon's custom domain, only members of
    // that salon (or the platform owner) may open the dashboard there.
    const tenant = await resolveTenant();
    if (
      tenant &&
      ctx &&
      ctx.role !== "platform_owner" &&
      ctx.salonId &&
      ctx.salonId !== tenant.id &&
      !location.pathname.startsWith("/no-access")
    ) {
      throw redirect({ to: "/no-access" });
    }

    // Signed in but not attached to any salon and with no client profile:
    // finish setup instead of landing on an empty dashboard.
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

