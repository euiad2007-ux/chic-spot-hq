import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  ImageIcon,
  LayoutTemplate,
  Phone,
  Sparkles,
  Plus,
  Trash2,
  ToggleRight,
  Type,
  Search,
  Languages,
  Link2,
  Palette,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { generateSeoContent } from "@/lib/seo-ai.functions";
import { OwnerShell } from "@/components/platform/owner-shell";
import { SettingsLoadingScreen } from "@/components/salon/settings-loading-screen";
import { ImageUploadField } from "@/components/platform/image-upload-field";
import {
  usePlatformSettings,
  PLATFORM_SETTINGS_KEY,
} from "@/components/platform/platform-contact-card";
import { useAccount } from "@/hooks/use-account";
import {
  EMPTY_PLATFORM_SETTINGS,
  savePlatformSettings,
  PLATFORM_LANGS,
  type PlatformHome,
  type PlatformLocaleContent,
  type PlatformSeo,
  type PlatformSettings,
} from "@/lib/db/platform-settings-repo";
import {
  BRAND_SIZES,
  BUTTON_STYLES,
  FONT_OPTIONS,
  PLAN_CARD_STYLES,
  RADIUS_OPTIONS,
  brandNameStyle,
  brandUsesGradient,
  primaryButtonClass,
  planCardClass,
  planCardStyleVars,
  planPriceStyle,
  planTitleStyle,
  secondaryButtonClass,
  themeVars,
  type PlatformTheme,
} from "@/lib/platform-theme";


