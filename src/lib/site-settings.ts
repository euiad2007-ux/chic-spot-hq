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
  textColor: string;
  mutedTextColor: string;
  // Fonts
  headingFont: string; // id from FONT_OPTIONS
  bodyFont: string;
  // Layout
  layout: LayoutStyle;
  themePreset: string; // id from THEME_PRESETS or "custom"
  heroImage: string;
  gallery: string[];
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

/* ---------------- Fonts ---------------- */
export interface FontOption {
  id: string;
  name: string;
  family: string;
  google: string; // Google fonts spec after "family="
  serif?: boolean;
}

export const FONT_OPTIONS: FontOption[] = [
  { id: "cairo", name: "Cairo", family: "'Cairo', system-ui, sans-serif", google: "Cairo:wght@400;500;600;700;800;900" },
  { id: "tajawal", name: "Tajawal", family: "'Tajawal', system-ui, sans-serif", google: "Tajawal:wght@400;500;700;800;900" },
  { id: "almarai", name: "Almarai", family: "'Almarai', system-ui, sans-serif", google: "Almarai:wght@400;700;800" },
  { id: "readex", name: "Readex Pro", family: "'Readex Pro', system-ui, sans-serif", google: "Readex+Pro:wght@400;500;600;700" },
  { id: "rubik", name: "Rubik", family: "'Rubik', system-ui, sans-serif", google: "Rubik:wght@400;500;700;800;900" },
  { id: "ibmarabic", name: "IBM Plex Arabic", family: "'IBM Plex Sans Arabic', system-ui, sans-serif", google: "IBM+Plex+Sans+Arabic:wght@400;500;600;700" },
  { id: "notokufi", name: "Noto Kufi", family: "'Noto Kufi Arabic', system-ui, sans-serif", google: "Noto+Kufi+Arabic:wght@400;600;700;800;900" },
  { id: "amiri", name: "Amiri (رقعي)", family: "'Amiri', 'Cairo', serif", google: "Amiri:wght@400;700", serif: true },
  { id: "reemkufi", name: "Reem Kufi", family: "'Reem Kufi', 'Cairo', sans-serif", google: "Reem+Kufi:wght@400;500;600;700" },
  { id: "elmessiri", name: "El Messiri", family: "'El Messiri', 'Cairo', sans-serif", google: "El+Messiri:wght@400;500;600;700" },
];

export function fontById(id: string): FontOption {
  return FONT_OPTIONS.find((f) => f.id === id) ?? FONT_OPTIONS[0];
}

