import { createFileRoute } from "@tanstack/react-router";
import { useSalon, formatSAR } from "@/lib/salon-store";
import {
  useSiteSettings,
  settingsToCssVars,
  waLink,
  googleFontsHref,
  galleryOf,
  visibleSections,
  socialLinks,
  type SiteSettings,
  type HeroButton,
  type SectionId,
} from "@/lib/site-settings";
import {
  Scissors, Sparkles, Clock, MapPin, Phone, Star, LogIn, CalendarDays, MessageCircle,
  ShieldCheck, IdCard, Mail, X as XIcon, ChevronLeft, ChevronRight, Instagram, Menu, ArrowLeft,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PaymentIcon } from "@/components/salon/payment-icons";
import { SiteLink, LoginLink } from "@/components/salon/salon-nav-links";
import { SiteAssistant } from "@/components/salon/site-assistant";
import type { PublicBranding, PublicReview, PublicSalonMeta } from "@/lib/db/public-hydrate";
import { SalonBrandedLoader } from "@/components/salon/salon-loader";


/* ---------------- head assets ---------------- */

function useHeadLink(id: string, rel: string, href: string) {
  useEffect(() => {
    if (typeof document === "undefined" || !href) return;
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = rel;
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }, [id, rel, href]);
}

/** Applies dashboard-managed SEO metadata to the live document. */
function useSeo(s: SiteSettings, enabled: boolean) {
  useEffect(() => {
    if (typeof document === "undefined" || !enabled) return;
    const title = s.seoTitle || `${s.salonName} — ${s.tagline}`;
    document.title = title;
    const set = (sel: string, attr: "name" | "property", key: string, content: string) => {
      if (!content) return;
      let el = document.head.querySelector<HTMLMetaElement>(sel);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.content = content;
    };
    set('meta[name="description"]', "name", "description", s.seoDescription || s.heroSubtitle);
    set('meta[name="keywords"]', "name", "keywords", s.seoKeywords);
    set('meta[property="og:title"]', "property", "og:title", s.ogTitle || title);
    set('meta[property="og:description"]', "property", "og:description", s.ogDescription || s.seoDescription || s.heroSubtitle);
    set('meta[property="og:image"]', "property", "og:image", s.ogImage || s.heroImage);
    set('meta[name="twitter:image"]', "name", "twitter:image", s.ogImage || s.heroImage);
  }, [s, enabled]);
}

/* ---------------- route ---------------- */

export const Route = createFileRoute("/site")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "صفحة صالون — Chic Spot" },
      { name: "description", content: "صفحة صالون احترافية للحجز الإلكتروني وعرض الخدمات والفريق والتقييمات عبر Chic Spot." },
      { property: "og:title", content: "صفحة صالون على Chic Spot" },
      { property: "og:description", content: "استعرضي خدمات الصالون واحجزي موعدك مباشرة من صفحة الصالون." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SitePage,
});

/* ---------------- structured data ---------------- */

/** BeautySalon JSON-LD so the salon page is search-friendly. */
function useSalonJsonLd(site: SiteSettings, meta: PublicSalonMeta, enabled: boolean) {
  useEffect(() => {
    if (typeof document === "undefined" || !enabled) return;
    const id = "lamsa-jsonld";
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.type = "application/ld+json";
      document.head.appendChild(el);
    }
    const data: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "BeautySalon",
      name: site.salonName,
      description: site.seoDescription || site.heroSubtitle,
      telephone: site.phone || undefined,
      image: site.ogImage || site.heroImage || undefined,
      address: site.address ? { "@type": "PostalAddress", streetAddress: site.address } : undefined,
      openingHours: site.hours || undefined,
      hasMap: site.mapsUrl || undefined,
    };
    if (meta.reviewCount > 0) {
      data["aggregateRating"] = {
        "@type": "AggregateRating",
        ratingValue: meta.avgRating,
        reviewCount: meta.reviewCount,
      };
    }
    el.textContent = JSON.stringify(data);
  }, [site, meta, enabled]);
}

/* ---------------- page ---------------- */

function SitePage() {
  return <SalonSiteView />;
}

