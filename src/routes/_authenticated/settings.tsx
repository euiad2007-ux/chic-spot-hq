import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { useSiteSettings, siteActions, waLink, fillTemplate, type LayoutStyle, type PaymentMethodId, THEME_PRESETS, FONT_OPTIONS, fontById } from "@/lib/site-settings";
import { useSalon } from "@/lib/salon-store";
import { useEffect, useRef, useState } from "react";
import { Palette, Image as ImageIcon, MessageCircle, Upload, Trash2, Save, RotateCcw, Send, ExternalLink, Sparkles, Layout, Store, Type, Check, CreditCard, Search } from "lucide-react";
import { HeroTab, SectionsTab, ContactTab, SeoTab } from "@/components/salon/site-cms-tabs";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PAYMENT_METHODS, PaymentIcon } from "@/components/salon/payment-icons";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "إعدادات الموقع — لمسة" },
      { name: "description", content: "تخصيص ألوان وشكل موقع الصالون، إدارة الصور، وإرسال رسائل واتساب." },
      { property: "og:title", content: "إعدادات الموقع" },
      { property: "og:description", content: "تخصيص كامل لموقع الصالون ورسائل واتساب." },
    ],
  }),
  component: SettingsPage,
});


const LAYOUTS: { id: LayoutStyle; name: string; desc: string }[] = [
  { id: "elegant", name: "فاخر", desc: "تدرّجات ناعمة وتوهّجات — الأنسب للصالونات الراقية" },
  { id: "minimal", name: "بسيط", desc: "مسطّح ونظيف مع تركيز على المحتوى" },
  { id: "bold", name: "جريء", desc: "ألوان قوية وعناوين ضخمة وحضور لافت" },
];

type TabId = "design" | "hero" | "sections" | "contact" | "seo" | "images" | "payments" | "wa";

function SettingsPage() {
  const s = useSiteSettings();
  const customers = useSalon((x) => x.customers);
  const [tab, setTab] = useState<TabId>("design");

  return (
    <AppShell
      title="إعدادات الموقع"
      subtitle="خصّص الهوية، الواجهة، الأقسام، الحجز، والـ SEO"
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (confirm("استعادة الإعدادات الافتراضية؟")) { siteActions.reset(); toast.success("تمت الاستعادة"); } }}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm hover:bg-muted"
          >
            <RotateCcw className="size-4" /> استعادة
          </button>
          <a
            href="/site"
            target="_blank"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold shadow-[var(--shadow-glow)]"
          >
            <ExternalLink className="size-4" /> معاينة الموقع
          </a>
        </div>
      }
    >
      {/* Tabs */}
      <div className="glass-card rounded-2xl p-1.5 mb-6 flex flex-wrap gap-1">
        {([
          { id: "design", label: "الهوية والشكل", icon: Palette },
          { id: "hero", label: "الواجهة", icon: Sparkles },
          { id: "sections", label: "الأقسام والمحتوى", icon: Layout },
          { id: "contact", label: "التواصل والحجز", icon: MessageCircle },
          { id: "seo", label: "SEO", icon: Search },
          { id: "images", label: "الصور", icon: ImageIcon },
          { id: "payments", label: "وسائل الدفع", icon: CreditCard },
          { id: "wa", label: "رسائل واتساب", icon: Send },
        ] as { id: TabId; label: string; icon: any }[]).map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium transition",
                active ? "bg-gradient-to-l from-primary/25 to-accent/15 text-foreground border border-primary/30" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "design" && <DesignTab s={s} />}
      {tab === "hero" && <HeroTab s={s} />}
      {tab === "sections" && <SectionsTab s={s} />}
      {tab === "contact" && <ContactTab s={s} />}
      {tab === "seo" && <SeoTab s={s} />}
      {tab === "images" && <ImagesTab s={s} />}
      {tab === "payments" && <PaymentsTab s={s} />}
      {tab === "wa" && <WhatsAppTab s={s} customers={customers} />}
    </AppShell>
  );
}


