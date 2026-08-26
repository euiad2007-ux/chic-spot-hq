import { useSyncExternalStore } from "react";
import heroImg from "@/assets/showcase/hero.jpg";
import hair1 from "@/assets/showcase/hair-1.jpg";
import hair2 from "@/assets/showcase/hair-2.jpg";
import makeup1 from "@/assets/showcase/makeup-1.jpg";
import makeup2 from "@/assets/showcase/makeup-2.jpg";
import nails1 from "@/assets/showcase/nails-1.jpg";
import spa1 from "@/assets/showcase/spa-1.jpg";

export type LayoutStyle = "elegant" | "minimal" | "bold" | "luxe";
export type HeroAlign = "right" | "center" | "left";
export type ButtonShape = "rounded" | "pill" | "square";
export type BookingMode = "internal" | "whatsapp" | "call" | "link";
export type SectionId = "showcase" | "services" | "gallery" | "team" | "reviews" | "contact";
export type HeroButtonKind = "booking" | "whatsapp" | "services" | "call" | "link";

export const SECTION_LABELS: Record<SectionId, string> = {
  showcase: "لمساتنا",
  services: "الخدمات",
  gallery: "معرض الأعمال",
  team: "فريق العمل",
  reviews: "التقييمات",
  contact: "التواصل",
};

export interface HeroButton {
  label: string;
  kind: HeroButtonKind;
  url?: string;
}

export interface GalleryItem {
  url: string;
  title: string;
  category: string;
  /** Optional "before" photo — when set the card renders a before/after comparison. */
  beforeUrl?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  photo: string;
  instagram: string;
}

