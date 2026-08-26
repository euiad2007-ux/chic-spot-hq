/**
 * Visual theme of the platform's own marketing site (colors, fonts, button and
 * plan-card styles). Owner-editable from "هوية الموقع الرئيسي".
 */
export interface PlatformTheme {
  primary?: string;
  accent?: string;
  background?: string;
  foreground?: string;
  cardBg?: string;
  font?: string;
  buttonStyle?: string;
  planCardStyle?: string;
  radius?: string;
  /** Site name (brand) typography */
  brandFont?: string;
  brandColor?: string;
  brandGradient?: boolean;
  brandSize?: string;
  /** Logo height in the header, in pixels */
  logoHeight?: number;
  /** Text colors */
  headingColor?: string;
  mutedColor?: string;
  linkColor?: string;
  /** Opacity (0–100) applied to site images */
  imageOpacity?: number;
  heroImageOpacity?: number;
  /** Plan cards */
  planFont?: string;
  planTitleColor?: string;
  planPriceColor?: string;
  planCardBg?: string;
  planBorderColor?: string;
}

export const FONT_OPTIONS = [
  { code: "cairo", label: "Cairo (افتراضي)", family: "'Cairo', sans-serif", google: "Cairo:wght@400;600;800" },
  { code: "tajawal", label: "Tajawal", family: "'Tajawal', sans-serif", google: "Tajawal:wght@400;500;700;800" },
  { code: "almarai", label: "Almarai", family: "'Almarai', sans-serif", google: "Almarai:wght@400;700;800" },
  { code: "ibm-plex", label: "IBM Plex Sans Arabic", family: "'IBM Plex Sans Arabic', sans-serif", google: "IBM+Plex+Sans+Arabic:wght@400;600;700" },
  { code: "readex", label: "Readex Pro", family: "'Readex Pro', sans-serif", google: "Readex+Pro:wght@400;500;700" },
  { code: "rubik", label: "Rubik", family: "'Rubik', sans-serif", google: "Rubik:wght@400;600;800" },
  { code: "noto-kufi", label: "Noto Kufi Arabic", family: "'Noto Kufi Arabic', sans-serif", google: "Noto+Kufi+Arabic:wght@400;600;800" },
  { code: "changa", label: "Changa", family: "'Changa', sans-serif", google: "Changa:wght@400;600;800" },
  { code: "amiri", label: "Amiri (نسخ)", family: "'Amiri', serif", google: "Amiri:wght@400;700" },
  { code: "el-messiri", label: "El Messiri", family: "'El Messiri', sans-serif", google: "El+Messiri:wght@400;600;700" },
  { code: "lalezar", label: "Lalezar (عريض)", family: "'Lalezar', cursive", google: "Lalezar" },
  { code: "reem-kufi", label: "Reem Kufi", family: "'Reem Kufi', sans-serif", google: "Reem+Kufi:wght@400;600;700" },
  { code: "markazi", label: "Markazi Text", family: "'Markazi Text', serif", google: "Markazi+Text:wght@400;600;700" },
  { code: "harmattan", label: "Harmattan", family: "'Harmattan', sans-serif", google: "Harmattan:wght@400;700" },
  { code: "mada", label: "Mada", family: "'Mada', sans-serif", google: "Mada:wght@400;600;900" },
] as const;

export const BRAND_SIZES = [
  { code: "sm", label: "صغير", value: "1.05rem" },
  { code: "md", label: "متوسط", value: "1.25rem" },
  { code: "lg", label: "كبير", value: "1.6rem" },
  { code: "xl", label: "ضخم", value: "2rem" },
] as const;

export const BUTTON_STYLES = [
  { code: "gradient", label: "تدرّج لوني" },
  { code: "solid", label: "لون واحد" },
  { code: "outline", label: "إطار فقط" },
  { code: "pill", label: "كبسولة (تدرّج)" },
  { code: "soft", label: "ناعم شفاف" },
] as const;


export const PLAN_CARD_STYLES = [
  { code: "bordered", label: "إطار بسيط" },
  { code: "elevated", label: "بارزة بظل" },
  { code: "soft", label: "خلفية ناعمة" },
  { code: "gradient", label: "حدود متدرّجة" },
  { code: "glass", label: "زجاجية" },
] as const;

export const RADIUS_OPTIONS = [
  { code: "sm", label: "زوايا صغيرة", value: "0.5rem" },
  { code: "md", label: "متوسطة", value: "0.875rem" },
  { code: "lg", label: "كبيرة", value: "1.25rem" },
  { code: "xl", label: "دائرية جدًا", value: "1.75rem" },
] as const;

export function fontOption(code?: string) {
  return FONT_OPTIONS.find((f) => f.code === code) ?? FONT_OPTIONS[0];
}

/** Google Fonts stylesheet URL for the selected font, or null for the default. */
export function fontHref(code?: string): string | null {
  const f = fontOption(code);
  return `https://fonts.googleapis.com/css2?family=${f.google}&display=swap`;
}

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

function isColor(v?: string): v is string {
  return typeof v === "string" && HEX.test(v.trim());
}

