import { useSyncExternalStore } from "react";

export type LayoutStyle = "elegant" | "minimal" | "bold";

export interface SiteSettings {
  // Branding
  salonName: string;
  branchName: string;
  tagline: string;
  logoUrl: string;
  // Colors (hex)
  primary: string;
  accent: string;
  background: string;
  surface: string;
  // Layout
  layout: LayoutStyle;
  heroImage: string;
  gallery: string[];
  // Contact
  phone: string;
  address: string;
  hours: string;
  // WhatsApp
  waCountryCode: string; // e.g. "966"
  waNumber: string; // owner/broadcaster number without country code
  waTemplateBooking: string;
  waTemplateReminder: string;
  waTemplatePromo: string;
}

const KEY = "lamsa_site_settings_v1";

const defaults: SiteSettings = {
  salonName: "صالون لمسة",
  branchName: "فرع الروضة — الرياض",
  tagline: "جمالك يبدأ من هنا",
  logoUrl: "",
  primary: "#A78BFA",
  accent: "#F0ABFC",
  background: "#0F0B1F",
  surface: "#1E1533",
  layout: "elegant",
  heroImage: "",
  gallery: [],
  phone: "0501234567",
  address: "حي الروضة، شارع الأمير سلطان، الرياض",
  hours: "السبت - الخميس: 9ص - 11م",
  waCountryCode: "966",
  waNumber: "501234567",
  waTemplateBooking: "مرحبًا {name} 🌸\nتم تأكيد حجزك في {salon} بتاريخ {date} الساعة {time}.\nبانتظارك 💜",
  waTemplateReminder: "تذكير 💜 لديك موعد في {salon} غدًا الساعة {time}. نتشرّف بحضورك.",
  waTemplatePromo: "عرض خاص من {salon} 🎁 خصم حصري لعميلاتنا المميزات هذا الأسبوع فقط!",
};

let state: SiteSettings = defaults;
let initialized = false;
const listeners = new Set<() => void>();

function ensure() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...defaults, ...JSON.parse(raw) };
  } catch {}
}

function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function useSiteSettings(): SiteSettings {
  ensure();
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
}

export const siteActions = {
  update(patch: Partial<SiteSettings>) { state = { ...state, ...patch }; persist(); },
  addGalleryImage(url: string) { state = { ...state, gallery: [...state.gallery, url] }; persist(); },
  removeGalleryImage(idx: number) { state = { ...state, gallery: state.gallery.filter((_, i) => i !== idx) }; persist(); },
  reset() { state = defaults; persist(); },
};

// Helpers
export function waLink(phone: string, message: string, defaultCountry = "966") {
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("00")) p = p.slice(2);
  if (p.startsWith("0")) p = defaultCountry + p.slice(1);
  else if (!p.startsWith(defaultCountry) && p.length <= 10) p = defaultCountry + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
}

export function fillTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

/** Convert a hex string to inline CSS variable overrides using color-mix-friendly values. */
export function settingsToCssVars(s: SiteSettings): React.CSSProperties {
  return {
    // Override key theme tokens on this subtree
    ["--primary" as any]: s.primary,
    ["--primary-glow" as any]: s.accent,
    ["--accent" as any]: s.accent,
    ["--background" as any]: s.background,
    ["--card" as any]: s.surface,
    ["--sidebar" as any]: s.surface,
    ["--ring" as any]: s.primary,
  };
}
