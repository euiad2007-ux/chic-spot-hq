import { supabase } from "@/integrations/supabase/client";
import type { PlatformTheme } from "@/lib/platform-theme";

export interface PlatformSocials {
  instagram?: string;
  snapchat?: string;
  tiktok?: string;
  x?: string;
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  website?: string;
}

export interface PlatformFeatureItem {
  title: string;
  desc?: string;
}

/** Search-engine and social-share metadata for the platform landing page. */
export interface PlatformSeo {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImageUrl?: string;
}

export interface PlatformNavLink {
  label: string;
  href: string;
}

/** Per-language overrides of the marketing copy. */
export interface PlatformLocaleContent {
  brandName?: string;
  tagline?: string;
  heroBadge?: string;
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaSecondaryLabel?: string;
  heroNote?: string;
  featuresTitle?: string;
  showcaseTitle?: string;
  posTitle?: string;
  posText?: string;
  plansTitle?: string;
  plansNote?: string;
  contactTitle?: string;
  footerText?: string;
  navLinks?: PlatformNavLink[];
  features?: PlatformFeatureItem[];
  includedItems?: string[];
  seo?: PlatformSeo;
}

export const PLATFORM_LANGS = [
  { code: "ar", label: "العربية", dir: "rtl" as const },
  { code: "en", label: "English", dir: "ltr" as const },
];

export type PlatformLangCode = (typeof PLATFORM_LANGS)[number]["code"];



/** Content and identity of the platform's own marketing website. */
export interface PlatformHome {
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaSecondaryLabel?: string;
  plansTitle?: string;
  plansNote?: string;
  contactTitle?: string;
  /** Identity */
  logoUrl?: string;
  faviconUrl?: string;
  tagline?: string;
  heroBadge?: string;
  heroImageUrl?: string;
  heroNote?: string;
  /** Sections */
  featuresTitle?: string;
  features?: PlatformFeatureItem[];
  showcaseTitle?: string;
  showcaseImageUrl?: string;
  includedItems?: string[];
  posTitle?: string;
  posText?: string;
  posImageUrl?: string;
  footerText?: string;
  navLinks?: PlatformNavLink[];
  showFeatures?: boolean;
  showShowcase?: boolean;
  showPos?: boolean;
  showPlans?: boolean;
  showContact?: boolean;
  /** SEO / social sharing */
  seo?: PlatformSeo;
  /** Colors, fonts, button and plan-card styles */
  theme?: PlatformTheme;
  /** i18n: `defaultLang` holds the fields above; other languages live in `translations`. */
  defaultLang?: PlatformLangCode;
  languages?: PlatformLangCode[];
  translations?: Record<string, PlatformLocaleContent>;
}

/** Merges a language's overrides over the default content. Empty values fall back. */
export function resolvePlatformContent(
  settings: PlatformSettings,
  lang: string,
): { brandName: string; home: PlatformHome; seo: PlatformSeo; dir: "rtl" | "ltr" } {
  const home = settings.home ?? {};
  const defaultLang = home.defaultLang ?? "ar";
  const tr = lang === defaultLang ? undefined : home.translations?.[lang];
  const dir = PLATFORM_LANGS.find((l) => l.code === lang)?.dir ?? "rtl";
  if (!tr) return { brandName: settings.brandName, home, seo: home.seo ?? {}, dir };

  const merged: PlatformHome = { ...home };
  for (const [k, v] of Object.entries(tr)) {
    if (k === "seo" || k === "brandName") continue;
    const empty =
      v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (!empty) (merged as Record<string, unknown>)[k] = v;
  }
  return {
    brandName: tr.brandName?.trim() || settings.brandName,
    home: merged,
    seo: { ...(home.seo ?? {}), ...cleanSeo(tr.seo) },
    dir,
  };
}

function cleanSeo(seo?: PlatformSeo): PlatformSeo {
  if (!seo) return {};
  return Object.fromEntries(
    Object.entries(seo).filter(([, v]) => typeof v === "string" && v.trim()),
  ) as PlatformSeo;
}


export interface PlatformSettings {
  brandName: string;
  bankName: string;
  bankAccountName: string;
  iban: string;
  accountNumber: string;
  phone: string;
  whatsapp: string;
  email: string;
  supportHours: string;
  socials: PlatformSocials;
  home: PlatformHome;
}

export const EMPTY_PLATFORM_SETTINGS: PlatformSettings = {
  brandName: "Salon Flow",
  bankName: "",
  bankAccountName: "",
  iban: "",
  accountNumber: "",
  phone: "",
  whatsapp: "",
  email: "",
  supportHours: "",
  socials: {},
  home: {},
};

export interface PublicPlan {
  code: string;
  name: string;
  price_monthly: number;
  max_branches: number;
  max_staff: number;
  max_services: number;
  max_customers: number;
  max_invoices: number;
  has_website: boolean;
  enabled_modules: string[];
  features: string[];
  sort_order: number;
}

/** Reads the single platform-wide settings row (readable by everyone). */
export async function loadPlatformSettings(): Promise<PlatformSettings> {
  const { data, error } = await supabase
    .from("platform_settings")
    .select(
      "brand_name, bank_name, bank_account_name, iban, account_number, phone, whatsapp, email, support_hours, socials, home",
    )
    .eq("id", "main")
    .maybeSingle();
  if (error) throw error;
  if (!data) return EMPTY_PLATFORM_SETTINGS;
  return {
    brandName: data.brand_name ?? "Salon Flow",
    bankName: data.bank_name ?? "",
    bankAccountName: data.bank_account_name ?? "",
    iban: data.iban ?? "",
    accountNumber: data.account_number ?? "",
    phone: data.phone ?? "",
    whatsapp: data.whatsapp ?? "",
    email: data.email ?? "",
    supportHours: data.support_hours ?? "",
    socials: (data.socials ?? {}) as PlatformSocials,
    home: (data.home ?? {}) as PlatformHome,
  };
}

/** Platform-owner only (enforced by row-level policies). */
export async function savePlatformSettings(s: PlatformSettings): Promise<void> {
  const { error } = await supabase.from("platform_settings").upsert({
    id: "main",
    brand_name: s.brandName || "Salon Flow",
    bank_name: s.bankName || null,
    bank_account_name: s.bankAccountName || null,
    iban: s.iban || null,
    account_number: s.accountNumber || null,
    phone: s.phone || null,
    whatsapp: s.whatsapp || null,
    email: s.email || null,
    support_hours: s.supportHours || null,
    socials: s.socials as unknown as Record<string, string>,
    home: s.home as unknown as Record<string, string>,
  });
  if (error) throw error;
}

/** Active plans, shown on the public landing page and the merchant subscription page. */
export async function listPublicPlans(): Promise<PublicPlan[]> {
  const { data, error } = await supabase
    .from("platform_plans")
    .select(
      "code, name, price_monthly, max_branches, max_staff, max_services, max_customers, max_invoices, has_website, enabled_modules, features, sort_order",
    )
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as PublicPlan[];
}
