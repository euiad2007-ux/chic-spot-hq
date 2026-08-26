import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Scissors,
  CalendarDays,
  Users2,
  Receipt,
  Package,
  Wallet,
  ShieldCheck,
  ArrowLeft,
  Building2,
  Check,
  Sparkles,
  Languages,
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";

import { PlansShowcase } from "@/components/platform/plans-showcase";
import {
  PlatformContactCard,
  usePlatformSettings,
} from "@/components/platform/platform-contact-card";
import {
  EMPTY_PLATFORM_SETTINGS,
  listPublicPlans,
  loadPlatformSettings,
  resolvePlatformContent,
  PLATFORM_LANGS,
} from "@/lib/db/platform-settings-repo";
import {
  fontHref,
  primaryButtonClass,
  secondaryButtonClass,
  themeVars,
} from "@/lib/platform-theme";
import { supabase } from "@/integrations/supabase/client";
import { loadAccount, homeForRole } from "@/lib/account";
import { resolveTenant } from "@/lib/tenant-domain";

import heroImg from "@/assets/platform-hero.jpg";
import dashboardImg from "@/assets/platform-dashboard.jpg";
import posImg from "@/assets/platform-pos.jpg";

const FALLBACK_TITLE = "Salon Flow — منصة إدارة المشاغل والصالونات";
const FALLBACK_DESC =
  "منصة سحابية لملاك المشاغل: حجوزات بلا تعارض، فواتير ضريبية، فروع متعددة، مخزون، رواتب وحضور، محافظ ونقاط ولاء.";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { lang?: string } =>
    typeof search.lang === "string" ? { lang: search.lang } : {},

  loaderDeps: ({ search }) => ({ lang: search.lang }),
  loader: async ({ deps }) => {
    let settings = EMPTY_PLATFORM_SETTINGS;
    try {
      settings = await loadPlatformSettings();
    } catch {
      /* landing page still renders with built-in copy */
    }
    const lang = deps.lang ?? settings.home?.defaultLang ?? "ar";
    const { brandName, seo, home } = resolvePlatformContent(settings, lang);
    return {
      lang,
      title: seo.title?.trim() || `${brandName} — ${home.tagline || "منصة إدارة المشاغل والصالونات"}`,
      description: seo.description?.trim() || home.subheadline?.trim() || FALLBACK_DESC,
      keywords: seo.keywords?.trim() || "",
      ogTitle: seo.ogTitle?.trim() || seo.title?.trim() || brandName,
      ogDescription: seo.ogDescription?.trim() || seo.description?.trim() || FALLBACK_DESC,
      ogImage: seo.ogImageUrl?.trim() || "",
    };
  },
  head: ({ loaderData }) => {
    const d = loaderData;
    return {
      meta: [
        { title: d?.title || FALLBACK_TITLE },
        { name: "description", content: d?.description || FALLBACK_DESC },
        ...(d?.keywords ? [{ name: "keywords", content: d.keywords }] : []),
        { property: "og:title", content: d?.ogTitle || FALLBACK_TITLE },
        { property: "og:description", content: d?.ogDescription || FALLBACK_DESC },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "https://novaa.live/" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(d?.ogImage
          ? [
              { property: "og:image", content: d.ogImage },
              { name: "twitter:image", content: d.ogImage },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: "https://novaa.live/" }],
    };
  },
  component: Landing,
});


const features = [
  { icon: CalendarDays, title: "حجوزات ذكية", desc: "منع تعارض مواعيد الموظفين تلقائيًا وترقيم حجوزات تسلسلي." },
  { icon: Building2, title: "فروع متعددة", desc: "لكل فرع موظفوه وخدماته وصندوقه وتقاريره المستقلة." },
  { icon: Receipt, title: "فواتير وضريبة", desc: "ترقيم تسلسلي، ضريبة القيمة المضافة، فواتير إلكترونية ZATCA." },
  { icon: Users2, title: "موظفون ورواتب", desc: "حضور بالموقع الجغرافي، عمولات، بدلات وكشوف رواتب شهرية." },
  { icon: Package, title: "مخزون دقيق", desc: "وحدات قياس مرنة، خصم تلقائي عند تنفيذ الخدمة وتنبيهات النقص." },
  { icon: Wallet, title: "محافظ وولاء", desc: "محفظة لكل عميل بسجل حركات كامل ونقاط ولاء وإحالات." },
];

const included = [
  "موقع إلكتروني جاهز لكل مشغل بهويته وألوانه",
  "لوحة دخول خاصة بالموظفين والعملاء",
  "برنامج محاسبي كامل وتقارير مالية",
  "نقطة بيع وصندوق ورديات",
];