/** The salon storefront. Renders for the current host/tenant, or for `slug`. */
export function SalonSiteView({ slug }: { slug?: string }) {
  const { services, staff } = useSalon((s) => s);
  const [meta, setMeta] = useState<PublicSalonMeta>({ salonId: null, avgRating: 0, reviewCount: 0, reviews: [] });
  const [loading, setLoading] = useState(true);
  const [shellReady, setShellReady] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [branding, setBranding] = useState<PublicBranding | null>(null);
  useEffect(() => {
    let active = true;
    let resolvedBranding = false;
    setLoading(true);
    setShellReady(false);
    setNotFound(false);
    setBranding(null);
    void import("@/lib/db/public-hydrate").then((m) => {
      // Fast branding-only fetch so the loading screen already looks like the salon.
      void m.fetchPublicBranding(slug).then((b) => {
        resolvedBranding = Boolean(b);
        if (!active) return;
        setBranding(b);
        if (b) {
          setShellReady(true);
          setLoading(false);
        }
      }).catch(() => {
        resolvedBranding = false;
      });
      void m
        .hydratePublicSite(slug, true)
        .then((next) => {
          if (!active) return;
          setMeta(next);
          if (!next.salonId && !resolvedBranding) setNotFound(true);
        })
        .finally(() => {
          if (!active) return;
          setShellReady(true);
          setLoading(false);
        });
    });
    return () => {
      active = false;
    };
  }, [slug]);
  const site = useSiteSettings();

  useHeadLink("lamsa-google-fonts", "stylesheet", googleFontsHref(site));
  useHeadLink("lamsa-favicon", "icon", site.faviconUrl);
  useSeo(site, shellReady && !notFound);
  useSalonJsonLd(site, meta, shellReady && !notFound);

  const waHref = waLink(site.waNumber, `مرحبًا، أرغب في الاستفسار عن خدمات ${site.salonName}`, site.waCountryCode);
  const sections = visibleSections(site);

  const bookingHref = useMemo(() => {
    if (site.bookingMode === "whatsapp") return waHref;
    if (site.bookingMode === "call") return `tel:${site.phone}`;
    if (site.bookingMode === "link" && site.bookingUrl) return site.bookingUrl;
    return "/store-login";
  }, [site.bookingMode, site.bookingUrl, site.phone, waHref]);

  const external = site.bookingMode !== "internal";

  const render = (id: SectionId) => {
    switch (id) {
      case "showcase":
        return <ShowcaseSection key={id} site={site} />;
      case "services":
        return <ServicesSection key={id} site={site} slug={slug} services={services} bookingHref={bookingHref} external={external} />;
      case "gallery":
        return <GallerySection key={id} site={site} />;
      case "team":
        return <TeamSection key={id} site={site} staff={staff} />;
      case "reviews":
        return <ReviewsSection key={id} site={site} meta={meta} />;
      case "contact":
        return <ContactSection key={id} site={site} waHref={waHref} />;
      default:
        return null;
    }
  };

  return (
    <>
      <SalonBrandedLoader
        branding={branding}
        hidden={!loading}
      />
      {!shellReady ? null : notFound ? (
        <main className="grid min-h-screen place-items-center bg-background px-6 text-center" dir="rtl">
          <div className="max-w-md">
            <h1 className="text-2xl font-black text-foreground">صفحة الصالون غير متاحة</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">تحققي من رابط الصالون أو تواصلي مع إدارة الصالون.</p>
          </div>
        </main>
      ) : (
      <div
        className={`lamsa-site min-h-screen transition-opacity duration-700 ${loading ? "opacity-0" : "opacity-100"}`}
        dir="rtl"
        style={settingsToCssVars(site)}
      >

      <style>{`
        .lamsa-site h1,.lamsa-site h2,.lamsa-site h3,.lamsa-site h4{font-family:var(--font-display);letter-spacing:0;}
        .lamsa-site .btn{border-radius:var(--btn-radius);}
        @keyframes lamsaRise{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
        .lamsa-rise{animation:lamsaRise .9s cubic-bezier(.22,1,.36,1) both}
        .lamsa-reveal{opacity:0;transform:translateY(26px);transition:opacity .8s ease,transform .8s cubic-bezier(.22,1,.36,1)}
        .lamsa-reveal.is-in{opacity:1;transform:none}
        @media (prefers-reduced-motion: reduce){.lamsa-rise,.lamsa-reveal{animation:none;opacity:1;transform:none;transition:none}}
      `}</style>

      <SiteHeader site={site} slug={slug} waHref={waHref} bookingHref={bookingHref} external={external} sections={sections} />
      <main>
        <Hero site={site} slug={slug} waHref={waHref} bookingHref={bookingHref} external={external} />
        {sections.map(render)}
      </main>
      <SiteFooter site={site} slug={slug} waHref={waHref} />
      <a
        href={waHref}
        target="_blank"
        rel="noreferrer"
        aria-label="تواصلي عبر واتساب"
        className="fixed bottom-5 left-5 z-50 size-14 rounded-full grid place-items-center text-[var(--brand-foreground)] shadow-2xl transition hover:scale-110"
        style={{ background: `linear-gradient(135deg, ${site.primary}, ${site.accent})` }}
      >
        <MessageCircle className="size-7" />
      </a>
        <SiteAssistant site={site} services={services} staff={staff} />
      </div>
      )}
    </>
  );

}

/* ---------------- header ---------------- */

