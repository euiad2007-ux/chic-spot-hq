import { supabase } from "@/integrations/supabase/client";

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

export interface PlatformHome {
  headline?: string;
  subheadline?: string;
  ctaLabel?: string;
  plansTitle?: string;
  plansNote?: string;
  contactTitle?: string;
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