export const Route = createFileRoute("/_authenticated/platform-site")({
  head: () => ({
    meta: [
      { title: "هوية الموقع الرئيسي — الاسم والشعار والأقسام | Salon Flow" },
      {
        name: "description",
        content:
          "ضبط هوية موقع المنصة: الاسم والشعار والصور وعناوين الأقسام وأرقام التواصل وإظهار أو إخفاء كل قسم.",
      },
      { property: "og:title", content: "هوية الموقع الرئيسي — Salon Flow" },
      {
        property: "og:description",
        content: "لوحة مالك المنصة لضبط الاسم والشعار وصور وأقسام الصفحة الرئيسية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlatformSitePage,
});

function PlatformSitePage() {
  const { data: account } = useAccount();
  const isOwner = account?.role === "platform_owner";
  const qc = useQueryClient();
  const loaded = usePlatformSettings(undefined, true);
  const [form, setForm] = useState<PlatformSettings>(EMPTY_PLATFORM_SETTINGS);
  const [settingsReady, setSettingsReady] = useState(false);
  const [trLang, setTrLang] = useState<string>("en");
  const [aiHint, setAiHint] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [kwDraft, setKwDraft] = useState("");
  const [aiExtra, setAiExtra] = useState<{
    features: { title: string; desc: string }[];
    includedItems: string[];
  } | null>(null);


  useEffect(() => {
    if (loaded.data && !loaded.isFetching) {
      setForm(loaded.data);
      setSettingsReady(true);
    }
  }, [loaded.data, loaded.isFetching]);

  const save = useMutation({
    mutationFn: () => savePlatformSettings(form),
    onSuccess: () => {
      qc.setQueryData(PLATFORM_SETTINGS_KEY, structuredClone(form));
      toast.success("تم حفظ هوية الموقع");
      void qc.invalidateQueries({ queryKey: PLATFORM_SETTINGS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loaded.isPending || loaded.isFetching || !settingsReady) {
    return <SettingsLoadingScreen label="جاري تحميل هوية الموقع المحفوظة…" />;
  }

  const home = form.home;
  const setHome = <K extends keyof PlatformHome>(k: K, v: PlatformHome[K]) =>
    setForm((f) => ({ ...f, home: { ...f.home, [k]: v } }));

  const features = home.features ?? [];
  const included = home.includedItems ?? [];
  const seo = home.seo ?? {};
  const setSeo = <K extends keyof PlatformSeo>(k: K, v: string) =>
    setHome("seo", { ...seo, [k]: v } as PlatformSeo);

  const keywords = (seo.keywords ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const setKeywords = (list: string[]) => setSeo("keywords", list.join("، "));
  const addKeyword = () => {
    const v = kwDraft.trim();
    if (!v) return;
    if (!keywords.includes(v)) setKeywords([...keywords, v]);
    setKwDraft("");
  };

  const aiSeo = {
    isPending: aiBusy,
    mutate: () => {
      setAiBusy(true);
      void (async () => {
        try {
          const draft = await generateSeoContent({
            data: {
              brandName: form.brandName || "Salon Flow",
              lang: home.defaultLang ?? "ar",
              tagline: home.tagline ?? undefined,
              headline: home.headline ?? undefined,
              subheadline: home.subheadline ?? undefined,
              features: (home.features ?? []).map((f) => f.title).filter(Boolean).slice(0, 20),
              services: (home.includedItems ?? []).slice(0, 20),
              extraHint: aiHint.trim() || undefined,
            },
          });
          setForm((f) => ({
            ...f,
            home: {
              ...f.home,
              seo: {
                ...(f.home.seo ?? {}),
                title: draft.title || f.home.seo?.title,
                description: draft.description || f.home.seo?.description,
                keywords: draft.keywords.length ? draft.keywords.join("، ") : f.home.seo?.keywords,
                ogTitle: draft.ogTitle || f.home.seo?.ogTitle,
                ogDescription: draft.ogDescription || f.home.seo?.ogDescription,
              },
            },
          }));
          setAiExtra({ features: draft.features, includedItems: draft.includedItems });
          toast.success("تم توليد المحتوى — راجعه ثم احفظ");
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setAiBusy(false);
        }
      })();
    },
  };

  const navLinks = home.navLinks ?? [];
  const theme = home.theme ?? {};
  const setTheme = <K extends keyof PlatformTheme>(k: K, v: string) =>
    setHome("theme", { ...theme, [k]: v } as PlatformTheme);
  const setThemeVal = <K extends keyof PlatformTheme>(k: K, v: PlatformTheme[K]) =>
    setHome("theme", { ...theme, [k]: v } as PlatformTheme);

  const defaultLang = home.defaultLang ?? "ar";
  const enabled = home.languages ?? ["ar"];
  const tr = home.translations?.[trLang] ?? {};
  const setTr = <K extends keyof PlatformLocaleContent>(k: K, v: PlatformLocaleContent[K]) =>
    setHome("translations", {
      ...(home.translations ?? {}),
      [trLang]: { ...tr, [k]: v },
    });


  if (!isOwner) {
    return (
      <OwnerShell title="هوية الموقع الرئيسي" subtitle="مخصصة لمالك المنصة">
        <p className="text-sm text-muted-foreground">هذه الصفحة متاحة لمالك المنصة فقط.</p>
      </OwnerShell>
    );
  }

  return (
    <OwnerShell
      title="هوية الموقع الرئيسي"
      subtitle="الاسم والشعار والصور وجميع الأقسام وأرقام التواصل"
      action={
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Save className="size-4" /> حفظ التغييرات
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <Card title="الهوية والشعار" icon={Sparkles}>
          <Field
            label="اسم المنصة"
            value={form.brandName}
            onChange={(v) => setForm((f) => ({ ...f, brandName: v }))}
          />
          <Field
            label="الوصف المختصر (تحت الاسم)"
            value={home.tagline ?? ""}
            onChange={(v) => setHome("tagline", v)}
            placeholder="منصة إدارة المشاغل والصالونات"
          />
          <ImageUploadField
            label="الشعار (Logo)"
            preset="logo"
            contain
            value={home.logoUrl ?? ""}
            onChange={(v) => setHome("logoUrl", v)}
          />
          <ImageUploadField
            label="أيقونة المتصفح (Favicon)"
            preset="favicon"
            contain
            value={home.faviconUrl ?? ""}
            onChange={(v) => setHome("faviconUrl", v)}
          />

        </Card>

        <Card title="الألوان والخطوط والأنماط" icon={Palette}>
          <div className="grid grid-cols-2 gap-3">
            <ColorField
              label="اللون الأساسي"
              value={theme.primary ?? "#a855f7"}
              onChange={(v) => setTheme("primary", v)}
            />
            <ColorField
              label="اللون المساعد"
              value={theme.accent ?? "#f472b6"}
              onChange={(v) => setTheme("accent", v)}
            />
            <ColorField
              label="لون الخلفية"
              value={theme.background ?? "#fdfaff"}
              onChange={(v) => setTheme("background", v)}
            />
            <ColorField
              label="لون النص"
              value={theme.foreground ?? "#211830"}
              onChange={(v) => setTheme("foreground", v)}
            />
            <ColorField
              label="لون البطاقات"
              value={theme.cardBg ?? "#ffffff"}
              onChange={(v) => setTheme("cardBg", v)}
            />
            <ColorField
              label="لون النصوص الثانوية"
              value={theme.mutedColor ?? "#6b6478"}
              onChange={(v) => setTheme("mutedColor", v)}
            />
          </div>

          <SelectField
            label="الخط"
            value={theme.font ?? "cairo"}
            onChange={(v) => setTheme("font", v)}
            options={FONT_OPTIONS.map((f) => ({ value: f.code, label: f.label }))}
          />
          <SelectField
            label="نمط الأزرار"
            value={theme.buttonStyle ?? "gradient"}
            onChange={(v) => setTheme("buttonStyle", v)}
            options={BUTTON_STYLES.map((b) => ({ value: b.code, label: b.label }))}
          />
          <SelectField
            label="نمط بطاقات الاشتراك"
            value={theme.planCardStyle ?? "bordered"}
            onChange={(v) => setTheme("planCardStyle", v)}
            options={PLAN_CARD_STYLES.map((c) => ({ value: c.code, label: c.label }))}
          />
          <SelectField
            label="انحناء الزوايا"
            value={theme.radius ?? "md"}
            onChange={(v) => setTheme("radius", v)}
            options={RADIUS_OPTIONS.map((r) => ({ value: r.code, label: r.label }))}
          />

          <RangeField
            label="شفافية صورة القسم الرئيسي"
            value={theme.heroImageOpacity ?? 100}
            onChange={(v) => setThemeVal("heroImageOpacity", v)}
          />
          <RangeField
            label="شفافية صور الأقسام"
            value={theme.imageOpacity ?? 100}
            onChange={(v) => setThemeVal("imageOpacity", v)}
          />

          {/* Live preview of the chosen colors, font and styles */}
          <div
            style={themeVars(theme)}
            className="rounded-xl border border-border bg-background p-4 space-y-3"
          >
            <p className="text-xs text-muted-foreground">معاينة مباشرة</p>
            <h3 className="text-lg font-extrabold text-foreground">{form.brandName || "اسم المنصة"}</h3>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex h-10 items-center px-5 text-sm ${primaryButtonClass(theme)}`}>
                {home.ctaLabel || "ابدأ الآن"}
              </span>
              <span className={`inline-flex h-10 items-center px-5 text-sm ${secondaryButtonClass(theme)}`}>
                {home.ctaSecondaryLabel || "تعرّف أكثر"}
              </span>
            </div>
            <div className={`${planCardClass(theme.planCardStyle, true)} text-sm`}>
              <div className="font-extrabold">باقة تجريبية</div>
              <div className="text-2xl font-extrabold">
                299 <span className="text-xs text-muted-foreground">ر.س / شهريًا</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            اتركها كما هي لاستخدام هوية المنصة الافتراضية. تُطبَّق الألوان والخطوط على الصفحة الرئيسية.
          </p>
        </Card>

        <Card title="اسم الموقع والشعار" icon={Type}>
          <SelectField
            label="خط اسم الموقع"
            value={theme.brandFont ?? theme.font ?? "cairo"}
            onChange={(v) => setTheme("brandFont", v)}
            options={FONT_OPTIONS.map((f) => ({ value: f.code, label: f.label }))}
          />
          <SelectField
            label="حجم اسم الموقع"
            value={theme.brandSize ?? "md"}
            onChange={(v) => setTheme("brandSize", v)}
            options={BRAND_SIZES.map((b) => ({ value: b.code, label: b.label }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={theme.brandGradient !== false && !theme.brandColor}
              onChange={(e) =>
                setHome("theme", {
                  ...theme,
                  brandGradient: e.target.checked,
                  brandColor: e.target.checked ? "" : (theme.brandColor || "#a855f7"),
                })
              }
              className="size-4 accent-[var(--primary)]"
            />
            تدرّج لوني لاسم الموقع
          </label>
          {theme.brandGradient === false || theme.brandColor ? (
            <ColorField
              label="لون اسم الموقع"
              value={theme.brandColor || "#a855f7"}
              onChange={(v) => setTheme("brandColor", v)}
            />
          ) : null}
          <RangeField
            label="ارتفاع الشعار (بكسل)"
            min={20}
            max={140}
            value={theme.logoHeight ?? 44}
            onChange={(v) => setThemeVal("logoHeight", v)}
          />
          <div
            style={themeVars(theme)}
            className="rounded-xl border border-border bg-background p-4 flex items-center gap-3"
          >
            {home.logoUrl && (
              <img
                src={home.logoUrl}
                alt=""
                style={{ height: `${theme.logoHeight ?? 44}px` }}
                className="w-auto object-contain"
              />
            )}
            <span
              style={brandNameStyle(theme)}
              className={`font-extrabold ${brandUsesGradient(theme) ? "gradient-text" : ""}`}
            >
              {form.brandName || "اسم المنصة"}
            </span>
          </div>
        </Card>

        <Card title="تخصيص بطاقات الاشتراك" icon={LayoutTemplate}>
          <SelectField
            label="نمط البطاقة"
            value={theme.planCardStyle ?? "bordered"}
            onChange={(v) => setTheme("planCardStyle", v)}
            options={PLAN_CARD_STYLES.map((c) => ({ value: c.code, label: c.label }))}
          />
          <SelectField
            label="خط البطاقات"
            value={theme.planFont ?? theme.font ?? "cairo"}
            onChange={(v) => setTheme("planFont", v)}
            options={FONT_OPTIONS.map((f) => ({ value: f.code, label: f.label }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <ColorField
              label="خلفية البطاقة"
              value={theme.planCardBg ?? "#ffffff"}
              onChange={(v) => setTheme("planCardBg", v)}
            />
            <ColorField
              label="لون الإطار"
              value={theme.planBorderColor ?? "#e8dff0"}
              onChange={(v) => setTheme("planBorderColor", v)}
            />
            <ColorField
              label="لون اسم الباقة"
              value={theme.planTitleColor ?? "#211830"}
              onChange={(v) => setTheme("planTitleColor", v)}
            />
            <ColorField
              label="لون السعر"
              value={theme.planPriceColor ?? "#a855f7"}
              onChange={(v) => setTheme("planPriceColor", v)}
            />
          </div>
          <div style={themeVars(theme)} className="rounded-xl border border-border bg-background p-4">
            <div
              style={planCardStyleVars(theme)}
              className={`${planCardClass(theme.planCardStyle, true)} text-sm`}
            >
              <div className="font-extrabold" style={planTitleStyle(theme)}>
                باقة تجريبية
              </div>
              <div className="text-2xl font-extrabold" style={planPriceStyle(theme)}>
                299 <span className="text-xs text-muted-foreground">ر.س / شهريًا</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="القسم الرئيسي (Hero)" icon={ImageIcon}>
          <Field
            label="الشريط العلوي الصغير"
            value={home.heroBadge ?? ""}
            onChange={(v) => setHome("heroBadge", v)}
            placeholder="منصة SaaS لملاك المشاغل"
          />
          <Field
            label="العنوان الرئيسي"
            value={home.headline ?? ""}
            onChange={(v) => setHome("headline", v)}
          />
          <Field
            label="النص التعريفي"
            value={home.subheadline ?? ""}
            onChange={(v) => setHome("subheadline", v)}
            multiline
          />
          <Field
            label="نص الزر الأساسي"
            value={home.ctaLabel ?? ""}
            onChange={(v) => setHome("ctaLabel", v)}
          />
          <Field
            label="نص الزر الثانوي"
            value={home.ctaSecondaryLabel ?? ""}
            onChange={(v) => setHome("ctaSecondaryLabel", v)}
            placeholder="استعراض موقع صالون"
          />
          <Field
            label="ملاحظة تحت الأزرار"
            value={home.heroNote ?? ""}
            onChange={(v) => setHome("heroNote", v)}
            multiline
          />
          <ImageUploadField
            label="صورة خلفية القسم الرئيسي"
            preset="hero"
            value={home.heroImageUrl ?? ""}
            onChange={(v) => setHome("heroImageUrl", v)}
          />

        </Card>

        <Card title="قسم المزايا" icon={LayoutTemplate}>
          <Field
            label="عنوان القسم"
            value={home.featuresTitle ?? ""}
            onChange={(v) => setHome("featuresTitle", v)}
            placeholder="لماذا Salon Flow؟"
          />
          <div className="space-y-3">
            {features.map((f, i) => (
              <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    value={f.title}
                    onChange={(e) => {
                      const next = [...features];
                      next[i] = { ...f, title: e.target.value };
                      setHome("features", next);
                    }}
                    placeholder="اسم الميزة"
                    className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                  <button
                    type="button"
                    aria-label="حذف الميزة"
                    onClick={() => setHome("features", features.filter((_, j) => j !== i))}
                    className="size-9 rounded-lg border border-border grid place-items-center text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <textarea
                  value={f.desc ?? ""}
                  onChange={(e) => {
                    const next = [...features];
                    next[i] = { ...f, desc: e.target.value };
                    setHome("features", next);
                  }}
                  placeholder="وصف مختصر"
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setHome("features", [...features, { title: "", desc: "" }])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
          >
            <Plus className="size-3.5" /> إضافة ميزة
          </button>
          <p className="text-[11px] text-muted-foreground">
            اتركها فارغة لعرض قائمة المزايا الافتراضية.
          </p>
        </Card>

        <Card title="قسم الصورة والمزايا المشمولة" icon={Type}>
          <Field
            label="العنوان"
            value={home.showcaseTitle ?? ""}
            onChange={(v) => setHome("showcaseTitle", v)}
          />
          <ImageUploadField
            label="صورة القسم"
            preset="wide"
            value={home.showcaseImageUrl ?? ""}
            onChange={(v) => setHome("showcaseImageUrl", v)}
          />

          <div className="space-y-2">
            {included.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={it}
                  onChange={(e) => {
                    const next = [...included];
                    next[i] = e.target.value;
                    setHome("includedItems", next);
                  }}
                  className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
                <button
                  type="button"
                  aria-label="حذف السطر"
                  onClick={() => setHome("includedItems", included.filter((_, j) => j !== i))}
                  className="size-9 rounded-lg border border-border grid place-items-center text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setHome("includedItems", [...included, ""])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
          >
            <Plus className="size-3.5" /> إضافة سطر
          </button>
        </Card>

        <Card title="قسم نقطة البيع والفواتير" icon={LayoutTemplate}>
          <Field
            label="العنوان"
            value={home.posTitle ?? ""}
            onChange={(v) => setHome("posTitle", v)}
          />
          <Field
            label="النص"
            value={home.posText ?? ""}
            onChange={(v) => setHome("posText", v)}
            multiline
          />
          <ImageUploadField
            label="صورة القسم"
            preset="wide"
            value={home.posImageUrl ?? ""}
            onChange={(v) => setHome("posImageUrl", v)}
          />

        </Card>

        <Card title="الباقات والتواصل والتذييل" icon={Phone}>
          <Field
            label="عنوان قسم الباقات"
            value={home.plansTitle ?? ""}
            onChange={(v) => setHome("plansTitle", v)}
          />
          <Field
            label="ملاحظة تحت الباقات"
            value={home.plansNote ?? ""}
            onChange={(v) => setHome("plansNote", v)}
            multiline
          />
          <Field
            label="عنوان قسم التواصل"
            value={home.contactTitle ?? ""}
            onChange={(v) => setHome("contactTitle", v)}
          />
          <Field label="رقم الجوال" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
          <Field
            label="رقم الواتساب"
            value={form.whatsapp}
            onChange={(v) => setForm((f) => ({ ...f, whatsapp: v }))}
          />
          <Field
            label="البريد الإلكتروني"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          />
          <Field
            label="ساعات الدعم"
            value={form.supportHours}
            onChange={(v) => setForm((f) => ({ ...f, supportHours: v }))}
            placeholder="الأحد - الخميس 9ص - 6م"
          />
          <Field
            label="نص التذييل"
            value={home.footerText ?? ""}
            onChange={(v) => setHome("footerText", v)}
          />
        </Card>

        <Card title="إظهار الأقسام" icon={ToggleRight}>
          {(
            [
              { key: "showFeatures" as const, label: "قسم المزايا" },
              { key: "showShowcase" as const, label: "قسم الصورة والمزايا المشمولة" },
              { key: "showPos" as const, label: "قسم نقطة البيع" },
              { key: "showPlans" as const, label: "قسم الباقات" },
              { key: "showContact" as const, label: "قسم التواصل والسداد" },
            ]
          ).map((s) => (
            <label
              key={s.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm"
            >
              <span>{s.label}</span>
              <input
                type="checkbox"
                checked={home[s.key] !== false}
                onChange={(e) => setHome(s.key, e.target.checked)}
                className="size-4 accent-primary"
              />
            </label>
          ))}
          <p className="text-[11px] text-muted-foreground">
            جميع الأقسام ظاهرة افتراضيًا — أزل التحديد لإخفاء القسم من الصفحة الرئيسية.
          </p>
        </Card>

        <Card title="تحسين محركات البحث (SEO)" icon={Search}>
          <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
            <p className="text-xs font-semibold flex items-center gap-1.5">
              <Wand2 className="size-3.5" /> توليد المحتوى بالذكاء الاصطناعي
            </p>
            <Field
              label="توجيه للذكاء الاصطناعي (اختياري)"
              value={aiHint}
              onChange={setAiHint}
              placeholder="مثال: نستهدف مشاغل الرياض وجدة، ركّز على الفواتير الضريبية والحجز الإلكتروني"
              multiline
            />
            <button
              type="button"
              onClick={() => aiSeo.mutate()}
              disabled={aiSeo.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Wand2 className="size-3.5" />
              {aiSeo.isPending ? "جاري التوليد…" : "توليد الوصف والكلمات المفتاحية"}
            </button>
            <p className="text-[11px] text-muted-foreground">
              يُقترح العنوان والوصف والكلمات المفتاحية بناءً على اسم المنصة ومحتوى الصفحة — ويمكنك تعديل
              كل شيء قبل الحفظ.
            </p>
          </div>

          <Field
            label="عنوان الصفحة (Title)"
            value={seo.title ?? ""}
            onChange={(v) => setSeo("title", v)}
            placeholder="أقل من 60 حرفًا"
          />
          <Field
            label="وصف الموقع (Meta description)"
            value={seo.description ?? ""}
            onChange={(v) => setSeo("description", v)}
            placeholder="أقل من 160 حرفًا"
            multiline
          />

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">الكلمات المفتاحية</span>
            <div className="flex flex-wrap gap-1.5">
              {keywords.length === 0 && (
                <span className="text-[11px] text-muted-foreground">لا توجد كلمات مفتاحية بعد.</span>
              )}
              {keywords.map((k, i) => (
                <span
                  key={`${k}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px]"
                >
                  {k}
                  <button
                    type="button"
                    aria-label={`حذف ${k}`}
                    onClick={() => setKeywords(keywords.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                value={kwDraft}
                onChange={(e) => setKwDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  addKeyword();
                }}
                placeholder="أضف كلمة مفتاحية ثم Enter"
                className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 h-9 text-xs"
              >
                <Plus className="size-3.5" /> إضافة
              </button>
            </div>
          </div>

          {aiExtra && (
            <div className="rounded-xl border border-border p-3 space-y-2">
              <p className="text-xs font-semibold">اقتراحات المزايا والخدمات</p>
              {aiExtra.features.length > 0 && (
                <div className="space-y-1">
                  <ul className="list-disc pr-4 text-[11px] text-muted-foreground space-y-0.5">
                    {aiExtra.features.map((f, i) => (
                      <li key={i}>
                        <span className="text-foreground font-medium">{f.title}</span>
                        {f.desc ? ` — ${f.desc}` : ""}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      setHome("features", aiExtra.features);
                      toast.success("تم تحديث قسم المزايا");
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-[11px]"
                  >
                    استبدال قسم المزايا بهذه الاقتراحات
                  </button>
                </div>
              )}
              {aiExtra.includedItems.length > 0 && (
                <div className="space-y-1">
                  <ul className="list-disc pr-4 text-[11px] text-muted-foreground space-y-0.5">
                    {aiExtra.includedItems.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      setHome("includedItems", aiExtra.includedItems);
                      toast.success("تم تحديث قائمة الخدمات المشمولة");
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-[11px]"
                  >
                    استبدال الخدمات المشمولة بهذه الاقتراحات
                  </button>
                </div>
              )}
            </div>
          )}

          <Field
            label="Open Graph — العنوان"
            value={seo.ogTitle ?? ""}
            onChange={(v) => setSeo("ogTitle", v)}
          />
          <Field
            label="Open Graph — الوصف"
            value={seo.ogDescription ?? ""}
            onChange={(v) => setSeo("ogDescription", v)}
            multiline
          />
          <ImageUploadField
            label="صورة المشاركة (og:image)"
            preset="og"
            value={seo.ogImageUrl ?? ""}
            onChange={(v) => setSeo("ogImageUrl", v)}
          />
          <p className="text-[11px] text-muted-foreground">
            خريطة الموقع متاحة على <span dir="ltr">/sitemap.xml</span> وتتحدث تلقائيًا مع صفحات المتاجر.
            قد تحتاج منصات التواصل بعض الوقت لتحديث معاينة الرابط.
          </p>
        </Card>


        <Card title="روابط الأقسام في الشريط العلوي" icon={Link2}>
          {navLinks.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={l.label}
                onChange={(e) => {
                  const next = [...navLinks];
                  next[i] = { ...l, label: e.target.value };
                  setHome("navLinks", next);
                }}
                placeholder="اسم القسم"
                className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <input
                value={l.href}
                onChange={(e) => {
                  const next = [...navLinks];
                  next[i] = { ...l, href: e.target.value };
                  setHome("navLinks", next);
                }}
                placeholder="#plans"
                dir="ltr"
                className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
              />
              <button
                type="button"
                aria-label="حذف الرابط"
                onClick={() => setHome("navLinks", navLinks.filter((_, j) => j !== i))}
                className="size-9 rounded-lg border border-border grid place-items-center text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setHome("navLinks", [...navLinks, { label: "", href: "" }])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
          >
            <Plus className="size-3.5" /> إضافة رابط
          </button>
        </Card>

        <Card title="اللغات والترجمات" icon={Languages}>
          <div className="space-y-2">
            {PLATFORM_LANGS.map((l) => (
              <label
                key={l.code}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm"
              >
                <span>
                  {l.label}
                  {l.code === defaultLang && (
                    <span className="ms-2 text-[11px] text-muted-foreground">(اللغة الأساسية)</span>
                  )}
                </span>
                <input
                  type="checkbox"
                  checked={enabled.includes(l.code) || l.code === defaultLang}
                  disabled={l.code === defaultLang}
                  onChange={(e) =>
                    setHome(
                      "languages",
                      e.target.checked
                        ? [...new Set([...enabled, l.code])]
                        : enabled.filter((c) => c !== l.code),
                    )
                  }
                  className="size-4 accent-primary"
                />
              </label>
            ))}
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">تحرير ترجمة لغة</span>
            <select
              value={trLang}
              onChange={(e) => setTrLang(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
            >
              {PLATFORM_LANGS.filter((l) => l.code !== defaultLang).map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <Field label="اسم المنصة" value={tr.brandName ?? ""} onChange={(v) => setTr("brandName", v)} />
          <Field label="الوصف المختصر" value={tr.tagline ?? ""} onChange={(v) => setTr("tagline", v)} />
          <Field label="العنوان الرئيسي" value={tr.headline ?? ""} onChange={(v) => setTr("headline", v)} />
          <Field
            label="النص التعريفي"
            value={tr.subheadline ?? ""}
            onChange={(v) => setTr("subheadline", v)}
            multiline
          />
          <Field label="نص الزر الأساسي" value={tr.ctaLabel ?? ""} onChange={(v) => setTr("ctaLabel", v)} />
          <Field
            label="نص الزر الثانوي"
            value={tr.ctaSecondaryLabel ?? ""}
            onChange={(v) => setTr("ctaSecondaryLabel", v)}
          />
          <Field
            label="عنوان قسم المزايا"
            value={tr.featuresTitle ?? ""}
            onChange={(v) => setTr("featuresTitle", v)}
          />
          <Field label="عنوان قسم الباقات" value={tr.plansTitle ?? ""} onChange={(v) => setTr("plansTitle", v)} />
          <Field
            label="عنوان قسم التواصل"
            value={tr.contactTitle ?? ""}
            onChange={(v) => setTr("contactTitle", v)}
          />
          <Field label="نص التذييل" value={tr.footerText ?? ""} onChange={(v) => setTr("footerText", v)} />
          <Field
            label="SEO — عنوان الصفحة"
            value={tr.seo?.title ?? ""}
            onChange={(v) => setTr("seo", { ...(tr.seo ?? {}), title: v })}
          />
          <Field
            label="SEO — وصف الصفحة"
            value={tr.seo?.description ?? ""}
            onChange={(v) => setTr("seo", { ...(tr.seo ?? {}), description: v })}
            multiline
          />
          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">روابط الأقسام بهذه اللغة</span>
            {(tr.navLinks ?? []).map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={l.label}
                  onChange={(e) => {
                    const next = [...(tr.navLinks ?? [])];
                    next[i] = { ...l, label: e.target.value };
                    setTr("navLinks", next);
                  }}
                  placeholder="Section name"
                  className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
                <input
                  value={l.href}
                  onChange={(e) => {
                    const next = [...(tr.navLinks ?? [])];
                    next[i] = { ...l, href: e.target.value };
                    setTr("navLinks", next);
                  }}
                  placeholder="#plans"
                  dir="ltr"
                  className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
                />
                <button
                  type="button"
                  aria-label="حذف الرابط"
                  onClick={() => setTr("navLinks", (tr.navLinks ?? []).filter((_, j) => j !== i))}
                  className="size-9 rounded-lg border border-border grid place-items-center text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setTr("navLinks", [...(tr.navLinks ?? []), { label: "", href: "" }])}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              <Plus className="size-3.5" /> إضافة رابط
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            الحقول الفارغة تعود تلقائيًا إلى نص اللغة الأساسية. تُعرض النسخة عبر ‎?lang=رمز اللغة‎
            ومن مبدّل اللغة في الشريط العلوي.
          </p>
        </Card>
      </div>

    </OwnerShell>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Save;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h2 className="font-bold flex items-center gap-2">
        <Icon className="size-4 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 rounded-lg border border-border bg-background p-1"
        />
        <input
          value={value}
          dir="ltr"
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 h-10 rounded-lg border border-border bg-background px-3 text-sm"
        />
      </span>
    </label>
  );
}

function RangeField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted-foreground flex items-center justify-between">
        <span>{label}</span>
        <span className="font-semibold text-foreground">{value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--primary)]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-background p-2.5 text-sm"
        />
      ) : (
        <input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
        />
      )}
    </label>
  );
}
