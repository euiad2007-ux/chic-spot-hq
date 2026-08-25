import { supabase } from "@/integrations/supabase/client";
import { num, str } from "@/lib/db/sync";
import { hydrateSalonStore, type SalonState, type Service, type Staff } from "@/lib/salon-store";
import { hydrateSiteSettings } from "@/lib/site-settings";
import { resolveTenant } from "@/lib/tenant-domain";


const emptyState = (services: Service[], staff: Staff[]): SalonState => ({
  services,
  staff,
  customers: [],
  bookings: [],
  invoices: [],
  inventory: [],
  counters: { global: 0, branch: 0, byDay: {}, byServiceDay: {} },
});

let done: Promise<void> | null = null;

/**
 * Public salon website: loads branding, active services and the team without
 * requiring a session (read-only, anon-safe columns only).
 */
export function hydratePublicSite(): Promise<void> {
  if (done) return done;
  done = (async () => {
    const tenant = await resolveTenant();
    let salon: { id: string; name: string } | null = null;
    if (tenant && !tenant.isSuspended) {
      salon = { id: tenant.id, name: tenant.name };
    } else if (!tenant) {
      const { data } = await supabase.rpc("public_salon_lookup", {});
      const row = (data as { id: string; name: string }[] | null)?.[0];
      salon = row ? { id: row.id, name: row.name } : null;
    }

    if (!salon) {
      hydrateSalonStore(emptyState([], []));
      hydrateSiteSettings(null);
      return;
    }
    const [settingsRes, servicesRes, teamRes] = await Promise.all([
      supabase.rpc("public_salon_site", { _salon: salon.id }),
      supabase.rpc("public_salon_services", { _salon: salon.id }),
      supabase.rpc("public_salon_team", { _salon: salon.id }),
    ]);

    const services: Service[] = (
      (servicesRes.data ?? []) as {
        id: string;
        name: string;
        category: string | null;
        price: number | null;
        duration_min: number | null;
      }[]
    ).map((r) => ({
      id: r.id,
      name: str(r.name),
      category: str(r.category),
      price: num(r.price),
      durationMin: num(r.duration_min, 30),
      prepMin: 0,
      cleanupMin: 0,
      active: true,
      materials: [],
    }));

    const staff: Staff[] = ((teamRes.data ?? []) as { id: string; name: string; role_label: string | null; job_title: string | null }[]).map((r) => ({
      id: r.id,
      name: str(r.name),
      role: str(r.role_label ?? r.job_title),
      phone: "",
      commissionPct: 0,
      services: [],
      active: true,
    }));

    hydrateSalonStore(emptyState(services, staff));
    const siteDoc = settingsRes.data;
    const stored =
      siteDoc && typeof siteDoc === "object" && !Array.isArray(siteDoc)
        ? (siteDoc as Record<string, unknown>)
        : {};
    // The salon's own record wins over the template default branding name.
    const salonName = typeof stored["salonName"] === "string" && stored["salonName"] ? stored["salonName"] : salon.name;
    hydrateSiteSettings({ ...stored, salonName });

  })();
  return done;
}