function Landing() {
  const navigate = useNavigate();
  const settings = usePlatformSettings();
  const { lang } = Route.useSearch();
  const plans = useQuery({ queryKey: ["public-plans"], queryFn: listPublicPlans });
  const base = settings.data ?? EMPTY_PLATFORM_SETTINGS;
  const activeLang = lang ?? base.home?.defaultLang ?? "ar";
  const resolved = resolvePlatformContent(base, activeLang);
  const home = resolved.home;
  const brand = resolved.brandName || "Salon Flow";
  const dir = resolved.dir;
  const enabledLangs = PLATFORM_LANGS.filter(
    (l) => (home.languages ?? ["ar"]).includes(l.code) || l.code === activeLang,
  );
  const navLinks = (home.navLinks ?? []).filter((l) => l.label.trim() && l.href.trim());
  // Owner-managed content falls back to the built-in copy and artwork.
  const customFeatures = (home.features ?? []).filter((f) => f.title.trim());
  const featureCards = customFeatures.length
    ? customFeatures.map((f) => ({ icon: Sparkles, title: f.title, desc: f.desc ?? "" }))
    : features;
  const includedItems = (home.includedItems ?? []).filter((i) => i.trim());
  const includedList = includedItems.length ? includedItems : included;
  const theme = home.theme;
  const btnPrimary = primaryButtonClass(theme);
  const btnSecondary = secondaryButtonClass(theme);

  // The owner-selected web font is loaded on demand.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const href = fontHref(theme?.font);
    if (!href) return;
    let link = document.querySelector<HTMLLinkElement>('link[data-platform-font="1"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.dataset["platformFont"] = "1";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [theme?.font]);

  // The platform's own favicon completes its brand identity.
  useEffect(() => {
    if (typeof document === "undefined" || !home.faviconUrl) return;
    let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = home.faviconUrl;
  }, [home.faviconUrl]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const tenant = await resolveTenant();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        // Reached through a salon's own domain: show that salon's website,
        // never the platform landing page.
        if (tenant) {
          const q = new URLSearchParams(window.location.search).get("tenant");
          window.location.replace(q ? `/site?tenant=${encodeURIComponent(q)}` : "/site");
        }
        return;
      }
      const account = await loadAccount();
      if (!account || cancelled) return;
      navigate({ to: homeForRole(account.role), replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main dir={dir} style={themeVars(theme)} className="min-h-screen bg-background text-foreground">
      <header className="h-16 border-b border-border flex items-center justify-between gap-3 px-4 sm:px-8">
        <div className="flex items-center gap-3">
          {home.logoUrl ? (
            <img src={home.logoUrl} alt={brand} className="h-11 w-auto object-contain" />
          ) : (
            <span className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Scissors className="size-5 text-primary-foreground" />
            </span>
          )}
          <span className="leading-tight">
            <span className="block font-extrabold text-lg gradient-text">{brand}</span>
            {home.tagline && (
              <span className="block text-[11px] text-muted-foreground">{home.tagline}</span>
            )}
          </span>
        </div>
        {navLinks.length > 0 && (
          <nav className="hidden md:flex items-center gap-4 text-sm">
            {navLinks.map((l) => (
              <a key={`${l.label}-${l.href}`} href={l.href} className="hover:text-primary">
                {l.label}
              </a>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-2">
          {enabledLangs.length > 1 && (
            <div className="hidden sm:flex items-center gap-1 rounded-lg border border-border p-1">
              <Languages className="size-3.5 text-muted-foreground mx-1" />
              {enabledLangs.map((l) => (
                <Link
                  key={l.code}
                  to="/"
                  search={{ lang: l.code }}
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    l.code === activeLang ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          )}
          <Link
            to="/auth"
            className="hidden sm:inline-flex h-10 items-center px-4 rounded-lg border border-border text-sm hover:bg-muted"
          >
            دخول الملاك
          </Link>
          <Link
            to="/auth"
            className={`inline-flex h-10 items-center px-5 text-sm ${btnPrimary}`}
          >
            سجّل مشغلك
          </Link>
        </div>
      </header>


      <section className="relative overflow-hidden">
        <img
          src={home.heroImageUrl || heroImg}
          alt="صالون تجميل فاخر بإضاءة ذهبية وكراسي بلون الليلك"
          width={1600}
          height={1008}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-background/95 via-background/85 to-background/60" />
        <div className="relative px-4 sm:px-8 py-20 sm:py-28 max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
            {home.heroBadge || "منصة SaaS لملاك المشاغل والصالونات"}
          </span>
          <h1 className="mt-6 text-3xl sm:text-5xl font-extrabold leading-tight">
            {home.headline || (
              <>
                أدِر مشغلك وفروعك من <span className="gradient-text">لوحة واحدة</span>
              </>
            )}
          </h1>
          <p className="mt-5 text-muted-foreground text-sm sm:text-base leading-relaxed whitespace-pre-line">
            {home.subheadline ||
              "حجوزات، خدمات لكل فرع، موظفون، رواتب، مخزون، فواتير ضريبية، محافظ ونقاط ولاء — مع موقع إلكتروني جاهز لكل مشغل وعزل كامل للبيانات."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/auth"
              className={`inline-flex h-12 items-center gap-2 px-7 ${btnPrimary}`}
            >
              {home.ctaLabel || "ابدأ تجربة 30 يومًا"}
              <ArrowLeft className="size-4" />
            </Link>
            <Link
              to="/site"
              className={`inline-flex h-12 items-center px-7 ${btnSecondary}`}
            >
              {home.ctaSecondaryLabel || "استعراض موقع صالون"}
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground whitespace-pre-line">
            {home.heroNote ||
              "التسجيل هنا لملاك المشاغل فقط — الموظفون والعملاء يدخلون من صفحة دخول المشغل."}
          </p>
        </div>
      </section>

      {home.showFeatures !== false && (
        <section className="px-4 sm:px-8 py-16 max-w-5xl mx-auto">
          {home.featuresTitle && (
            <h2 className="mb-8 text-2xl sm:text-3xl font-extrabold text-center">
              {home.featuresTitle}
            </h2>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((f) => (
              <article key={f.title} className="rounded-2xl border border-border bg-card/70 p-5">
                <span className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {home.showShowcase !== false && (
      <section className="px-4 sm:px-8 pb-16 max-w-6xl mx-auto grid gap-6 lg:grid-cols-2 items-center">
        <div className="rounded-3xl overflow-hidden border border-border">
          <img
            src={home.showcaseImageUrl || dashboardImg}
            alt="مالكة مشغل تستعرض لوحة التحكم والتقارير على الحاسب"
            loading="lazy"
            width={1200}
            height={900}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            {home.showcaseTitle || "كل ما يحتاجه مشغلك جاهز من اليوم الأول"}
          </h2>
          <ul className="mt-5 space-y-3">
            {includedList.map((i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="size-4 mt-0.5 text-primary shrink-0" />
                <span>{i}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/auth"
            className="mt-7 inline-flex h-11 items-center gap-2 px-6 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm"
          >
            أنشئ حساب مالك المشغل <ArrowLeft className="size-4" />
          </Link>
        </div>
      </section>
      )}

      {home.showPos !== false && (
      <section className="px-4 sm:px-8 pb-20 max-w-6xl mx-auto grid gap-6 lg:grid-cols-2 items-center">
        <div className="order-2 lg:order-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            {home.posTitle || "نقطة بيع وفواتير متوافقة مع الضريبة"}
          </h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {home.posText ||
              "بِع الخدمات والمنتجات من شاشة واحدة، اطبع الفاتورة على طابعة حرارية، وأصدر فواتير إلكترونية بـ QR متوافقة مع متطلبات الفاتورة الضريبية."}
          </p>
          <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            بيانات كل مشغل معزولة بصلاحيات على مستوى قاعدة البيانات
          </div>
        </div>
        <div className="order-1 lg:order-2 rounded-3xl overflow-hidden border border-border">
          <img
            src={home.posImageUrl || posImg}
            alt="طابعة فواتير ودفع إلكتروني على كاونتر صالون"
            loading="lazy"
            width={1200}
            height={900}
            className="w-full h-full object-cover"
          />
        </div>
      </section>
      )}

      {home.showPlans !== false && (
      <section id="plans" className="px-4 sm:px-8 pb-20 max-w-6xl mx-auto">
        <PlansShowcase
          plans={plans.data ?? []}
          title={home.plansTitle || "باقات الاشتراك"}
          note={
            home.plansNote ||
            "اختر الباقة المناسبة لحجم مشغلك — تُفعّل الأقسام والحدود تلقائيًا حسب الباقة."
          }
        />
      </section>
      )}

      {home.showContact !== false && (
      <section className="px-4 sm:px-8 pb-20 max-w-3xl mx-auto space-y-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center">
          {home.contactTitle || "الاشتراك والتواصل"}
        </h2>
        {settings.data && <PlatformContactCard settings={settings.data} />}
      </section>
      )}

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        {home.footerText || `© ${new Date().getFullYear()} ${brand} — جميع الحقوق محفوظة`}
      </footer>
    </main>
  );
}