function SiteHeader({
  site, slug, waHref, bookingHref, external, sections,
}: { site: SiteSettings; slug?: string; waHref: string; bookingHref: string; external: boolean; sections: SectionId[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLabels: Record<SectionId, string> = {
    reviews: site.reviewsTitle,
    showcase: site.showcaseTitle,
    services: site.servicesTitle,
    gallery: site.galleryTitle,
    team: site.teamTitle,
    contact: site.contactTitle,
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-500",
        scrolled ? "border-b border-border bg-background/85 backdrop-blur-xl shadow-sm" : "bg-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-3">
        <SiteLink slug={slug} className="flex items-center gap-3 min-w-0">
          {site.logoUrl ? (
            <img
              src={site.logoUrl}
              alt={`شعار ${site.salonName}`}
              className="h-16 md:h-20 w-auto max-w-[220px] object-contain shrink-0 bg-transparent"
            />
          ) : (
            <div
              className="size-12 md:size-14 rounded-2xl grid place-items-center overflow-hidden shrink-0"
              style={{ background: `linear-gradient(135deg, ${site.primary}, ${site.accent})` }}
            >
              <Scissors className="size-6 text-[var(--brand-foreground)] drop-shadow" aria-hidden />
            </div>
          )}

          <div className="min-w-0">
            <div
              className="font-black text-lg md:text-2xl leading-tight truncate"
              style={{ color: "var(--brand-text)" }}
            >
              {site.salonName}
            </div>
            <div className="text-[11px] md:text-xs text-muted-foreground truncate">{site.branchName}</div>
          </div>
        </SiteLink>

        <nav className="hidden lg:flex items-center gap-1" aria-label="أقسام الموقع">
          {sections.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className="px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition rounded-lg hover:bg-muted/60"
            >
              {navLabels[id]}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LoginLink slug={slug} className="btn hidden sm:inline-flex items-center gap-2 h-10 px-4 border border-border text-sm hover:bg-muted transition">
            <LogIn className="size-4" aria-hidden /> دخول
          </LoginLink>
          <BookNow href={bookingHref} external={external} label={site.bookingLabel} site={site} slug={slug} className="h-10 px-5 text-sm" />
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="القائمة"
            aria-expanded={open}
            className="btn lg:hidden inline-flex items-center justify-center size-10 border border-border hover:bg-muted"
          >
            {open ? <XIcon className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <nav className="max-w-7xl mx-auto px-4 py-3 grid gap-1" aria-label="قائمة الجوال">
            {sections.map((id) => (
              <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className="px-3 py-3 rounded-lg text-sm font-semibold hover:bg-muted">
                {navLabels[id]}
              </a>
            ))}
            <a href={waHref} target="_blank" rel="noreferrer" className="px-3 py-3 rounded-lg text-sm font-semibold text-success hover:bg-success/10">
              واتساب
            </a>
            <LoginLink slug={slug} className="px-3 py-3 rounded-lg text-sm font-semibold hover:bg-muted">تسجيل الدخول</LoginLink>
          </nav>
        </div>
      )}
    </header>
  );
}

/* ---------------- hero ---------------- */

function BookNow({
  href, external, label, site, slug, className,
}: { href: string; external: boolean; label: string; site: SiteSettings; slug?: string; className?: string }) {
  const safeHref = normalizeSiteHref(href);
  const style = {
    background: `linear-gradient(90deg, ${site.primary}, ${site.accent})`,
    boxShadow: `0 18px 40px -18px ${site.primary}99`,
  };
  const cls = cn(
    "btn inline-flex items-center justify-center gap-2 text-[var(--brand-foreground)] font-semibold transition hover:brightness-110 hover:-translate-y-0.5",
    className,
  );
  if (external) {
    return (
      <a href={safeHref} target={isExternalSiteHref(safeHref) ? "_blank" : undefined} rel="noreferrer" className={cls} style={style}>
        <CalendarDays className="size-4" aria-hidden /> {label}
      </a>
    );
  }
  return (
    <LoginLink slug={slug} className={cls} style={style}>
      <CalendarDays className="size-4" aria-hidden /> {label}
    </LoginLink>
  );
}

function normalizeSiteHref(href: string): string {
  const value = href.trim();
  if (!value) return "#";
  if (/^(https?:|tel:|mailto:|#|\/)/i.test(value)) return value;
  return `https://${value}`;
}

function isExternalSiteHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

function heroButtonHref(b: HeroButton, ctx: { booking: string; wa: string; phone: string }) {
  switch (b.kind) {
    case "booking": return ctx.booking;
    case "whatsapp": return ctx.wa;
    case "services": return "#services";
    case "call": return `tel:${ctx.phone}`;
    default: return b.url || "#";
  }
}

/** Hero buttons with the theme's main CTA (label + link) placed first when set. */
function heroButtonsOf(site: SiteSettings): HeroButton[] {
  if (!site.heroCtaLabel?.trim()) return site.heroButtons;
  const cta: HeroButton = site.heroCtaUrl?.trim()
    ? { kind: "link", label: site.heroCtaLabel, url: site.heroCtaUrl }
    : { kind: "booking", label: site.heroCtaLabel };
  return [cta, ...site.heroButtons];
}


/* ---------------- luxe hero (style: "لمسة فاخرة") ---------------- */

/** Full-bleed cover photo with the salon logo + name centered on top of it. */
function LuxeHero({ site, slug, waHref, bookingHref, external }: { site: SiteSettings; slug?: string; waHref: string; bookingHref: string; external: boolean }) {
  const height = Math.min(100, Math.max(55, site.heroHeight || 92));
  const overlay = Math.min(90, Math.max(0, site.heroOverlay ?? 55)) / 100;

  return (
    <section id="hero" className="relative w-full overflow-hidden" style={{ minHeight: `${height}vh` }}>
      {site.heroImage ? (
        <img
          src={site.heroImage}
          alt={`${site.salonName} — ${site.tagline}`}
          className="absolute inset-0 w-full h-full object-cover scale-105"
          fetchPriority="high"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${site.primary}, ${site.accent})` }} />
      )}
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${Math.min(0.92, overlay + 0.3)}) 0%, rgba(0,0,0,${overlay}) 50%, rgba(0,0,0,${overlay * 0.5}) 100%)` }} />
      <div className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(60% 55% at 50% 78%, ${site.primary}55, transparent 72%)` }} />

      <div
        className="relative z-10 max-w-5xl mx-auto px-5 md:px-10 flex flex-col items-center text-center justify-center gap-5"
        style={{ minHeight: `${height}vh`, paddingTop: "7rem", paddingBottom: "6rem" }}
      >
        {/* logo — transparent, frameless */}
        {site.logoUrl ? (
          <img
            src={site.logoUrl}
            alt={`شعار ${site.salonName}`}
            className="lamsa-rise h-24 md:h-32 w-auto max-w-[320px] object-contain bg-transparent drop-shadow-[0_18px_40px_rgba(0,0,0,.55)]"
          />
        ) : (
          <div
            className="lamsa-rise size-24 md:size-32 rounded-full grid place-items-center overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${site.primary}, ${site.accent})` }}
          >
            <Scissors className="size-10 md:size-14 text-[var(--brand-foreground)] drop-shadow" aria-hidden />
          </div>
        )}


        <h1
          className="lamsa-rise text-white font-black leading-[1.05] text-4xl sm:text-5xl md:text-7xl drop-shadow-[0_8px_36px_rgba(0,0,0,.55)]"
          style={{ animationDelay: "140ms" }}
        >
          {site.salonName}
        </h1>

        <div className="lamsa-rise flex items-center gap-3 text-white/85" style={{ animationDelay: "220ms" }}>
          <span className="h-px w-10 md:w-16" style={{ background: site.accent }} />
          <span className="text-xs md:text-sm font-bold">{site.tagline}</span>
          <span className="h-px w-10 md:w-16" style={{ background: site.accent }} />
        </div>

        {site.heroSubtitle && (
          <p className="lamsa-rise max-w-2xl text-white/80 text-sm md:text-lg leading-relaxed" style={{ animationDelay: "300ms" }}>
            {site.heroSubtitle}
          </p>
        )}

        <div className="lamsa-rise mt-2 flex flex-wrap justify-center gap-3" style={{ animationDelay: "400ms" }}>
          {heroButtonsOf(site).map((b, i) => {
            const href = normalizeSiteHref(heroButtonHref(b, { booking: bookingHref, wa: waHref, phone: site.phone }));
            const primary = i === 0;
            const cls = cn(
              "btn inline-flex items-center gap-2 h-12 md:h-14 px-6 md:px-9 font-bold text-sm md:text-base transition hover:-translate-y-0.5",
              primary ? "text-[var(--brand-foreground)] shadow-2xl hover:brightness-110" : "text-white border border-white/45 bg-white/10 backdrop-blur-md hover:bg-white/20",
            );
            const style = primary
              ? { background: `linear-gradient(90deg, ${site.primary}, ${site.accent})`, boxShadow: `0 26px 60px -22px ${site.primary}` }
              : undefined;
            if (b.kind === "booking" && !external) {
              return (
                <LoginLink key={i} slug={slug} className={cls} style={style}>
                  <CalendarDays className="size-4" aria-hidden /> {b.label}
                </LoginLink>
              );
            }
            return (
              <a key={i} href={href} target={isExternalSiteHref(href) ? "_blank" : undefined} rel="noreferrer" className={cls} style={style}>
                {b.kind === "whatsapp" && <MessageCircle className="size-4" aria-hidden />}
                {b.kind === "call" && <Phone className="size-4" aria-hidden />}
                {b.label}
              </a>
            );
          })}
        </div>
      </div>

      {/* glass info strip */}
      <div className="absolute bottom-0 inset-x-0 z-10 border-t border-white/15 bg-black/25 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-5 md:px-10 py-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[11px] md:text-sm text-white/85">
          {site.hours && <span className="flex items-center gap-1.5"><Clock className="size-4" aria-hidden /> {site.hours}</span>}
          {site.address && <span className="flex items-center gap-1.5 truncate max-w-full"><MapPin className="size-4" aria-hidden /> {site.address}</span>}
          {site.phone && <a href={`tel:${site.phone}`} className="flex items-center gap-1.5 hover:text-white"><Phone className="size-4" aria-hidden /> {site.phone}</a>}
        </div>
      </div>
    </section>
  );
}