export type PaymentMethodId =
  | "visa"
  | "mastercard"
  | "mada"
  | "applepay"
  | "googlepay"
  | "amex"
  | "stcpay"
  | "cash";

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
  // Payment methods shown on the public site
  paymentMethods: PaymentMethodId[];
  // Identity extras
  faviconUrl: string;
  buttonShape: ButtonShape;
  fontScale: number; // 0.9 – 1.25
  // Hero
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  heroAlign: HeroAlign;
  heroHeight: number; // vh
  heroOverlay: number; // 0 – 90
  heroButtons: HeroButton[];
  /** Main hero call-to-action (rendered first when set). */
  heroCtaLabel: string;
  heroCtaUrl: string;
  /** Hero customisation remembered per theme id. */
  themeHero: Record<string, Partial<HeroTheme>>;
  // Section content
  showcaseTitle: string;
  showcaseDesc: string;
  servicesTitle: string;
  servicesDesc: string;
  servicesShowPrice: boolean;
  galleryTitle: string;
  galleryDesc: string;
  galleryItems: GalleryItem[];
  teamTitle: string;
  teamDesc: string;
  team: TeamMember[];
  reviewsTitle: string;
  reviewsDesc: string;
  contactTitle: string;
  contactDesc: string;
  footerText: string;
  // Sections visibility & order
  sectionOrder: SectionId[];
  hiddenSections: SectionId[];
  // Contact & social
  email: string;
  mapsUrl: string;
  instagram: string;
  snapchat: string;
  tiktok: string;
  xLink: string;
  facebook: string;
  // Booking behaviour
  bookingMode: BookingMode;
  bookingUrl: string;
  bookingLabel: string;
  // SEO
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  // Media library (reusable uploads)
  media: string[];
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
/** Hero fields that are remembered per theme (style) instead of globally. */
export interface HeroTheme {
  heroImage: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroCtaUrl: string;
  heroOverlay: number;
  heroAlign: HeroAlign;
  heroHeight: number;
}

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
  /** Default hero look shipped with the style (overridable, saved per theme). */
  hero?: Partial<HeroTheme>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "rose-luxe",
    name: "لمسة فاخرة (جديد)",
    desc: "صورة كبيرة بالشعار والاسم + بطاقات خدمات أنيقة",
    layout: "luxe",
    primary: "#EC4899", accent: "#FBCFE8", background: "#FFF1F7", surface: "#FFFFFF",
    textColor: "#4A1D3A", mutedTextColor: "#9D5A82",
    headingFont: "amiri", bodyFont: "readex",
    hero: {
      heroImage: makeup1,
      heroSubtitle: "تجربة تجميل فاخرة بأيدي أخصائيات معتمدات — احجزي لمستك الخاصة الآن.",
      heroCtaLabel: "احجزي لمستك",
      heroAlign: "center",
      heroOverlay: 52,
      heroHeight: 92,
    },
  },
  {
    id: "royal-purple",
    name: "بنفسجي ملكي",
    desc: "أنيق راقٍ بتدرّجات بنفسجية",
    layout: "elegant",
    primary: "#A855F7", accent: "#F0ABFC", background: "#FAF5FF", surface: "#FFFFFF",
    textColor: "#1E1B4B", mutedTextColor: "#6B5B95",
    headingFont: "cairo", bodyFont: "cairo",
    hero: { heroImage: heroImg, heroOverlay: 55, heroAlign: "center", heroHeight: 88 },
  },
  {
    id: "gold-luxury",
    name: "ذهبي فاخر",
    desc: "لمسة كلاسيكية بذهبي دافئ وخط رقعي",
    layout: "elegant",
    primary: "#C9A24C", accent: "#F5DEB3", background: "#FFFBEB", surface: "#FFFFFF",
    textColor: "#3F2E00", mutedTextColor: "#8A7431",
    headingFont: "amiri", bodyFont: "tajawal",
    hero: { heroImage: hair2, heroOverlay: 58, heroAlign: "right", heroHeight: 86 },
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

const UNUSED_KEY = "lamsa_site_settings_v4";

const defaults: SiteSettings = {
  salonName: "الصالون",
  branchName: "",
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
  paymentMethods: ["mada", "visa", "mastercard", "applepay", "googlepay", "stcpay", "amex", "cash"],
  faviconUrl: "",
  buttonShape: "rounded",
  fontScale: 1,
  heroTitle: "جمالك",
  heroHighlight: "بأسلوبك",
  heroSubtitle: "احجزي خدمات الشعر والمكياج والعناية بالبشرة والأظافر في دقائق — أخصائيات معتمدات وأجواء راقية بانتظارك.",
  heroAlign: "center",
  heroHeight: 88,
  heroOverlay: 55,
  heroButtons: [
    { kind: "booking", label: "احجزي موعد" },
    { kind: "whatsapp", label: "تواصلي عبر واتساب" },
    { kind: "services", label: "تصفحي خدماتنا" },
  ],
  heroCtaLabel: "",
  heroCtaUrl: "",
  themeHero: {},
  showcaseTitle: "لمسات من إبداعنا",
  showcaseDesc: "تصفيفات شعر، مكياج، وعناية شاملة بأيدي محترفات",
  servicesTitle: "خدماتنا",
  servicesDesc: "مجموعة كاملة من خدمات التجميل الفاخرة",
  servicesShowPrice: true,
  galleryTitle: "معرض أعمالنا",
  galleryDesc: "لقطات من أجوائنا وأعمالنا",
  galleryItems: [],
  teamTitle: "فريقنا",
  teamDesc: "أخصائيات خبيرات لخدمتك",
  team: [],
  reviewsTitle: "تقييمات عميلاتنا",
  reviewsDesc: "آراء حقيقية من عميلات أكملن مواعيدهن معنا",
  contactTitle: "تواصلي معنا",
  contactDesc: "نحن هنا للإجابة على استفساراتك وحجز موعدك",
  footerText: "جميع الحقوق محفوظة",
  sectionOrder: ["showcase", "services", "gallery", "team", "reviews", "contact"],
  hiddenSections: [],
  email: "",
  mapsUrl: "",
  instagram: "",
  snapchat: "",
  tiktok: "",
  xLink: "",
  facebook: "",
  bookingMode: "internal",
  bookingUrl: "",
  bookingLabel: "احجزي الآن",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "صالون تجميل, حجز مواعيد, مكياج, تصفيف شعر, عناية بالبشرة",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  media: [heroImg, hair1, hair2, makeup1, makeup2, nails1, spa1],
};


let state: SiteSettings = defaults;
let initialized = false;
let hydrated = false;
const listeners = new Set<() => void>();

let measures: { code: string; label: string }[] = [];

function ensure() {
  initialized = true;
}

let dirty = false;
const dirtyListeners = new Set<() => void>();

function setDirty(v: boolean) {
  if (dirty === v) return;
  dirty = v;
  dirtyListeners.forEach((l) => l());
}

/** True when local branding edits have not been written to the database yet. */
export function useSiteDirty(): boolean {
  return useSyncExternalStore(
    (l) => {
      dirtyListeners.add(l);
      return () => dirtyListeners.delete(l);
    },
    () => dirty,
    () => false,
  );
}

/** Writes the branding document now and reports failures to the caller. */
export async function saveSiteSettingsNow(): Promise<void> {
  const m = await import("@/lib/db/settings-repo");
  await m.saveSettingsNow("site", { ...state, measures });
  setDirty(false);
}

function persist() {
  listeners.forEach((l) => l());
  if (typeof window === "undefined") return;
  setDirty(true);
  const doc = { ...state, measures };
  void import("@/lib/db/settings-repo").then((m) => m.scheduleSettingsSave("site", doc));
}

/** Called once by the data layer with the salon's stored branding document. */
export function hydrateSiteSettings(doc: Record<string, unknown> | null) {
  if (doc) {
    const { measures: storedMeasures, ...rest } = doc as Record<string, unknown> & {
      measures?: { code: string; label: string }[];
    };
    state = { ...defaults, ...(rest as Partial<SiteSettings>) };
    measures = Array.isArray(storedMeasures) ? storedMeasures : [];
  } else {
    state = defaults;
    measures = [];
  }
  initialized = true;
  hydrated = true;
  setDirty(false);
  listeners.forEach((l) => l());
}

export function getSiteSettings(): SiteSettings {
  return state;
}

export function getCustomMeasures(): { code: string; label: string }[] {
  return measures;
}

export function setCustomMeasures(next: { code: string; label: string }[]) {
  measures = next;
  persist();
}

export function useSiteSettings(): SiteSettings {
  return useSyncExternalStore(
    (l) => {
      ensure();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (hydrated ? state : defaults),
    () => defaults,
  );
}

/** True only after the current salon's saved settings have been applied. */
export function useSiteSettingsReady(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => hydrated,
    () => false,
  );
}

function readHexChannel(hex: string, start: number): number | null {
  const part = hex.slice(start, start + 2);
  if (part.length !== 2) return null;
  const parsed = Number.parseInt(part, 16);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split("").map((c) => c + c).join("")}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`;
  return null;
}

function hexToRgb(input: string): { r: number; g: number; b: number } | null {
  const hex = normalizeHex(input);
  if (!hex) return null;
  const r = readHexChannel(hex, 1);
  const g = readHexChannel(hex, 3);
  const b = readHexChannel(hex, 5);
  if (r === null || g === null || b === null) return null;
  return { r, g, b };
}

function channelToLinear(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function luminance(input: string): number | null {
  const rgb = hexToRgb(input);
  if (!rgb) return null;
  return 0.2126 * channelToLinear(rgb.r) + 0.7152 * channelToLinear(rgb.g) + 0.0722 * channelToLinear(rgb.b);
}

function contrastRatio(a: string, b: string): number | null {
  const left = luminance(a);
  const right = luminance(b);
  if (left === null || right === null) return null;
  const lighter = Math.max(left, right);
  const darker = Math.min(left, right);
  return (lighter + 0.05) / (darker + 0.05);
}

function mixHex(a: string, b: string, ratio = 0.5): string | null {
  const left = hexToRgb(a);
  const right = hexToRgb(b);
  if (!left || !right) return null;
  const amount = Math.min(1, Math.max(0, ratio));
  const toHex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  const r = left.r * (1 - amount) + right.r * amount;
  const g = left.g * (1 - amount) + right.g * amount;
  const bl = left.b * (1 - amount) + right.b * amount;
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

function readableTextOn(background: string, fallback = "#FFFFFF"): string {
  const l = luminance(background);
  if (l === null) return fallback;
  return l > 0.58 ? "#231724" : "#FFFFFF";
}

function readableBrandText(brand: string, background: string, fallback: string): string {
  const ratio = contrastRatio(brand, background);
  if (ratio !== null && ratio >= 4.5) return brand;
  return fallback || readableTextOn(background, "#231724");
}


export const siteActions = {
  update(patch: Partial<SiteSettings>) { state = { ...state, ...patch, themePreset: patch.themePreset ?? "custom" }; persist(); },
  /** Hero edits stay attached to the active theme, so switching styles restores them. */
  updateHero(patch: Partial<HeroTheme>) {
    const key = state.themePreset || "custom";
    const saved = state.themeHero?.[key] ?? {};
    state = {
      ...state,
      ...patch,
      themeHero: { ...(state.themeHero ?? {}), [key]: { ...saved, ...patch } },
    };
    persist();
  },
  applyPreset(id: string) {
    const p = THEME_PRESETS.find((x) => x.id === id);
    if (!p) return;
    const hero: Partial<HeroTheme> = { ...(p.hero ?? {}), ...(state.themeHero?.[p.id] ?? {}) };
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
      ...hero,
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
  moveShowcase(idx: number, dir: -1 | 1) { state = { ...state, showcase: swap(state.showcase, idx, idx + dir) }; persist(); },

  /* Media library */
  addMedia(urls: string[]) {
    const next = [...state.media];
    urls.forEach((u) => { if (u && !next.includes(u)) next.unshift(u); });
    state = { ...state, media: next };
    persist();
  },
  removeMedia(url: string) { state = { ...state, media: state.media.filter((u) => u !== url) }; persist(); },

  /* Gallery items */
  addGalleryItem(item: GalleryItem) { state = { ...state, galleryItems: [...state.galleryItems, item] }; persist(); },
  updateGalleryItem(idx: number, patch: Partial<GalleryItem>) {
    state = { ...state, galleryItems: state.galleryItems.map((it, i) => (i === idx ? { ...it, ...patch } : it)) };
    persist();
  },
  removeGalleryItem(idx: number) { state = { ...state, galleryItems: state.galleryItems.filter((_, i) => i !== idx) }; persist(); },
  moveGalleryItem(idx: number, dir: -1 | 1) { state = { ...state, galleryItems: swap(state.galleryItems, idx, idx + dir) }; persist(); },

  /* Team */
  addTeamMember(m: TeamMember) { state = { ...state, team: [...state.team, m] }; persist(); },
  updateTeamMember(idx: number, patch: Partial<TeamMember>) {
    state = { ...state, team: state.team.map((it, i) => (i === idx ? { ...it, ...patch } : it)) };
    persist();
  },
  removeTeamMember(idx: number) { state = { ...state, team: state.team.filter((_, i) => i !== idx) }; persist(); },
  moveTeamMember(idx: number, dir: -1 | 1) { state = { ...state, team: swap(state.team, idx, idx + dir) }; persist(); },

  /* Hero buttons */
  addHeroButton(b: HeroButton) { state = { ...state, heroButtons: [...state.heroButtons, b] }; persist(); },
  updateHeroButton(idx: number, patch: Partial<HeroButton>) {
    state = { ...state, heroButtons: state.heroButtons.map((it, i) => (i === idx ? { ...it, ...patch } : it)) };
    persist();
  },
  removeHeroButton(idx: number) { state = { ...state, heroButtons: state.heroButtons.filter((_, i) => i !== idx) }; persist(); },

  /* Sections */
  toggleSection(id: SectionId) {
    const hidden = state.hiddenSections.includes(id)
      ? state.hiddenSections.filter((x) => x !== id)
      : [...state.hiddenSections, id];
    state = { ...state, hiddenSections: hidden };
    persist();
  },
  moveSection(idx: number, dir: -1 | 1) { state = { ...state, sectionOrder: swap(state.sectionOrder, idx, idx + dir) }; persist(); },

  reset() { state = defaults; persist(); },
};

function swap<T>(arr: T[], a: number, b: number): T[] {
  if (a < 0 || b < 0 || a >= arr.length || b >= arr.length) return arr;
  const next = [...arr];
  const tmp = next[a]!;
  next[a] = next[b]!;
  next[b] = tmp;
  return next;
}


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
  const brandBlend = mixHex(s.primary, s.accent, 0.45) ?? s.primary;
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
    ["--brand-foreground" as any]: readableTextOn(brandBlend),
    ["--brand-text" as any]: readableBrandText(s.primary, s.background, s.textColor),
    ["--brand-surface-text" as any]: readableBrandText(s.primary, s.surface, s.textColor),
    ["--primary-contrast" as any]: readableTextOn(s.primary),
    ["--accent-contrast" as any]: readableTextOn(s.accent, s.textColor),
    ["--btn-radius" as any]: buttonRadius(s.buttonShape),
    fontSize: `${Math.min(1.3, Math.max(0.85, s.fontScale || 1))}rem`,
    backgroundColor: s.background,
    color: s.textColor,
    fontFamily: body,
  } as React.CSSProperties;
}

export function buttonRadius(shape: ButtonShape): string {
  return shape === "pill" ? "9999px" : shape === "square" ? "6px" : "14px";
}

/** Gallery items, migrating legacy string-only galleries. */
export function galleryOf(s: SiteSettings): GalleryItem[] {
  if (s.galleryItems.length) return s.galleryItems;
  return s.gallery.map((url) => ({ url, title: "", category: "" }));
}

const ALL_SECTIONS: SectionId[] = ["showcase", "services", "gallery", "team", "reviews", "contact"];

/** Visible sections in the configured order (newer sections are appended). */
export function visibleSections(s: SiteSettings): SectionId[] {
  const order = s.sectionOrder.length ? s.sectionOrder : ALL_SECTIONS;
  const merged = [...order, ...ALL_SECTIONS.filter((id) => !order.includes(id))];
  return merged.filter((id) => !s.hiddenSections.includes(id));
}

/** Social links present in settings, ready to render. */
export function socialLinks(s: SiteSettings): { id: string; label: string; url: string }[] {
  return [
    { id: "instagram", label: "Instagram", url: s.instagram },
    { id: "snapchat", label: "Snapchat", url: s.snapchat },
    { id: "tiktok", label: "TikTok", url: s.tiktok },
    { id: "x", label: "X", url: s.xLink },
    { id: "facebook", label: "Facebook", url: s.facebook },
  ].filter((x) => !!x.url);
}


/** Build a Google Fonts URL loading all fonts referenced by the settings. */
export function googleFontsHref(s: SiteSettings): string {
  const ids = new Set([s.headingFont, s.bodyFont]);
  const families = Array.from(ids).map((id) => fontById(id).google);
  const params = families.map((f) => `family=${f}`).join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}
