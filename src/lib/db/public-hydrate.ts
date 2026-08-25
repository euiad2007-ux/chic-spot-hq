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

export interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  displayName: string;
  createdAt: string;
}

export interface PublicSalonMeta {
  salonId: string | null;
  avgRating: number;
  reviewCount: number;
  reviews: PublicReview[];
}

let done: Promise<PublicSalonMeta> | null = null;
let doneKey = "";

const EMPTY_META: PublicSalonMeta = { salonId: null, avgRating: 0, reviewCount: 0, reviews: [] };

/**
 * Public salon website: loads branding, active services and the team without
 * requiring a session (read-only, anon-safe columns only).
 */
async function resolveSalon(slug?: string): Promise<{ id: string; name: string } | null> {
  if (slug) {
    const { data } = await supabase.rpc("public_salon_lookup", { _slug: slug });
    const row = (data as { id: string; name: string }[] | null)?.[0];
    return row ? { id: row.id, name: row.name } : null;
  }
  const tenant = await resolveTenant();
  if (tenant && !tenant.isSuspended) return { id: tenant.id, name: tenant.name };
  if (tenant) return null;
  const signed = await resolveSignedInSalon();
  if (signed) return signed;
  return resolvePublicFallbackSalon();
}

async function resolvePublicFallbackSalon(): Promise<{ id: string; name: string } | null> {
  const { data } = await supabase.rpc("public_salon_lookup", { _domains: [] });
  const row = (data as { id: string; name: string }[] | null)?.[0];
  if (row) return { id: row.id, name: row.name };
  return null;
}

const salonCache = new Map<string, Promise<{ id: string; name: string } | null>>();

function cachedSalon(slug?: string) {
  const key = slug ?? "current";
  let p = salonCache.get(key);
  if (!p) {
    p = resolveSalon(slug);
    salonCache.set(key, p);
  }
  return p;
}

export interface PublicBranding {
  salonName: string;
  logoUrl: string;
  primary: string;
  accent: string;
  background: string;
  textColor: string;
}

/** Minimal, fast branding fetch used to render the salon-branded loading screen. */
export async function fetchPublicBranding(slug?: string): Promise<PublicBranding | null> {
  const salon = await cachedSalon(slug);
  if (!salon) return null;
  const { data } = await supabase.rpc("public_salon_site", { _salon: salon.id });
  const stored = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  const pick = (k: string) => (typeof stored[k] === "string" ? (stored[k] as string) : "");
  const salonName = pick("salonName") || salon.name;
  hydrateSiteSettings({ ...stored, salonName });
  return {
    salonName,
    logoUrl: pick("logoUrl"),
    primary: pick("primary"),
    accent: pick("accent"),
    background: pick("background"),
    textColor: pick("textColor"),
  };
}

/**
 * Public salon website: loads branding, active services and the team without
 * requiring a session (read-only, anon-safe columns only).
 */
export function hydratePublicSite(slug?: string, force = false): Promise<PublicSalonMeta> {
  const key = slug ?? "current";
  if (done && doneKey === key && !force) return done;
  doneKey = key;
  if (force) salonCache.delete(key);
  done = cachedSalon(slug).then((salon) => finish(salon));
  return done;
}

export function resetPublicSiteHydration() {
  done = null;
  doneKey = "";
  salonCache.clear();
}

async function resolveSignedInSalon(): Promise<{ id: string; name: string } | null> {
  const { data: sessionRes } = await supabase.auth.getSession();
  if (!sessionRes.session) return null;

  const { data: memberships } = await supabase
    .from("salon_members")
    .select("salon_id, role")
    .in("role", ["salon_owner", "branch_manager", "staff"])
    .limit(20);

  const rows = (memberships ?? []) as { salon_id: string | null; role: string }[];
  const picked =
    rows.find((r) => r.role === "salon_owner" && r.salon_id) ??
    rows.find((r) => r.role === "branch_manager" && r.salon_id) ??
    rows.find((r) => r.role === "staff" && r.salon_id);
  if (!picked?.salon_id) return null;

  const { data: salon } = await supabase
    .from("salons")
    .select("id, name")
    .eq("id", picked.salon_id)
    .maybeSingle();

  return salon ? { id: salon.id, name: salon.name } : null;
}

async function finish(salon: { id: string; name: string } | null): Promise<PublicSalonMeta> {
  {
    if (!salon) {
      hydrateSalonStore(emptyState([], []));
      hydrateSiteSettings(null);
      return EMPTY_META;
    }
    const [settingsRes, servicesRes, teamRes, reviewsRes, ratingRes] = await Promise.all([
      supabase.rpc("public_salon_site", { _salon: salon.id }),
      supabase.rpc("public_salon_services", { _salon: salon.id }),
      supabase.rpc("public_salon_team", { _salon: salon.id }),
      supabase.rpc("public_salon_reviews", { _salon: salon.id, _limit: 12 }),
      supabase.rpc("public_salon_rating", { _salon: salon.id }),
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

    const reviews: PublicReview[] = (
      (reviewsRes.data ?? []) as {
        id: string;
        rating: number | null;
        comment: string | null;
        display_name: string | null;
        created_at: string;
      }[]
    ).map((r) => ({
      id: r.id,
      rating: num(r.rating, 5),
      comment: str(r.comment),
      displayName: str(r.display_name) || "عميلة",
      createdAt: r.created_at,
    }));
    const ratingRow = (ratingRes.data as { avg_rating: number | null; review_count: number | null }[] | null)?.[0];
    return {
      salonId: salon.id,
      avgRating: num(ratingRow?.avg_rating),
      reviewCount: num(ratingRow?.review_count),
      reviews,
    };
  }
}
