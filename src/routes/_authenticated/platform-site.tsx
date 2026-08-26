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
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/salon/app-shell";
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
  BUTTON_STYLES,
  FONT_OPTIONS,
  PLAN_CARD_STYLES,
  RADIUS_OPTIONS,
  primaryButtonClass,
  planCardClass,
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
  const loaded = usePlatformSettings();
  const [form, setForm] = useState<PlatformSettings>(EMPTY_PLATFORM_SETTINGS);

  useEffect(() => {
    if (loaded.data) setForm(loaded.data);
  }, [loaded.data]);

  const save = useMutation({
    mutationFn: () => savePlatformSettings(form),
    onSuccess: () => {
      toast.success("تم حفظ هوية الموقع");
      void qc.invalidateQueries({ queryKey: PLATFORM_SETTINGS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const home = form.home;
  const setHome = <K extends keyof PlatformHome>(k: K, v: PlatformHome[K]) =>
    setForm((f) => ({ ...f, home: { ...f.home, [k]: v } }));

  const features = home.features ?? [];
  const included = home.includedItems ?? [];
  const seo = home.seo ?? {};
  const setSeo = <K extends keyof PlatformSeo>(k: K, v: string) =>
    setHome("seo", { ...seo, [k]: v } as PlatformSeo);
  const navLinks = home.navLinks ?? [];
  const theme = home.theme ?? {};
  const setTheme = <K extends keyof PlatformTheme>(k: K, v: string) =>
    setHome("theme", { ...theme, [k]: v } as PlatformTheme);

  const defaultLang = home.defaultLang ?? "ar";
  const enabled = home.languages ?? ["ar"];
  const [trLang, setTrLang] = useState<string>(
    PLATFORM_LANGS.find((l) => l.code !== defaultLang)?.code ?? "en",
  );
  const tr = home.translations?.[trLang] ?? {};
  const setTr = <K extends keyof PlatformLocaleContent>(k: K, v: PlatformLocaleContent[K]) =>
    setHome("translations", {
      ...(home.translations ?? {}),
      [trLang]: { ...tr, [k]: v },
    });


  if (!isOwner) {
    return (
      <AppShell title="هوية الموقع الرئيسي" subtitle="مخصصة لمالك المنصة">
        <p className="text-sm text-muted-foreground">هذه الصفحة متاحة لمالك المنصة فقط.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
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
          <Field
            label="عنوان الصفحة (Title)"
            value={seo.title ?? ""}
            onChange={(v) => setSeo("title", v)}
            placeholder="أقل من 60 حرفًا"
          />
          <Field
            label="وصف الصفحة (Meta description)"
            value={seo.description ?? ""}
            onChange={(v) => setSeo("description", v)}
            placeholder="أقل من 160 حرفًا"
            multiline
          />
          <Field
            label="الكلمات المفتاحية (اختياري)"
            value={seo.keywords ?? ""}
            onChange={(v) => setSeo("keywords", v)}
            placeholder="إدارة صالونات، حجوزات، فواتير ضريبية"
          />
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
            قد تحتاج منصات التواصل بعض الوقت لتحديث معاينة الرابط بعد تغيير الصورة أو العنوان.
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

    </AppShell>
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
