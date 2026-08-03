import { supabase } from "@/integrations/supabase/client";

export interface DomainTenant {
  id: string;
  name: string;
  slug: string;
  isSuspended: boolean;
  /** true when the tenant was resolved from a real custom domain (not a preview override). */
  fromDomain: boolean;
}

/** Hosts that serve the platform itself (landing, auth, platform owner console). */
export function isPlatformHost(host: string): boolean {
  const h = host.toLowerCase().split(":")[0] ?? "";
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h.endsWith(".lovable.app") ||
    h.endsWith(".lovableproject.com") ||
    h.endsWith(".lovable.dev")
  );
}

export function currentHost(): string | null {
  if (typeof window === "undefined") return null;
  return window.location.hostname.toLowerCase();
}

/**
 * Preview/testing override: `?tenant=<salon-slug>` behaves exactly like
 * browsing the salon's custom domain. Custom domains cannot be reached from a
 * preview URL, so this keeps the same code path testable.
 */
function tenantSlugOverride(): string | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("tenant");
  return v ? v.trim().toLowerCase() : null;
}

let cache: Promise<DomainTenant | null> | null = null;

type LookupRow = {
  id: string;
  name: string;
  slug: string;
  custom_domain: string | null;
  domain_status: string | null;
};

/**
 * Public storefront lookup goes through `public_salon_lookup`, which exposes
 * only non-sensitive columns of active salons (no phone, tax or billing data).
 */
async function lookup(): Promise<DomainTenant | null> {
  const slug = tenantSlugOverride();
  if (slug) {
    const { data } = await supabase.rpc("public_salon_lookup", { _slug: slug });
    const row = (data as LookupRow[] | null)?.[0];
    if (!row) return null;
    return { id: row.id, name: row.name, slug: row.slug, isSuspended: false, fromDomain: false };
  }

  const host = currentHost();
  if (!host || isPlatformHost(host)) return null;

  const candidates = host.startsWith("www.") ? [host, host.slice(4)] : [host, `www.${host}`];
  const { data } = await supabase.rpc("public_salon_lookup", { _domains: candidates });
  const row = (data as LookupRow[] | null)?.[0];
  if (!row || row.domain_status !== "verified") return null;
  return { id: row.id, name: row.name, slug: row.slug, isSuspended: false, fromDomain: true };
}


/** Resolves the salon that owns the current hostname, if any. Cached per page load. */
export function resolveTenant(): Promise<DomainTenant | null> {
  if (!cache) cache = lookup().catch(() => null);
  return cache;
}

export function resetTenantCache() {
  cache = null;
}