/** Elegant flat card grid — used by the "luxe" style. */
function LuxeServices({
  site, slug, list, bookingHref, external,
}: { site: SiteSettings; slug?: string; list: any[]; bookingHref: string; external: boolean }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
      {list.map((s) => (
        <article
          key={s.id}
          className="group relative overflow-hidden rounded-[26px] border border-border/60 p-6 flex flex-col transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
          style={{ background: site.surface, boxShadow: "0 18px 45px -32px rgba(0,0,0,.45)" }}
        >
          <span className="absolute inset-x-0 top-0 h-1 opacity-70 transition group-hover:opacity-100" style={{ background: `linear-gradient(90deg, ${site.primary}, ${site.accent})` }} />
          {s.category && (
            <span className="self-start rounded-full px-3 py-1 text-[10px] font-bold" style={{ background: `${site.primary}14`, color: "var(--brand-surface-text)" }}>
              {s.category}
            </span>
          )}
          <h3 className="mt-3 font-black text-lg md:text-xl leading-snug">{s.name}</h3>
          <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden /> {s.durationMin} دقيقة
          </p>
          <div className="mt-5 flex items-center justify-between gap-3">
            {site.servicesShowPrice ? (
              <div className="text-2xl font-black" style={{ color: "var(--brand-surface-text)" }}>{formatSAR(s.price)}</div>
            ) : <span />}
            <Sparkles className="size-4 opacity-40 transition group-hover:opacity-90" style={{ color: site.accent }} aria-hidden />
          </div>
          <BookNow href={bookingHref} external={external} label={site.bookingLabel} site={site} slug={slug} className="mt-5 w-full h-11 text-sm" />
        </article>
      ))}
    </div>
  );
}

