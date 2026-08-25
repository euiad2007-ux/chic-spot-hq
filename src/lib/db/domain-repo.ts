import { supabase } from "@/integrations/supabase/client";

export interface SalonDomainInfo {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  domainStatus: string;
}

/** Normalizes user input like "https://WWW.Salon.com/" → "salon.com". */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/\s+/g, "");
}

export function isValidDomain(domain: string): boolean {
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain) && domain.length <= 253;
}

export async function loadSalonDomain(salonId: string): Promise<SalonDomainInfo | null> {
  const { data, error } = await supabase
    .from("salons")
    .select("id, name, slug, custom_domain, domain_status")
    .eq("id", salonId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    customDomain: data.custom_domain,
    domainStatus: data.domain_status ?? "none",
  };
}

/** Saves the salon's own domain and puts it in "pending verification". */
export async function requestCustomDomain(salonId: string, domain: string): Promise<void> {
  const clean = normalizeDomain(domain);
  if (!isValidDomain(clean)) throw new Error("النطاق غير صحيح — مثال: mysalon.com");
  const { error } = await supabase
    .from("salons")
    .update({ custom_domain: clean, domain_status: "pending" })
    .eq("id", salonId);
  if (error) throw error;
}

export async function removeCustomDomain(salonId: string): Promise<void> {
  const { error } = await supabase
    .from("salons")
    .update({ custom_domain: null, domain_status: "none" })
    .eq("id", salonId);
  if (error) throw error;
}
