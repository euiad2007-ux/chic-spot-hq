import { supabase } from "@/integrations/supabase/client";
import { num, str } from "@/lib/db/sync";
import { hydrateSalonStore, type SalonState, type Service, type Staff } from "@/lib/salon-store";
import { hydrateSiteSettings } from "@/lib/site-settings";

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
      const { data } = await supabase
        .from("salons")
        .select("id, name")
        .eq("is_suspended", false)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      salon = data ?? null;
    }

    if (!salon) {
      hydrateSalonStore(emptyState([], []));
      hydrateSiteSettings(null);
      return;
    }
    const [settingsRes, servicesRes, teamRes] = await Promise.all([
      supabase.from("salon_settings").select("site").eq("salon_id", salon.id).maybeSingle(),
      supabase.from("services").select("*").eq("salon_id", salon.id).eq("active", true),
      supabase.rpc("public_salon_team", { _salon: salon.id }),
    ]);

    const services: Service[] = (servicesRes.data ?? []).map((r) => ({
      id: r.id,
      name: str(r.name),
      category: str(r.category),
      price: num(r.price),
      durationMin: num(r.duration_min, 30),
      prepMin: num(r.prep_min),
      cleanupMin: num(r.cleanup_min),
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
    const siteDoc = settingsRes.data?.site;
    hydrateSiteSettings(
      siteDoc && typeof siteDoc === "object" && !Array.isArray(siteDoc)
        ? { name: salon.name, ...(siteDoc as Record<string, unknown>) }
        : { name: salon.name },
    );
  })();
  return done;
}
