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
export function hydratePublicSite(slug?: string): Promise<PublicSalonMeta> {
  const key = slug ?? "";
  if (done && doneKey === key) return done;
  doneKey = key;
  done = (async () => {
    let salon: { id: string; name: string } | null = null;
    if (slug) {
      const { data } = await supabase.rpc("public_salon_lookup", { _slug: slug });
      const row = (data as { id: string; name: string }[] | null)?.[0];
      salon = row ? { id: row.id, name: row.name } : null;
      return finish(salon);
    }
    const tenant = await resolveTenant();
    if (tenant && !tenant.isSuspended) {
      salon = { id: tenant.id, name: tenant.name };
    } else if (!tenant) {
      const { data } = await supabase.rpc("public_salon_lookup", {});
      const row = (data as { id: string; name: string }[] | null)?.[0];
      salon = row ? { id: row.id, name: row.name } : null;
    }
    return finish(salon);
  })();
  return done;
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
