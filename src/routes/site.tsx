import { createFileRoute, Link } from "@tanstack/react-router";
import { useSalon, formatSAR } from "@/lib/salon-store";
import { useSiteSettings, settingsToCssVars, waLink } from "@/lib/site-settings";
import { Scissors, Sparkles, Clock, MapPin, Phone, Star, LogIn, CalendarDays, MessageCircle } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/site")({
  head: () => ({
    meta: [
      { title: "صالون لمسة — فرع الروضة" },
      { name: "description", content: "احجزي خدمات التجميل والعناية في صالون لمسة بسهولة عبر الإنترنت." },
      { property: "og:title", content: "صالون لمسة" },
      { property: "og:description", content: "خدمات تجميل راقية، حجز إلكتروني، وأخصائيات محترفات." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SitePage,
});

function SitePage() {
  const { services, staff } = useSalon((s) => s);
  const site = useSiteSettings();
  const categories = useMemo(() => {
    const m = new Map<string, typeof services>();
    services.filter((s) => s.active).forEach((s) => {
      const arr = m.get(s.category) ?? [];
      arr.push(s);
      m.set(s.category, arr);
    });
    return Array.from(m.entries());
  }, [services]);

  const layout = site.layout;
  const heroPad = layout === "bold" ? "py-24 md:py-32" : layout === "minimal" ? "py-12 md:py-16" : "py-16 md:py-24";
  const heroTitleSize = layout === "bold" ? "text-5xl md:text-7xl" : layout === "minimal" ? "text-3xl md:text-5xl" : "text-4xl md:text-6xl";
  const cardRadius = layout === "minimal" ? "rounded-lg" : "rounded-2xl";
  const showGlow = layout !== "minimal";

  const waHref = waLink(site.waNumber, `مرحبًا، أرغب في الاستفسار عن خدمات ${site.salonName}`, site.waCountryCode);

  return (
    <div className="min-h-screen text-foreground" dir="rtl" style={settingsToCssVars(site)}>
      {/* Header — Prominent logo & salon name */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between gap-3">
          <Link to="/site" className="flex items-center gap-3 md:gap-4 min-w-0">
            <div
              className={cn("size-14 md:size-16 rounded-2xl grid place-items-center overflow-hidden shrink-0 ring-2 ring-white/60", showGlow && "shadow-[var(--shadow-glow)]")}
              style={{ background: `linear-gradient(135deg, ${site.primary}, ${site.accent})` }}
            >
              {site.logoUrl
                ? <img src={site.logoUrl} alt={site.salonName} className="w-full h-full object-cover" />
                : <Scissors className="size-7 text-white drop-shadow" />}
            </div>
            <div className="min-w-0">
              <div className="font-black text-xl md:text-2xl leading-tight tracking-tight truncate" style={{ background: `linear-gradient(90deg, ${site.primary}, ${site.accent})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                {site.salonName}
              </div>
              <div className="text-[11px] md:text-xs text-muted-foreground truncate">{site.branchName}</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <a href={waHref} target="_blank" rel="noreferrer" className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-success/40 text-success text-sm hover:bg-success/10">
              <MessageCircle className="size-4" /> واتساب
            </a>
            <Link to="/login" className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm hover:bg-muted">
              <LogIn className="size-4" /> دخول
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 h-10 px-5 rounded-lg text-white text-sm font-semibold" style={{ background: `linear-gradient(90deg, ${site.primary}, ${site.accent})` }}>
              <CalendarDays className="size-4" /> احجزي
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — split layout with big brand and image */}
      <section className="relative overflow-hidden">
        {showGlow && (
          <>
            <div className="absolute -top-20 -right-20 size-96 rounded-full blur-3xl opacity-40" style={{ background: site.primary }} />
            <div className="absolute -bottom-32 -left-20 size-96 rounded-full blur-3xl opacity-30" style={{ background: site.accent }} />
          </>
        )}
        <div className={cn("relative max-w-6xl mx-auto px-4 md:px-8 grid md:grid-cols-2 gap-10 items-center", heroPad)}>
          <div className="text-center md:text-right order-2 md:order-1">
            {/* Prominent brand block */}
            <div className="inline-flex items-center gap-3 mb-5">
              <div
                className={cn("size-16 rounded-2xl grid place-items-center overflow-hidden ring-2 ring-white/60", showGlow && "shadow-[var(--shadow-glow)]")}
                style={{ background: `linear-gradient(135deg, ${site.primary}, ${site.accent})` }}
              >
                {site.logoUrl
                  ? <img src={site.logoUrl} alt={site.salonName} className="w-full h-full object-cover" />
                  : <Scissors className="size-8 text-white" />}
              </div>
              <div className="text-right">
                <div className="font-black text-2xl md:text-3xl leading-none" style={{ background: `linear-gradient(90deg, ${site.primary}, ${site.accent})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                  {site.salonName}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{site.branchName}</div>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs font-semibold" style={{ color: site.primary }}>
              <Sparkles className="size-3.5" /> {site.tagline}
            </span>
            <h1 className={cn("mt-5 font-black tracking-tight", heroTitleSize)}>
              لمستك{" "}
              <span style={{ background: `linear-gradient(90deg, ${site.primary}, ${site.accent})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                الخاصة
              </span>
              <br />
              بأيدي خبيرات
            </h1>
            <p className="mt-5 max-w-xl mx-auto md:mx-0 text-muted-foreground">
              احجزي خدمات الشعر والمكياج والعناية بالبشرة والأظافر في دقائق. أخصائيات معتمدات وأجواء راقية بانتظارك.
            </p>
            <div className="mt-8 flex items-center justify-center md:justify-start gap-3 flex-wrap">
              <Link to="/login" className="inline-flex items-center gap-2 h-12 px-7 rounded-lg text-white font-semibold" style={{ background: `linear-gradient(90deg, ${site.primary}, ${site.accent})`, boxShadow: showGlow ? `0 20px 60px -20px ${site.primary}80` : undefined }}>
                احجزي موعد
              </Link>
              <a href="#services" className="inline-flex items-center gap-2 h-12 px-7 rounded-lg border border-border font-semibold hover:bg-muted">
                تصفحي الخدمات
              </a>
              <a href={waHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 h-12 px-7 rounded-lg border border-success/40 text-success font-semibold hover:bg-success/10">
                <MessageCircle className="size-4" /> واتساب
              </a>
            </div>
            <div className="mt-8 flex items-center justify-center md:justify-start gap-6 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1.5"><Star className="size-4 fill-current" style={{ color: site.accent }} /> 4.9 تقييم</div>
              <div className="flex items-center gap-1.5"><Sparkles className="size-4" style={{ color: site.accent }} /> +2000 عميلة</div>
              <div className="flex items-center gap-1.5"><Clock className="size-4" style={{ color: site.primary }} /> {site.hours}</div>
            </div>
          </div>

          {/* Hero visual collage */}
          <div className="order-1 md:order-2 relative">
            <div className="grid grid-cols-6 grid-rows-6 gap-3 aspect-square max-w-md mx-auto">
              {site.heroImage && (
                <div className={cn("col-span-6 row-span-4 overflow-hidden ring-4 ring-white/50", cardRadius, showGlow && "shadow-[var(--shadow-glow)]")}>
                  <img src={site.heroImage} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              {site.showcase.slice(0, 2).map((it, i) => (
                <div key={i} className={cn("col-span-3 row-span-2 overflow-hidden ring-2 ring-white/50", cardRadius)}>
                  <img src={it.url} alt={it.label} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Showcase — beauty categories with images */}
      {site.showcase.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-14">
          <div className="text-center mb-10">
            <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase mb-2" style={{ color: site.primary }}>Beauty Showcase</span>
            <h2 className="text-3xl md:text-4xl font-black">لمسات من إبداعنا</h2>
            <p className="text-muted-foreground mt-2">تصفيفات شعر، مكياج، وعناية شاملة بأيدي محترفات</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {site.showcase.map((it, i) => (
              <div key={i} className={cn("group relative overflow-hidden border border-border aspect-[3/4]", cardRadius)}>
                <img src={it.url} alt={it.label} className="w-full h-full object-cover group-hover:scale-110 transition duration-700" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-0 right-0 left-0 p-4">
                  <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-white backdrop-blur-md" style={{ background: `linear-gradient(90deg, ${site.primary}CC, ${site.accent}CC)` }}>
                    <Sparkles className="size-3" /> {it.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      <section id="services" className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">خدماتنا</h2>
          <p className="text-muted-foreground mt-2">مجموعة كاملة من خدمات التجميل الفاخرة</p>
        </div>
        <div className="space-y-10">
          {categories.map(([cat, list]) => (
            <div key={cat}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="size-1.5 rounded-full" style={{ background: `linear-gradient(90deg, ${site.primary}, ${site.accent})` }} />
                {cat}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((s) => (
                  <div key={s.id} className={cn("glass-card p-5 group hover:border-primary/40 transition", cardRadius)}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-bold text-base">{s.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="size-3" /> {s.durationMin} دقيقة
                        </div>
                      </div>
                      <div className="text-lg font-bold whitespace-nowrap" style={{ background: `linear-gradient(90deg, ${site.primary}, ${site.accent})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                        {formatSAR(s.price)}
                      </div>
                    </div>
                    <Link to="/login" className="mt-4 w-full inline-flex items-center justify-center h-9 rounded-lg bg-muted/40 border border-border text-xs font-semibold hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition">
                      احجزي الآن
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Gallery */}
      {site.gallery.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 md:px-8 py-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold">من داخل الصالون</h2>
            <p className="text-muted-foreground mt-2">لقطات من أجوائنا وأعمالنا</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {site.gallery.map((url, i) => (
              <div key={i} className={cn("overflow-hidden border border-border aspect-square", cardRadius)}>
                <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition duration-500" loading="lazy" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Team */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">فريقنا</h2>
          <p className="text-muted-foreground mt-2">أخصائيات خبيرات لخدمتك</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {staff.filter((s) => s.active).map((s) => (
            <div key={s.id} className={cn("glass-card p-5 text-center", cardRadius)}>
              <div
                className={cn("mx-auto size-20 rounded-full grid place-items-center text-white text-2xl font-bold", showGlow && "shadow-[var(--shadow-glow)]")}
                style={{ background: `linear-gradient(135deg, ${site.primary}, ${site.accent})` }}
              >
                {s.name.charAt(0)}
              </div>
              <div className="mt-3 font-bold">{s.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact / Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-3">
            <MapPin className="size-5 shrink-0 mt-0.5" style={{ color: site.primary }} />
            <div>
              <div className="font-semibold text-sm">العنوان</div>
              <div className="text-xs text-muted-foreground mt-1">{site.address}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="size-5 shrink-0 mt-0.5" style={{ color: site.primary }} />
            <div>
              <div className="font-semibold text-sm">للتواصل</div>
              <div className="text-xs text-muted-foreground mt-1">{site.phone}</div>
              <a href={waHref} target="_blank" rel="noreferrer" className="text-xs text-success mt-1 inline-flex items-center gap-1">
                <MessageCircle className="size-3" /> راسلينا واتساب
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="size-5 shrink-0 mt-0.5" style={{ color: site.primary }} />
            <div>
              <div className="font-semibold text-sm">مواعيد العمل</div>
              <div className="text-xs text-muted-foreground mt-1">{site.hours}</div>
            </div>
          </div>
        </div>
        <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
          © 2026 {site.salonName} — جميع الحقوق محفوظة
        </div>
      </footer>
    </div>
  );
}