function Hero({ site, slug, waHref, bookingHref, external }: { site: SiteSettings; slug?: string; waHref: string; bookingHref: string; external: boolean }) {
  if (site.layout === "luxe") {
    return <LuxeHero site={site} slug={slug} waHref={waHref} bookingHref={bookingHref} external={external} />;
  }
  const align = site.heroAlign;
  const alignCls = align === "center" ? "items-center text-center" : align === "left" ? "items-start text-left" : "items-end text-right";
  const height = Math.min(100, Math.max(45, site.heroHeight || 85));
  const overlay = Math.min(90, Math.max(0, site.heroOverlay ?? 55)) / 100;

  return (
    <section
      id="hero"
      className="relative w-full overflow-hidden"
      style={{ minHeight: `${height}vh` }}
    >
      {site.heroImage ? (
        <img
          src={site.heroImage}
          alt={`${site.salonName} — ${site.tagline}`}
          className="absolute inset-0 w-full h-full object-cover"
          fetchPriority="high"
        />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${site.primary}, ${site.accent})` }} />
      )}

      {/* elegant overlay */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,${overlay + 0.2}) 0%, rgba(0,0,0,${overlay}) 45%, rgba(0,0,0,${overlay * 0.55}) 100%)` }} />
      <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(70% 60% at 50% 100%, ${site.primary}66, transparent 70%)` }} />

      <div
        className={cn("relative z-10 max-w-7xl mx-auto px-5 md:px-10 flex flex-col justify-center gap-6", alignCls)}
        style={{ minHeight: `${height}vh`, paddingTop: "6rem", paddingBottom: "5rem" }}
      >
        <span
          className="lamsa-rise inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-white backdrop-blur-md border border-white/30 bg-white/10"
          style={{ animationDelay: "80ms" }}
        >
          <Sparkles className="size-3.5" aria-hidden /> {site.tagline}
        </span>

        <h1
          className="lamsa-rise font-black text-white leading-[1.1] text-4xl sm:text-5xl md:text-6xl lg:text-7xl drop-shadow-[0_6px_30px_rgba(0,0,0,0.45)]"
          style={{ animationDelay: "180ms" }}
        >
          {site.heroTitle}{" "}
          {site.heroHighlight && (
            <span style={{ background: `linear-gradient(90deg, ${site.accent}, ${site.surface})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              {site.heroHighlight}
            </span>
          )}
        </h1>

        {site.heroSubtitle && (
          <p
            className="lamsa-rise max-w-2xl text-white/85 text-base md:text-lg leading-relaxed"
            style={{ animationDelay: "300ms" }}
          >
            {site.heroSubtitle}
          </p>
        )}

        <div
          className={cn("lamsa-rise mt-2 flex flex-wrap gap-3", align === "center" && "justify-center", align === "left" && "justify-start", align === "right" && "justify-end")}
          style={{ animationDelay: "420ms" }}
        >
          {heroButtonsOf(site).map((b, i) => {
            const href = normalizeSiteHref(heroButtonHref(b, { booking: bookingHref, wa: waHref, phone: site.phone }));
            const primary = i === 0;
            const cls = cn(
              "btn inline-flex items-center gap-2 h-12 md:h-14 px-6 md:px-8 font-bold text-sm md:text-base transition hover:-translate-y-0.5",
              primary ? "text-[var(--brand-foreground)] shadow-2xl hover:brightness-110" : "text-white border border-white/40 bg-white/10 backdrop-blur-md hover:bg-white/20",
            );
            const style = primary
              ? { background: `linear-gradient(90deg, ${site.primary}, ${site.accent})`, boxShadow: `0 24px 60px -20px ${site.primary}` }
              : undefined;
            if (b.kind === "booking" && !external) {
              return (
                <LoginLink key={i} slug={slug} className={cls} style={style}>
                  <CalendarDays className="size-4" aria-hidden /> {b.label}
                </LoginLink>
              );
            }
            return (
              <a key={i} href={href} target={isExternalSiteHref(href) ? "_blank" : undefined} rel="noreferrer" className={cls} style={style}>
                {b.kind === "whatsapp" && <MessageCircle className="size-4" aria-hidden />}
                {b.kind === "call" && <Phone className="size-4" aria-hidden />}
                {b.label}
              </a>
            );
          })}
        </div>

        <div className={cn("lamsa-rise mt-6 flex flex-wrap gap-x-7 gap-y-2 text-sm text-white/80", align === "center" && "justify-center")} style={{ animationDelay: "540ms" }}>
          <span className="flex items-center gap-1.5"><Star className="size-4 fill-current" style={{ color: site.accent }} aria-hidden /> 4.9 تقييم</span>
          <span className="flex items-center gap-1.5"><Sparkles className="size-4" style={{ color: site.accent }} aria-hidden /> +2000 عميلة</span>
          <span className="flex items-center gap-1.5"><Clock className="size-4" aria-hidden /> {site.hours}</span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- reveal-on-scroll wrapper ---------------- */

function Reveal({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") { setSeen(true); return; }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }),
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [el, seen]);
  return (
    <section ref={setEl} id={id} className={cn("lamsa-reveal scroll-mt-24", seen && "is-in", className)}>
      {children}
    </section>
  );
}

