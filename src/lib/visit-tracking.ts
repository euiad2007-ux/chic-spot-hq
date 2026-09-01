import { supabase } from "@/integrations/supabase/client";

/** Anonymous, per-browser key used only to count unique visitors. */
function sessionKey(): string {
  const k = "visit-key";
  let v = localStorage.getItem(k);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(k, v);
  }
  return v;
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

/** Region guessed from the browser locale/timezone — no IP data is collected. */
function regionGuess(): { country: string; region: string } {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  const parts = tz.split("/");
  const region = parts.length > 1 ? parts[1].replace(/_/g, " ") : tz;
  const locale = navigator.language ?? "";
  const country = locale.includes("-") ? locale.split("-")[1].toUpperCase() : parts[0] || "";
  return { country, region };
}

/** Record one public-site page view. Silently ignores failures. */
export async function trackVisit(path: string, salonId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    const ua = navigator.userAgent;
    const { country, region } = regionGuess();
    await supabase.from("site_visits").insert({
      salon_id: salonId ?? null,
      path,
      session_key: sessionKey(),
      device: deviceKind(ua),
      os: osName(ua),
      browser: browserName(ua),
      language: navigator.language ?? null,
      country,
      region,
      referrer: document.referrer ? new URL(document.referrer).hostname : null,
    });
  } catch {
    /* analytics must never break the page */
  }
}

export interface VisitBucket {
  name: string;
  count: number;
}

export interface VisitsOverview {
  total_visits: number;
  unique_visitors: number;
  new_visitors: number;
  devices: VisitBucket[];
  browsers: VisitBucket[];
  systems: VisitBucket[];
  regions: VisitBucket[];
  pages: VisitBucket[];
  daily: { day: string; count: number }[];
}

export async function loadVisitsOverview(days = 30): Promise<VisitsOverview> {
  const { data, error } = await supabase.rpc("platform_visits_overview", { _days: days });
  if (error) throw error;
  return data as unknown as VisitsOverview;
}
