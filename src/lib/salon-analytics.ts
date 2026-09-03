import { supabase } from "@/integrations/supabase/client";
import type { VisitBucket } from "@/lib/visit-tracking";

/** Aggregated statistics for one store: website visitors and dashboard sign-ins. */
export interface SalonAnalytics {
  total_visits: number;
  unique_visitors: number;
  new_visitors: number;
  total_logins: number;
  login_users: number;
  devices: VisitBucket[];
  browsers: VisitBucket[];
  systems: VisitBucket[];
  regions: VisitBucket[];
  pages: VisitBucket[];
  daily: { day: string; count: number }[];
  login_daily: { day: string; count: number }[];
  login_roles: VisitBucket[];
  login_regions: VisitBucket[];
  recent_logins: {
    email: string | null;
    role: string | null;
    device: string | null;
    browser: string | null;
    region: string | null;
    at: string;
  }[];
}

export async function loadSalonAnalytics(salonId: string, days = 30): Promise<SalonAnalytics> {
  const { data, error } = await supabase.rpc("salon_analytics_overview", {
    _salon: salonId,
    _days: days,
  });
  if (error) throw error;
  return data as unknown as SalonAnalytics;
}

function deviceKind(ua: string): string {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "جهاز لوحي";
  if (/mobi|iphone|android/i.test(ua)) return "جوال";
  return "حاسب";
}

function osName(ua: string): string {
  if (/windows/i.test(ua)) return "Windows";
  if (/iphone|ipad|ios/i.test(ua)) return "iOS";
  if (/mac os/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/linux/i.test(ua)) return "Linux";
  return "غير معروف";
}

function browserName(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/chrome\//i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/safari\//i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  if (/firefox\//i.test(ua)) return "Firefox";
  return "غير معروف";
}

function regionGuess(): { country: string; region: string } {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  const parts = tz.split("/");
  const region = parts.length > 1 ? parts[1].replace(/_/g, " ") : tz;
  const locale = navigator.language ?? "";
  const country = locale.includes("-") ? locale.split("-")[1].toUpperCase() : parts[0] || "";
  return { country, region };
}

/**
 * Record one dashboard sign-in for the current user — once per browser session,
 * so counts reflect real sign-ins rather than page views.
 */
export async function trackLogin(input: {
  userId: string;
  salonId: string | null;
  email: string | null;
  roleLabel: string | null;
}) {
  if (typeof window === "undefined") return;
  const key = `login-logged:${input.userId}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const ua = navigator.userAgent;
    const { country, region } = regionGuess();
    await supabase.from("login_events").insert({
      user_id: input.userId,
      salon_id: input.salonId,
      email: input.email,
      role_label: input.roleLabel,
      device: deviceKind(ua),
      os: osName(ua),
      browser: browserName(ua),
      language: navigator.language ?? null,
      country,
      region,
    });
  } catch {
    /* analytics must never block the dashboard */
  }
}