function luminance(hex: string): number {
  let h = hex.trim().slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Readable text color for a given background. */
export function onColor(hex?: string): string {
  return isColor(hex) && luminance(hex) > 0.55 ? "#111111" : "#ffffff";
}

/** Inline CSS custom properties that re-theme the landing page. */
export function themeVars(theme?: PlatformTheme): React.CSSProperties {
  const t = theme ?? {};
  const vars: Record<string, string> = {};
  if (isColor(t.primary)) {
    vars["--primary"] = t.primary;
    vars["--ring"] = t.primary;
    vars["--primary-glow"] = isColor(t.accent) ? t.accent : t.primary;
    vars["--primary-foreground"] = onColor(t.primary);
  }
  if (isColor(t.accent)) {
    vars["--accent"] = t.accent;
    vars["--accent-foreground"] = onColor(t.accent);
  }
  if (isColor(t.background)) vars["--background"] = t.background;
  if (isColor(t.foreground)) vars["--foreground"] = t.foreground;
  if (isColor(t.cardBg)) {
    vars["--card"] = t.cardBg;
    vars["--popover"] = t.cardBg;
  }
  if (isColor(t.mutedColor)) vars["--muted-foreground"] = t.mutedColor;
  const radius = RADIUS_OPTIONS.find((r) => r.code === t.radius);
  if (radius) vars["--radius"] = radius.value;
  const family = fontOption(t.font).family;
  vars["--font-sans"] = family;
  vars["--font-display"] = family;
  return { ...vars, fontFamily: family } as React.CSSProperties;
}

/** Single Google Fonts URL covering every font the theme uses. */
export function themeFontsHref(theme?: PlatformTheme): string {
  const codes = [theme?.font, theme?.brandFont, theme?.planFont];
  const families = Array.from(new Set(codes.map((c) => fontOption(c).google)));
  return `https://fonts.googleapis.com/css2?${families
    .map((f) => `family=${f}`)
    .join("&")}&display=swap`;
}

/** Typography of the site name in the header. */
export function brandNameStyle(theme?: PlatformTheme): React.CSSProperties {
  const t = theme ?? {};
  const size = BRAND_SIZES.find((s) => s.code === t.brandSize)?.value ?? BRAND_SIZES[1].value;
  const style: React.CSSProperties = {
    fontFamily: fontOption(t.brandFont ?? t.font).family,
    fontSize: size,
    lineHeight: 1.2,
  };
  if (isColor(t.brandColor)) style.color = t.brandColor;
  return style;
}

/** True when the site name should keep the gradient treatment. */
export function brandUsesGradient(theme?: PlatformTheme): boolean {
  return theme?.brandGradient !== false && !isColor(theme?.brandColor);
}

/** Header logo height. */
export function logoStyle(theme?: PlatformTheme): React.CSSProperties {
  const h = theme?.logoHeight;
  const px = typeof h === "number" && h >= 20 && h <= 160 ? h : 44;
  return { height: `${px}px` };
}

/** Opacity applied to decorative site images. */
export function imageOpacityStyle(
  theme?: PlatformTheme,
  kind: "hero" | "section" = "section",
): React.CSSProperties {
  const raw = kind === "hero" ? theme?.heroImageOpacity : theme?.imageOpacity;
  if (typeof raw !== "number" || raw < 0 || raw > 100) return {};
  return { opacity: raw / 100 };
}

/** Colors and font applied inside plan cards. */
export function planCardStyleVars(theme?: PlatformTheme): React.CSSProperties {
  const t = theme ?? {};
  const vars: Record<string, string> = {};
  if (isColor(t.planCardBg)) {
    vars["--card"] = t.planCardBg;
    vars["--foreground"] = onColor(t.planCardBg) === "#111111" ? "#111111" : "#ffffff";
  }
  if (isColor(t.planBorderColor)) vars["--border"] = t.planBorderColor;
  const style: Record<string, string> = { ...vars };
  if (t.planFont) style["fontFamily"] = fontOption(t.planFont).family;
  return style as React.CSSProperties;
}

/** Inline color for a plan's name. */
export function planTitleStyle(theme?: PlatformTheme): React.CSSProperties {
  return isColor(theme?.planTitleColor) ? { color: theme!.planTitleColor } : {};
}

/** Inline color for a plan's price. */
export function planPriceStyle(theme?: PlatformTheme): React.CSSProperties {
  return isColor(theme?.planPriceColor) ? { color: theme!.planPriceColor } : {};
}


/** Classes for the primary call-to-action button in the chosen style. */
export function primaryButtonClass(theme?: PlatformTheme): string {
  const rounded = theme?.buttonStyle === "pill" ? "rounded-full" : "rounded-xl";
  switch (theme?.buttonStyle) {
    case "solid":
      return `${rounded} bg-primary text-primary-foreground font-bold`;
    case "outline":
      return `${rounded} border-2 border-primary text-primary font-bold hover:bg-primary/10`;
    case "soft":
      return `${rounded} bg-primary/15 text-primary font-bold hover:bg-primary/25`;
    case "pill":
    case "gradient":
    default:
      return `${rounded} bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold`;
  }
}

/** Classes for the secondary button, matched to the primary style. */
export function secondaryButtonClass(theme?: PlatformTheme): string {
  const rounded = theme?.buttonStyle === "pill" ? "rounded-full" : "rounded-xl";
  return `${rounded} border border-border font-semibold hover:bg-muted bg-background/70`;
}

/** Classes for one plan card in the chosen style. */
export function planCardClass(style?: string, highlighted?: boolean): string {
  const base = "rounded-2xl p-5 space-y-4 ";
  const ring = highlighted ? " ring-2 ring-primary" : "";
  switch (style) {
    case "elevated":
      return `${base}bg-card border border-border shadow-[0_18px_45px_-25px_color-mix(in_oklab,var(--primary)_45%,transparent)]${ring}`;
    case "soft":
      return `${base}bg-primary/5 border border-primary/20${ring}`;
    case "gradient":
      return `${base}bg-card border-2 border-transparent [background:linear-gradient(var(--card),var(--card))_padding-box,linear-gradient(135deg,var(--primary),var(--accent))_border-box]${ring}`;
    case "glass":
      return `${base}glass-card${ring}`;
    case "bordered":
    default:
      return `${base}bg-card border border-border${ring}`;
  }
}