/* ---------------- Theme presets ---------------- */
export interface ThemePreset {
  id: string;
  name: string;
  desc: string;
  layout: LayoutStyle;
  primary: string;
  accent: string;
  background: string;
  surface: string;
  textColor: string;
  mutedTextColor: string;
  headingFont: string;
  bodyFont: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "royal-purple",
    name: "بنفسجي ملكي",
    desc: "أنيق راقٍ بتدرّجات بنفسجية",
    layout: "elegant",
    primary: "#A855F7", accent: "#F0ABFC", background: "#FAF5FF", surface: "#FFFFFF",
    textColor: "#1E1B4B", mutedTextColor: "#6B5B95",
    headingFont: "cairo", bodyFont: "cairo",
  },
  {
    id: "gold-luxury",
    name: "ذهبي فاخر",
    desc: "لمسة كلاسيكية بذهبي دافئ وخط رقعي",
    layout: "elegant",
    primary: "#C9A24C", accent: "#F5DEB3", background: "#FFFBEB", surface: "#FFFFFF",
    textColor: "#3F2E00", mutedTextColor: "#8A7431",
    headingFont: "amiri", bodyFont: "tajawal",
  },
  {
    id: "rose-soft",
    name: "وردي حالم",
    desc: "نعومة ورومنسية بلمسة عروسية",
    layout: "minimal",
    primary: "#EC4899", accent: "#FBCFE8", background: "#FFF1F7", surface: "#FFFFFF",
    textColor: "#4A1D3A", mutedTextColor: "#9D5A82",
    headingFont: "elmessiri", bodyFont: "readex",
  },
  {
    id: "emerald-fresh",
    name: "زمردي منعش",
    desc: "طبيعي وهادئ لسبا والعناية",
    layout: "minimal",
    primary: "#10B981", accent: "#A7F3D0", background: "#ECFDF5", surface: "#FFFFFF",
    textColor: "#043330", mutedTextColor: "#3B7A6A",
    headingFont: "almarai", bodyFont: "cairo",
  },
  {
    id: "sky-modern",
    name: "أزرق حديث",
    desc: "مودرن نظيف بحس تقني",
    layout: "bold",
    primary: "#3B82F6", accent: "#93C5FD", background: "#EFF6FF", surface: "#FFFFFF",
    textColor: "#0B1E3F", mutedTextColor: "#4B6280",
    headingFont: "rubik", bodyFont: "ibmarabic",
  },
  {
    id: "nude-warm",
    name: "نيود دافئ",
    desc: "ألوان ترابية هادئة وأنثوية",
    layout: "elegant",
    primary: "#C08457", accent: "#F5DEB3", background: "#FFF8F0", surface: "#FFFFFF",
    textColor: "#3A2418", mutedTextColor: "#8A6A55",
    headingFont: "notokufi", bodyFont: "tajawal",
  },
  {
    id: "midnight-glow",
    name: "ليلي فاخر",
    desc: "خلفية داكنة مع توهج بنفسجي/سماوي",
    layout: "bold",
    primary: "#A78BFA", accent: "#22D3EE", background: "#0F0B1F", surface: "#1E1533",
    textColor: "#F5F3FF", mutedTextColor: "#A5A0C7",
    headingFont: "cairo", bodyFont: "cairo",
  },
  {
    id: "sunset",
    name: "غروب دافئ",
    desc: "برتقالي ذهبي بحضور جريء",
    layout: "bold",
    primary: "#F97316", accent: "#FBBF24", background: "#FFF7ED", surface: "#FFFFFF",
    textColor: "#431407", mutedTextColor: "#8B4A20",
    headingFont: "rubik", bodyFont: "tajawal",
  },
  {
    id: "mono-editorial",
    name: "مجلة مينيمال",
    desc: "أبيض وأسود بذوق تحريري راقٍ",
    layout: "minimal",
    primary: "#111111", accent: "#B0B0B0", background: "#FAFAFA", surface: "#FFFFFF",
    textColor: "#111111", mutedTextColor: "#5A5A5A",
    headingFont: "reemkufi", bodyFont: "ibmarabic",
  },
];

const KEY = "lamsa_site_settings_v4";

const defaults: SiteSettings = {
  salonName: "صالون لمسة",
  branchName: "فرع الروضة — الرياض",
  tagline: "جمالك يبدأ من هنا",
  logoUrl: "",
  primary: "#A855F7",
  accent: "#F0ABFC",
  background: "#FAF5FF",
  surface: "#FFFFFF",
  textColor: "#1E1B4B",
  mutedTextColor: "#6B5B95",
  headingFont: "cairo",
  bodyFont: "cairo",
  layout: "elegant",
  themePreset: "royal-purple",
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
  update(patch: Partial<SiteSettings>) { state = { ...state, ...patch, themePreset: patch.themePreset ?? "custom" }; persist(); },
  applyPreset(id: string) {
    const p = THEME_PRESETS.find((x) => x.id === id);
    if (!p) return;
    state = {
      ...state,
      themePreset: p.id,
      layout: p.layout,
      primary: p.primary,
      accent: p.accent,
      background: p.background,
      surface: p.surface,
      textColor: p.textColor,
      mutedTextColor: p.mutedTextColor,
      headingFont: p.headingFont,
      bodyFont: p.bodyFont,
    };
    persist();
  },
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

/** Convert settings to inline CSS variable overrides applied on the site subtree. */
export function settingsToCssVars(s: SiteSettings): React.CSSProperties {
  const heading = fontById(s.headingFont).family;
  const body = fontById(s.bodyFont).family;
  return {
    ["--primary" as any]: s.primary,
    ["--primary-glow" as any]: s.accent,
    ["--accent" as any]: s.accent,
    ["--background" as any]: s.background,
    ["--card" as any]: s.surface,
    ["--sidebar" as any]: s.surface,
    ["--ring" as any]: s.primary,
    ["--foreground" as any]: s.textColor,
    ["--muted-foreground" as any]: s.mutedTextColor,
    ["--font-sans" as any]: body,
    ["--font-display" as any]: heading,
    backgroundColor: s.background,
    color: s.textColor,
    fontFamily: body,
  } as React.CSSProperties;
}

/** Build a Google Fonts URL loading all fonts referenced by the settings. */
export function googleFontsHref(s: SiteSettings): string {
  const ids = new Set([s.headingFont, s.bodyFont]);
  const families = Array.from(ids).map((id) => fontById(id).google);
  const params = families.map((f) => `family=${f}`).join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
