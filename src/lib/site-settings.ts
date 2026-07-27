import { useSyncExternalStore } from "react";
import heroImg from "@/assets/showcase/hero.jpg";
import hair1 from "@/assets/showcase/hair-1.jpg";
import hair2 from "@/assets/showcase/hair-2.jpg";
import makeup1 from "@/assets/showcase/makeup-1.jpg";
import makeup2 from "@/assets/showcase/makeup-2.jpg";
import nails1 from "@/assets/showcase/nails-1.jpg";
import spa1 from "@/assets/showcase/spa-1.jpg";

export type LayoutStyle = "elegant" | "minimal" | "bold";

export interface ShowcaseItem {
  label: string;
  url: string;
}

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
  // Showcase (beauty categories with images)
  showcase: ShowcaseItem[];
  // Contact
  phone: string;
  address: string;
  hours: string;
  // WhatsApp
  waCountryCode: string;
  waNumber: string;
  waTemplateBooking: string;
  waTemplateReminder: string;
  waTemplatePromo: string;
}

const KEY = "lamsa_site_settings_v3";

const defaults: SiteSettings = {
  salonName: "صالون لمسة",
  branchName: "فرع الروضة — الرياض",
  tagline: "جمالك يبدأ من هنا",
  logoUrl: "",
  primary: "#A855F7",
  accent: "#F0ABFC",
  background: "#FAF5FF",
  surface: "#FFFFFF",
  layout: "elegant",
  heroImage: heroImg,
  gallery: [],
  showcase: [
    { label: "تصفيف الشعر", url: hair1 },
    { label: "تسريحات العرائس", url: hair2 },
    { label: "المكياج", url: makeup1 },
    { label: "مكياج عرائس", url: makeup2 },
    { label: "العناية بالأظافر", url: nails1 },
    { label: "العناية بالبشرة", url: spa1 },
  ],
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
  updateShowcase(idx: number, patch: Partial<ShowcaseItem>) {
    state = { ...state, showcase: state.showcase.map((it, i) => i === idx ? { ...it, ...patch } : it) };
    persist();
  },
  addShowcase(item: ShowcaseItem) { state = { ...state, showcase: [...state.showcase, item] }; persist(); },
  removeShowcase(idx: number) { state = { ...state, showcase: state.showcase.filter((_, i) => i !== idx) }; persist(); },
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