function SectionHead({ site, title, desc, eyebrow }: { site: SiteSettings; title: string; desc?: string; eyebrow?: string }) {
  return (
    <div className="text-center mb-12">
      {eyebrow && (
        <span className="inline-block text-[11px] font-bold uppercase mb-3" style={{ color: "var(--brand-text)" }}>
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl md:text-5xl font-black">{title}</h2>
      {desc && <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">{desc}</p>}
      <span className="mt-5 block mx-auto h-1 w-20 rounded-full" style={{ background: `linear-gradient(90deg, ${site.primary}, ${site.accent})` }} />
    </div>
  );
}

/* ---------------- showcase ---------------- */

function ShowcaseSection({ site }: { site: SiteSettings }) {
  if (!site.showcase.length) return null;
  return (
    <Reveal id="showcase" className="max-w-7xl mx-auto px-5 md:px-10 py-20 md:py-28">
      <SectionHead site={site} eyebrow="Beauty Showcase" title={site.showcaseTitle} desc={site.showcaseDesc} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {site.showcase.map((it, i) => (
          <article key={i} className="group relative overflow-hidden rounded-3xl aspect-[4/5] shadow-xl transition duration-500 hover:shadow-2xl hover:-translate-y-1">
            {it.url
              ? <img src={it.url} alt={it.label} loading="lazy" className="w-full h-full object-cover transition duration-[1400ms] ease-out group-hover:scale-110" />
              : <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${site.primary}, ${site.accent})` }} />}
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.15) 45%, transparent 70%)` }} />
            <div className="absolute bottom-0 inset-x-0 p-6">
              <h3 className="text-white text-xl font-black drop-shadow">{it.label}</h3>
              <span className="mt-2 block h-0.5 w-10 rounded-full transition-all duration-500 group-hover:w-20" style={{ background: site.accent }} />
            </div>
          </article>
        ))}
      </div>
    </Reveal>
  );
}

/* ---------------- services ---------------- */

function ServicesSection({
  site, slug, services, bookingHref, external,
}: { site: SiteSettings; slug?: string; services: ReturnType<typeof useSalon<any>>; bookingHref: string; external: boolean }) {
  const list = (services as any[]).filter((s) => s.active);
  const categories = useMemo(() => {
    const m = new Map<string, any[]>();
    list.forEach((s) => {
      const arr = m.get(s.category) ?? [];
      arr.push(s);
      m.set(s.category, arr);
    });
    return Array.from(m.entries());
  }, [list]);

  return (
    <Reveal id="services" className="py-20 md:py-28" >
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <SectionHead site={site} eyebrow="Our Services" title={site.servicesTitle} desc={site.servicesDesc} />
        {list.length === 0 ? (
          <p className="text-center text-muted-foreground">سيتم إضافة الخدمات قريبًا.</p>
        ) : site.layout === "luxe" ? (
          <LuxeServices site={site} slug={slug} list={list} bookingHref={bookingHref} external={external} />
        ) : (
          <div className="space-y-14">
            {categories.map(([cat, items]) => (
              <div key={cat}>
                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                  <span className="h-6 w-1.5 rounded-full" style={{ background: `linear-gradient(180deg, ${site.primary}, ${site.accent})` }} />
                  {cat || "خدمات"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {items.map((s) => (
                    <article
                      key={s.id}
                      className="group rounded-3xl border border-border/70 p-6 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
                      style={{ background: site.surface, boxShadow: "0 8px 30px -20px rgba(0,0,0,.35)" }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="font-black text-lg truncate">{s.name}</h4>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                            <Clock className="size-3.5" aria-hidden /> {s.durationMin} دقيقة
                          </p>
                        </div>
                        {site.servicesShowPrice && (
                          <div
                            className="text-xl font-black whitespace-nowrap"
                            style={{ color: "var(--brand-surface-text)" }}
                          >
                            {formatSAR(s.price)}
                          </div>
                        )}
                      </div>
                      <BookNow href={bookingHref} external={external} label={site.bookingLabel} site={site} slug={slug} className="mt-6 w-full h-11 text-sm" />
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}

/* ---------------- gallery + lightbox ---------------- */

function GallerySection({ site }: { site: SiteSettings }) {
  const items = galleryOf(site);
  const cats = useMemo(() => Array.from(new Set(items.map((i) => i.category).filter(Boolean))), [items]);
  const [cat, setCat] = useState<string>("");
  const [open, setOpen] = useState<number | null>(null);

  const shown = cat ? items.filter((i) => i.category === cat) : items;

  const move = useCallback((dir: 1 | -1) => {
    setOpen((cur) => (cur === null ? cur : (cur + dir + shown.length) % shown.length));
  }, [shown.length]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") move(-1);
      if (e.key === "ArrowLeft") move(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, move]);

  if (!items.length) return null;

  return (
    <Reveal id="gallery" className="max-w-7xl mx-auto px-5 md:px-10 py-20 md:py-28">
      <SectionHead site={site} eyebrow="Gallery" title={site.galleryTitle} desc={site.galleryDesc} />
      {cats.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {["", ...cats].map((c) => (
            <button
              key={c || "all"}
              onClick={() => setCat(c)}
              className={cn(
                "btn h-9 px-4 text-xs font-bold border transition",
                cat === c ? "text-[var(--brand-foreground)] border-transparent" : "border-border text-muted-foreground hover:text-foreground",
              )}
              style={cat === c ? { background: `linear-gradient(90deg, ${site.primary}, ${site.accent})` } : undefined}
            >
              {c || "الكل"}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {shown.map((it, i) => (
          <button
            key={i}
            onClick={() => setOpen(i)}
            className="group relative overflow-hidden rounded-2xl aspect-square border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={it.title || `صورة ${i + 1}`}
          >
            {it.beforeUrl && (
              <img src={it.beforeUrl} alt={it.title ? `${it.title} — قبل` : "قبل"} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <img
              src={it.url}
              alt={it.title || "من أعمال الصالون"}
              loading="lazy"
              className={cn(
                "relative w-full h-full object-cover transition duration-700",
                it.beforeUrl ? "group-hover:opacity-0" : "group-hover:scale-110",
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300" />
            {it.beforeUrl && (
              <span className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white">
                قبل / بعد
              </span>
            )}
            {it.title && (
              <span className="absolute bottom-3 right-3 left-3 text-white text-sm font-bold text-right opacity-0 group-hover:opacity-100 transition">
                {it.title}
              </span>
            )}
          </button>
        ))}
      </div>

      {open !== null && shown[open] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setOpen(null)}
        >
          <button onClick={() => setOpen(null)} aria-label="إغلاق" className="absolute top-5 left-5 size-11 rounded-full bg-white/10 text-white grid place-items-center hover:bg-white/20">
            <XIcon className="size-5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); move(-1); }} aria-label="السابق" className="absolute right-4 size-12 rounded-full bg-white/10 text-white grid place-items-center hover:bg-white/20">
            <ChevronRight className="size-6" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); move(1); }} aria-label="التالي" className="absolute left-4 size-12 rounded-full bg-white/10 text-white grid place-items-center hover:bg-white/20">
            <ChevronLeft className="size-6" />
          </button>
          <figure className="max-w-5xl w-full" onClick={(e) => e.stopPropagation()}>
            {shown[open].beforeUrl ? (
              <BeforeAfter before={shown[open].beforeUrl!} after={shown[open].url} title={shown[open].title} />
            ) : (
              <img src={shown[open].url} alt={shown[open].title || ""} className="w-full max-h-[80vh] object-contain rounded-2xl" />
            )}
            {(shown[open].title || shown[open].category) && (
              <figcaption className="text-center text-white/85 mt-4 text-sm">
                {shown[open].title} {shown[open].category && <span className="opacity-60">— {shown[open].category}</span>}
              </figcaption>
            )}
          </figure>
        </div>
      )}

    </Reveal>
  );
}

/** Draggable before/after comparison used in the gallery lightbox. */
function BeforeAfter({ before, after, title }: { before: string; after: string; title?: string }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="w-full">
      <div className="relative w-full overflow-hidden rounded-2xl select-none">
        <img src={after} alt={title ? `${title} — بعد` : "بعد"} className="w-full max-h-[70vh] object-contain" />
        <img
          src={before}
          alt={title ? `${title} — قبل` : "قبل"}
          className="absolute inset-0 w-full h-full object-contain"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />
        <div className="absolute top-0 bottom-0 w-0.5 bg-white/90" style={{ left: `${pos}%` }} />
        <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white">قبل</span>
        <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold text-white">بعد</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        aria-label="مقارنة قبل وبعد"
        onChange={(e) => setPos(Number(e.target.value))}
        className="mt-3 w-full accent-white cursor-ew-resize"
        dir="ltr"
      />
    </div>
  );
}



/* ---------------- team ---------------- */

function TeamSection({ site, staff }: { site: SiteSettings; staff: ReturnType<typeof useSalon<any>> }) {
  const custom = site.team;
  const fallback = (staff as any[]).filter((s) => s.active).map((s) => ({
    id: s.id, name: s.name, role: s.role, bio: "", photo: "", instagram: "",
  }));
  const members = custom.length ? custom : fallback;
  if (!members.length) return null;

  return (
    <Reveal id="team" className="max-w-7xl mx-auto px-5 md:px-10 py-20 md:py-28">
      <SectionHead site={site} eyebrow="Our Team" title={site.teamTitle} desc={site.teamDesc} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {members.map((m, i) => (
          <article
            key={m.id || i}
            className="group rounded-3xl overflow-hidden border border-border/70 text-center transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
            style={{ background: site.surface }}
          >
            <div className="aspect-[4/5] overflow-hidden">
              {m.photo ? (
                <img src={m.photo} alt={m.name} loading="lazy" className="w-full h-full object-cover transition duration-700 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full grid place-items-center text-[var(--brand-foreground)] text-5xl font-black" style={{ background: `linear-gradient(135deg, ${site.primary}, ${site.accent})` }}>
                  {m.name?.charAt(0)}
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="font-black text-base">{m.name}</h3>
              <div className="text-xs mt-1" style={{ color: "var(--brand-surface-text)" }}>{m.role}</div>
              {m.bio && <p className="text-xs text-muted-foreground mt-2 leading-relaxed line-clamp-3">{m.bio}</p>}
              {m.instagram && (
                <a href={m.instagram} target="_blank" rel="noreferrer" aria-label={`إنستغرام ${m.name}`} className="mt-3 inline-flex size-9 rounded-full items-center justify-center border border-border hover:bg-muted">
                  <Instagram className="size-4" />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </Reveal>
  );
}

/* ---------------- reviews ---------------- */

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} من 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
      ))}
    </span>
  );
}

function ReviewsSection({ site, meta }: { site: SiteSettings; meta: PublicSalonMeta }) {
  const reviews: PublicReview[] = meta.reviews;
  if (!reviews.length) return null;
  return (
    <Reveal id="reviews" className="max-w-7xl mx-auto px-5 md:px-10 py-20 md:py-28">
      <SectionHead site={site} eyebrow="Reviews" title={site.reviewsTitle} desc={site.reviewsDesc} />
      <div className="flex flex-col items-center gap-2 mb-10">
        <div className="text-4xl font-black" style={{ color: "var(--brand-text)" }}>{meta.avgRating.toFixed(1)}</div>
        <Stars value={meta.avgRating} />
        <div className="text-xs text-muted-foreground">{meta.reviewCount} تقييم</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reviews.map((r) => (
          <article key={r.id} className="rounded-3xl border border-border/70 p-6" style={{ background: site.surface }}>
            <Stars value={r.rating} />
            {r.comment && <p className="text-sm leading-relaxed mt-3 text-muted-foreground">{r.comment}</p>}
            <div className="mt-4 flex items-center gap-2">
              <div className="size-8 rounded-full grid place-items-center text-[var(--brand-foreground)] text-xs font-bold" style={{ background: `linear-gradient(135deg, ${site.primary}, ${site.accent})` }}>
                {r.displayName.charAt(0)}
              </div>
              <div className="text-xs font-bold">{r.displayName}</div>
            </div>
          </article>
        ))}
      </div>
    </Reveal>
  );
}

/* ---------------- contact ---------------- */

function ContactSection({ site, waHref, salonId }: { site: SiteSettings; waHref: string; salonId: string | null }) {
  const socials = socialLinks(site);

  return (
    <Reveal id="contact" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-5 md:px-10">
        <SectionHead site={site} eyebrow="Contact" title={site.contactTitle} desc={site.contactDesc} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <ContactCard site={site} icon={MapPin} title="العنوان" body={site.address} href={site.mapsUrl} cta="الخريطة" />
          <ContactCard site={site} icon={Phone} title="الهاتف" body={site.phone} href={`tel:${site.phone}`} cta="اتصلي" />
          <ContactCard site={site} icon={MessageCircle} title="واتساب" body={`${site.waCountryCode} ${site.waNumber}`} href={waHref} cta="مراسلة" />
          <ContactCard site={site} icon={Clock} title="أوقات العمل" body={site.hours} />
        </div>
        {site.email && (
          <div className="mt-5">
            <ContactCard site={site} icon={Mail} title="البريد الإلكتروني" body={site.email} href={`mailto:${site.email}`} cta="راسلينا" />
          </div>
        )}
        <BranchesBlock site={site} salonId={salonId} />

        {socials.length > 0 && (
          <div className="mt-10 flex justify-center gap-3 flex-wrap">
            {socials.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="btn inline-flex items-center gap-2 h-11 px-5 border border-border text-sm font-semibold hover:bg-muted transition hover:-translate-y-0.5"
              >
                {s.label} <ArrowLeft className="size-4" aria-hidden />
              </a>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}

function ContactCard({
  site, icon: Icon, title, body, href, cta,
}: { site: SiteSettings; icon: any; title: string; body: string; href?: string; cta?: string }) {
  return (
    <div className="rounded-3xl border border-border/70 p-6 transition hover:-translate-y-1 hover:shadow-xl" style={{ background: site.surface }}>
      <div className="size-11 rounded-2xl grid place-items-center text-[var(--brand-foreground)] mb-4" style={{ background: `linear-gradient(135deg, ${site.primary}, ${site.accent})` }}>
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="font-bold text-sm">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed break-words">{body || "—"}</p>
      {href && cta && (
        <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold" style={{ color: "var(--brand-surface-text)" }}>
          {cta} <ArrowLeft className="size-3" aria-hidden />
        </a>
      )}
    </div>
  );
}

/* ---------------- footer ---------------- */

function SiteFooter({ site, slug, waHref }: { site: SiteSettings; slug?: string; waHref: string }) {
  const socials = socialLinks(site);
  return (
    <footer className="border-t border-border mt-8">
      <div className="max-w-7xl mx-auto px-5 md:px-10 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
        <div>
          <div className="flex items-center gap-3">
            {site.logoUrl ? (
              <img src={site.logoUrl} alt="" className="h-14 w-auto max-w-[180px] object-contain bg-transparent" />
            ) : (
              <div className="size-12 rounded-2xl grid place-items-center overflow-hidden" style={{ background: `linear-gradient(135deg, ${site.primary}, ${site.accent})` }}>
                <Scissors className="size-5 text-[var(--brand-foreground)]" aria-hidden />
              </div>
            )}

            <div>
              <div className="font-black text-lg">{site.salonName}</div>
              <div className="text-xs text-muted-foreground">{site.branchName}</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-4 leading-relaxed max-w-sm">{site.tagline}</p>
        </div>

        <div className="space-y-3 text-sm">
          <h3 className="font-bold">تواصلي معنا</h3>
          <p className="flex items-start gap-2 text-muted-foreground"><MapPin className="size-4 mt-0.5 shrink-0" style={{ color: site.primary }} aria-hidden /> {site.address}</p>
          <a href={`tel:${site.phone}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><Phone className="size-4" style={{ color: site.primary }} aria-hidden /> {site.phone}</a>
          <a href={waHref} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-success"><MessageCircle className="size-4" aria-hidden /> واتساب</a>
          {site.email && <a href={`mailto:${site.email}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground"><Mail className="size-4" style={{ color: site.primary }} aria-hidden /> {site.email}</a>}
          <p className="flex items-center gap-2 text-muted-foreground"><Clock className="size-4" style={{ color: site.primary }} aria-hidden /> {site.hours}</p>
        </div>

        <div>
          <h3 className="font-bold text-sm mb-3">تابعينا</h3>
          <div className="flex flex-wrap gap-2">
            {socials.length === 0 && <span className="text-xs text-muted-foreground">أضيفي روابط التواصل من لوحة التحكم</span>}
            {socials.map((s) => (
              <a key={s.id} href={s.url} target="_blank" rel="noreferrer" className="btn h-10 px-4 inline-flex items-center border border-border text-xs font-semibold hover:bg-muted">
                {s.label}
              </a>
            ))}
          </div>
          <LoginLink slug={slug} className="btn mt-5 inline-flex items-center gap-2 h-10 px-4 border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/10">
            <IdCard className="size-4" aria-hidden /> دخول الموظفين والعملاء
          </LoginLink>
        </div>
      </div>

      {site.paymentMethods.length > 0 && (
        <div className="border-t border-border">
          <div className="max-w-7xl mx-auto px-5 md:px-10 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4" style={{ color: site.primary }} aria-hidden />
              <span>وسائل الدفع المقبولة</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {site.paymentMethods.map((id) => <PaymentIcon key={id} id={id} />)}
            </div>
          </div>
        </div>
      )}
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {site.salonName} — {site.footerText}
      </div>
    </footer>
  );
}
