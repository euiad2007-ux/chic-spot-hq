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
}

export const FONT_OPTIONS = [
  { code: "cairo", label: "Cairo (افتراضي)", family: "'Cairo', sans-serif", google: "Cairo:wght@400;600;800" },
  { code: "tajawal", label: "Tajawal", family: "'Tajawal', sans-serif", google: "Tajawal:wght@400;500;700;800" },
  { code: "almarai", label: "Almarai", family: "'Almarai', sans-serif", google: "Almarai:wght@400;700;800" },
  { code: "ibm-plex", label: "IBM Plex Sans Arabic", family: "'IBM Plex Sans Arabic', sans-serif", google: "IBM+Plex+Sans+Arabic:wght@400;600;700" },
  { code: "readex", label: "Readex Pro", family: "'Readex Pro', sans-serif", google: "Readex+Pro:wght@400;500;700" },
  { code: "rubik", label: "Rubik", family: "'Rubik', sans-serif", google: "Rubik:wght@400;600;800" },
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
  const radius = RADIUS_OPTIONS.find((r) => r.code === t.radius);
  if (radius) vars["--radius"] = radius.value;
  const family = fontOption(t.font).family;
  vars["--font-sans"] = family;
  vars["--font-display"] = family;
  return { ...vars, fontFamily: family } as React.CSSProperties;
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
