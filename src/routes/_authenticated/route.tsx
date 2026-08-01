import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { hydrateAll } from "@/lib/db/hydrate";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // Load the tenant workspace from the database before rendering any page.
    await hydrateAll();
    return { user: data.user };
  },
  component: () => <Outlet />,
});