/* ---------------- Payments ---------------- */
function PaymentsTab({ s }: { s: ReturnType<typeof useSiteSettings> }) {
  const toggle = (id: PaymentMethodId) => {
    const set = new Set(s.paymentMethods);
    if (set.has(id)) set.delete(id); else set.add(id);
    siteActions.update({ paymentMethods: Array.from(set) });
  };
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <section className="glass-card rounded-2xl p-5 lg:col-span-2">
        <SectionHeader icon={CreditCard} title="وسائل الدفع المقبولة" />
        <p className="text-xs text-muted-foreground mb-4">اختاري وسائل الدفع التي يقبلها الصالون؛ ستظهر رموزها في تذييل الموقع لتعزيز الثقة.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PAYMENT_METHODS.map((m) => {
            const active = s.paymentMethods.includes(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggle(m.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border text-right transition",
                  active ? "border-primary/60 bg-primary/10 ring-1 ring-primary/40" : "border-border hover:border-primary/30",
                )}
              >
                <PaymentIcon id={m.id} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{m.labelAr}</div>
                  <div className="text-[11px] text-muted-foreground">{m.label}</div>
                </div>
                <span className={cn("size-5 rounded-md grid place-items-center border", active ? "bg-primary border-primary text-primary-foreground" : "border-border")}>
                  {active && <Check className="size-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="glass-card rounded-2xl p-5">
        <SectionHeader icon={Sparkles} title="معاينة" />
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="text-[11px] font-semibold text-muted-foreground mb-3">نقبل الدفع عبر</div>
          <div className="flex items-center gap-2 flex-wrap">
            {s.paymentMethods.length === 0 && <span className="text-xs text-muted-foreground">لم يتم اختيار وسائل دفع بعد</span>}
            {s.paymentMethods.map((id) => <PaymentIcon key={id} id={id} />)}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ---------------- Design ---------------- */
function DesignTab({ s }: { s: ReturnType<typeof useSiteSettings> }) {
  // Load Google Fonts for font preview thumbnails
  useEffect(() => {
    const id = "lamsa-settings-fonts";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    const families = FONT_OPTIONS.map((f) => `family=${f.google}`).join("&");
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
  }, []);

  const headingFamily = fontById(s.headingFont).family;
  const bodyFamily = fontById(s.bodyFont).family;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <section className="glass-card rounded-2xl p-5">
          <SectionHeader icon={Store} title="معلومات الصالون" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="اسم الصالون" value={s.salonName} onChange={(v) => siteActions.update({ salonName: v })} />
            <Field label="اسم الفرع" value={s.branchName} onChange={(v) => siteActions.update({ branchName: v })} />
            <Field label="الشعار (Tagline)" value={s.tagline} onChange={(v) => siteActions.update({ tagline: v })} className="md:col-span-2" />
            <Field label="رقم الجوال" value={s.phone} onChange={(v) => siteActions.update({ phone: v })} />
            <Field label="أوقات العمل" value={s.hours} onChange={(v) => siteActions.update({ hours: v })} />
            <Field label="العنوان" value={s.address} onChange={(v) => siteActions.update({ address: v })} className="md:col-span-2" />
          </div>
        </section>

        {/* Theme presets — full look with colors + fonts + layout */}
        <section className="glass-card rounded-2xl p-5">
          <SectionHeader icon={Sparkles} title="استايلات جاهزة للموقع" />
          <p className="text-xs text-muted-foreground mb-4">اختاري استايلاً كاملاً (ألوان + خطوط + شكل) بضغطة واحدة، ثم عدّلي أي تفصيل بحرية.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {THEME_PRESETS.map((p) => {
              const active = s.themePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => { siteActions.applyPreset(p.id); toast.success(`تم تطبيق استايل: ${p.name}`); }}
                  className={cn(
                    "relative text-right rounded-xl p-4 border transition overflow-hidden",
                    active ? "border-primary/70 ring-2 ring-primary/40 shadow-[var(--shadow-glow)]" : "border-border hover:border-primary/30",
                  )}
                  style={{ background: `linear-gradient(135deg, ${p.background}, ${p.surface})` }}
                >
                  {active && (
                    <span className="absolute top-2 left-2 size-6 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-lg">
                      <Check className="size-3.5" />
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="size-8 rounded-lg" style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.accent})` }} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm" style={{ color: p.textColor, fontFamily: fontById(p.headingFont).family }}>{p.name}</div>
                      <div className="text-[11px] leading-tight" style={{ color: p.mutedTextColor, fontFamily: fontById(p.bodyFont).family }}>{p.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[p.background, p.surface, p.primary, p.accent, p.textColor].map((c, i) => (
                      <span key={i} className="size-5 rounded-md border border-black/10" style={{ background: c }} />
                    ))}
                    <span className="mr-auto text-[10px] font-mono opacity-70" style={{ color: p.mutedTextColor }}>{p.layout}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Fonts */}
        <section className="glass-card rounded-2xl p-5">
          <SectionHeader icon={Type} title="الخطوط" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FontPicker
              title="خط العناوين"
              value={s.headingFont}
              onChange={(v) => siteActions.update({ headingFont: v })}
              sample={s.salonName || "جمالك يبدأ من هنا"}
              big
            />
            <FontPicker
              title="خط النصوص"
              value={s.bodyFont}
              onChange={(v) => siteActions.update({ bodyFont: v })}
              sample="نصوص الموقع والفقرات ستظهر بهذا الخط الأنيق."
            />
          </div>
          <div className="mt-4 rounded-xl border border-border p-4" style={{ background: s.background, color: s.textColor }}>
            <div className="text-2xl font-black" style={{ fontFamily: headingFamily }}>{s.salonName}</div>
            <p className="text-sm mt-1 opacity-90" style={{ fontFamily: bodyFamily }}>
              معاينة سريعة للنص باستخدام الخطوط المختارة — كيف يبدو العنوان والفقرة في موقعك.
            </p>
          </div>
        </section>

        {/* Colors */}
        <section className="glass-card rounded-2xl p-5">
          <SectionHeader icon={Palette} title="الألوان" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <ColorField label="اللون الأساسي" value={s.primary} onChange={(v) => siteActions.update({ primary: v })} />
            <ColorField label="اللون المميّز" value={s.accent} onChange={(v) => siteActions.update({ accent: v })} />
            <ColorField label="الخلفية" value={s.background} onChange={(v) => siteActions.update({ background: v })} />
            <ColorField label="الأسطح" value={s.surface} onChange={(v) => siteActions.update({ surface: v })} />
            <ColorField label="لون النص" value={s.textColor} onChange={(v) => siteActions.update({ textColor: v })} />
            <ColorField label="لون النص الثانوي" value={s.mutedTextColor} onChange={(v) => siteActions.update({ mutedTextColor: v })} />
          </div>
        </section>

        {/* Layout */}
        <section className="glass-card rounded-2xl p-5">
          <SectionHeader icon={Layout} title="شكل الموقع" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {LAYOUTS.map((l) => {
              const active = s.layout === l.id;
              return (
                <button
                  key={l.id}
                  onClick={() => siteActions.update({ layout: l.id })}
                  className={cn(
                    "text-right rounded-xl p-4 border transition",
                    active ? "border-primary/50 bg-primary/10 shadow-[var(--shadow-glow)]" : "border-border hover:border-primary/30",
                  )}
                >
                  <div className="font-bold text-sm mb-1">{l.name}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{l.desc}</div>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="lg:col-span-1">
        <div className="glass-card rounded-2xl p-4 sticky top-20">
          <SectionHeader icon={Sparkles} title="معاينة مباشرة" />
          <div
            className="rounded-xl p-5 border border-black/5 overflow-hidden relative"
            style={{ background: `linear-gradient(135deg, ${s.background}, ${s.surface})`, color: s.textColor }}
          >
            <div className="absolute -top-8 -right-8 size-32 rounded-full blur-3xl opacity-40" style={{ background: s.primary }} />
            <div className="absolute -bottom-10 -left-8 size-32 rounded-full blur-3xl opacity-30" style={{ background: s.accent }} />
            <div className="relative">
              <div className="size-10 rounded-xl grid place-items-center text-white font-bold mb-3" style={{ background: `linear-gradient(135deg, ${s.primary}, ${s.accent})` }}>
                ل
              </div>
              <div className="font-black text-xl" style={{ fontFamily: headingFamily }}>{s.salonName}</div>
              <div className="text-xs mt-1" style={{ color: s.mutedTextColor, fontFamily: bodyFamily }}>{s.tagline}</div>
              <p className="text-xs mt-3 leading-relaxed" style={{ fontFamily: bodyFamily }}>
                احجزي خدمات الشعر والمكياج والعناية بأيدي خبيرات.
              </p>
              <div className="mt-4 inline-flex h-9 px-4 rounded-lg items-center text-white text-xs font-semibold" style={{ background: `linear-gradient(90deg, ${s.primary}, ${s.accent})` }}>
                احجزي الآن
              </div>
            </div>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground text-center">التغييرات تنطبق فورًا على /site</div>
        </div>
      </div>
    </div>
  );
}

function FontPicker({ title, value, onChange, sample, big }: { title: string; value: string; onChange: (v: string) => void; sample: string; big?: boolean }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-2 block">{title}</label>
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
        {FONT_OPTIONS.map((f) => {
          const active = value === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onChange(f.id)}
              className={cn(
                "text-right rounded-lg p-3 border transition",
                active ? "border-primary/60 bg-primary/10 ring-1 ring-primary/40" : "border-border hover:border-primary/30",
              )}
            >
              <div className="text-[10px] text-muted-foreground mb-1">{f.name}</div>
              <div className={cn("truncate", big ? "text-lg font-bold" : "text-sm")} style={{ fontFamily: f.family }}>
                {sample}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Images ---------------- */
function ImagesTab({ s }: { s: ReturnType<typeof useSiteSettings> }) {
  const heroInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const readFiles = (files: FileList | null, cb: (urls: string[]) => void) => {
    if (!files || !files.length) return;
    const arr: string[] = [];
    let done = 0;
    Array.from(files).forEach((f) => {
      const r = new FileReader();
      r.onload = () => { arr.push(String(r.result)); if (++done === files.length) cb(arr); };
      r.readAsDataURL(f);
    });
  };

  return (
    <div className="space-y-4">
      <section className="glass-card rounded-2xl p-5">
        <SectionHeader icon={ImageIcon} title="الشعار" />
        <div className="flex items-center gap-4">
          <div className="size-24 rounded-2xl border border-border bg-muted/30 grid place-items-center overflow-hidden">
            {s.logoUrl ? <img src={s.logoUrl} alt="logo" className="w-full h-full object-cover" /> : <span className="text-3xl font-bold gradient-text">ل</span>}
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => logoInput.current?.click()} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm hover:bg-muted">
              <Upload className="size-4" /> رفع شعار
            </button>
            {s.logoUrl && (
              <button onClick={() => siteActions.update({ logoUrl: "" })} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm text-destructive hover:bg-destructive/10">
                <Trash2 className="size-4" /> حذف
              </button>
            )}
            <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => readFiles(e.target.files, ([u]) => siteActions.update({ logoUrl: u }))} />
          </div>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader icon={ImageIcon} title="صورة الغلاف (Hero)" />
        <div className="aspect-[16/6] rounded-xl border border-border bg-muted/30 overflow-hidden mb-3">
          {s.heroImage ? <img src={s.heroImage} alt="hero" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-muted-foreground text-sm">لا توجد صورة</div>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => heroInput.current?.click()} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm hover:bg-muted">
            <Upload className="size-4" /> رفع صورة
          </button>
          {s.heroImage && (
            <button onClick={() => siteActions.update({ heroImage: "" })} className="inline-flex items-center gap-2 h-10 px-4 rounded-lg text-sm text-destructive hover:bg-destructive/10">
              <Trash2 className="size-4" /> حذف
            </button>
          )}
          <input ref={heroInput} type="file" accept="image/*" className="hidden" onChange={(e) => readFiles(e.target.files, ([u]) => siteActions.update({ heroImage: u }))} />
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader icon={ImageIcon} title={`معرض الصور (${s.gallery.length})`} />
          <button onClick={() => galleryInput.current?.click()} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-xs font-semibold">
            <Upload className="size-4" /> إضافة صور
          </button>
          <input ref={galleryInput} type="file" accept="image/*" multiple className="hidden" onChange={(e) => readFiles(e.target.files, (urls) => urls.forEach((u) => siteActions.addGalleryImage(u)))} />
        </div>
        {s.gallery.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">لا توجد صور بعد — أضف لقطات من صالونك لعرضها للعملاء</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {s.gallery.map((url, i) => (
              <div key={i} className="relative group rounded-xl overflow-hidden border border-border aspect-square">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => siteActions.removeGalleryImage(i)}
                  className="absolute top-2 left-2 size-8 rounded-lg bg-destructive/90 text-destructive-foreground grid place-items-center opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Showcase editor — beauty categories */}
      <section className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader icon={Sparkles} title={`لمسات من إبداعنا (${s.showcase.length})`} />
          <button
            onClick={() => siteActions.addShowcase({ label: "خدمة جديدة", url: "" })}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-xs font-semibold"
          >
            <Upload className="size-4" /> إضافة عنصر
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">صور تظهر في واجهة الموقع لعرض تصفيفات الشعر، المكياج، والعناية. اضغطي الصورة لتغييرها.</p>
        {s.showcase.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">لا توجد عناصر — أضيفي أول عنصر</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {s.showcase.map((item, i) => (
              <ShowcaseRow key={i} item={item} idx={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ShowcaseRow({ item, idx }: { item: { label: string; url: string }; idx: number }) {
  const inp = useRef<HTMLInputElement>(null);
  const onFile = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const r = new FileReader();
    r.onload = () => siteActions.updateShowcase(idx, { url: String(r.result) });
    r.readAsDataURL(files[0]);
  };
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
      <button
        onClick={() => inp.current?.click()}
        className="size-20 rounded-lg overflow-hidden border border-border bg-muted grid place-items-center shrink-0 relative group"
      >
        {item.url
          ? <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
          : <ImageIcon className="size-6 text-muted-foreground" />}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition grid place-items-center">
          <Upload className="size-5 text-white" />
        </div>
      </button>
      <input ref={inp} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files)} />
      <div className="flex-1 min-w-0">
        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">اسم القسم</label>
        <input
          value={item.label}
          onChange={(e) => siteActions.updateShowcase(idx, { label: e.target.value })}
          className="w-full h-9 rounded-lg bg-background border border-border px-3 text-sm outline-none focus:border-primary/50"
        />
      </div>
      <button
        onClick={() => siteActions.removeShowcase(idx)}
        className="size-9 rounded-lg text-destructive hover:bg-destructive/10 grid place-items-center shrink-0"
        title="حذف"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

/* ---------------- WhatsApp ---------------- */
function WhatsAppTab({ s, customers }: { s: ReturnType<typeof useSiteSettings>; customers: ReturnType<typeof useSalon<any>> }) {
  const [broadcast, setBroadcast] = useState(s.waTemplatePromo);
  const list = customers as Array<{ id: string; name: string; phone: string }>;

  const send = (phone: string, name: string) => {
    const msg = fillTemplate(broadcast, { name, salon: s.salonName, date: "", time: "" });
    window.open(waLink(phone, msg, s.waCountryCode), "_blank");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <section className="glass-card rounded-2xl p-5">
          <SectionHeader icon={MessageCircle} title="إعدادات واتساب" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="مفتاح الدولة" value={s.waCountryCode} onChange={(v) => siteActions.update({ waCountryCode: v })} />
            <Field label="رقم المرسل" value={s.waNumber} onChange={(v) => siteActions.update({ waNumber: v })} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            متغيرات متاحة: <code className="text-primary">{"{name}"}</code>، <code className="text-primary">{"{salon}"}</code>، <code className="text-primary">{"{date}"}</code>، <code className="text-primary">{"{time}"}</code>
          </p>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <SectionHeader icon={MessageCircle} title="قوالب الرسائل" />
          <div className="space-y-3">
            <Textarea label="تأكيد الحجز" value={s.waTemplateBooking} onChange={(v) => siteActions.update({ waTemplateBooking: v })} />
            <Textarea label="تذكير بموعد" value={s.waTemplateReminder} onChange={(v) => siteActions.update({ waTemplateReminder: v })} />
            <Textarea label="عروض وترويج" value={s.waTemplatePromo} onChange={(v) => siteActions.update({ waTemplatePromo: v })} />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Save className="size-4 text-success" />
            <span className="text-xs text-muted-foreground">الحفظ تلقائي عند التعديل</span>
          </div>
        </section>
      </div>

      <section className="glass-card rounded-2xl p-5">
        <SectionHeader icon={Send} title="إرسال رسالة سريعة" />
        <label className="text-xs font-semibold text-muted-foreground mb-2 block">نص الرسالة</label>
        <textarea
          value={broadcast}
          onChange={(e) => setBroadcast(e.target.value)}
          rows={4}
          className="w-full rounded-lg bg-muted/40 border border-border p-3 text-sm mb-4"
        />
        <div className="text-xs font-semibold text-muted-foreground mb-2">اختر العميلة</div>
        <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
          {list.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">لا يوجد عملاء</div>}
          {list.map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
              <div className="size-9 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-bold text-sm">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{c.name}</div>
                <div className="text-[11px] text-muted-foreground">{c.phone}</div>
              </div>
              <button
                onClick={() => send(c.phone, c.name)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-success/15 text-success border border-success/30 text-xs font-semibold hover:bg-success/25"
              >
                <MessageCircle className="size-3.5" /> إرسال
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------------- Small helpers ---------------- */
function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="size-8 rounded-lg bg-primary/15 text-primary grid place-items-center">
        <Icon className="size-4" />
      </div>
      <h3 className="font-bold">{title}</h3>
    </div>
  );
}

function Field({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm outline-none focus:border-primary/50" />
    </div>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full rounded-lg bg-muted/40 border border-border p-3 text-sm outline-none focus:border-primary/50 resize-none" />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>
      <div className="flex items-center gap-2 h-10 rounded-lg bg-muted/40 border border-border px-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-7 rounded cursor-pointer bg-transparent border-0" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent text-xs font-mono outline-none" />
      </div>
    </div>
  );
}
