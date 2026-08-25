import { useRef, useState } from "react";
import {
  siteActions,
  SECTION_LABELS,
  type SiteSettings,
  type SectionId,
  type HeroButtonKind,
  type ButtonShape,
  type BookingMode,
  galleryOf,
} from "@/lib/site-settings";
import {
  Image as ImageIcon, Upload, Trash2, Plus, ChevronUp, ChevronDown, Eye, EyeOff,
  Users, Search, Link2, Layout, Sparkles, MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------- shared inputs ---------------- */

function Head({ icon: Icon, title, desc, action }: { icon: any; title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <div className="size-8 shrink-0 rounded-lg bg-primary/15 text-primary grid place-items-center">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <h3 className="font-bold truncate">{title}</h3>
          {desc && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function Txt({ label, value, onChange, className, placeholder }: { label: string; value: string; onChange: (v: string) => void; className?: string; placeholder?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm outline-none focus:border-primary/50"
      />
    </div>
  );
}

function Area({ label, value, onChange, rows = 3, className }: { label: string; value: string; onChange: (v: string) => void; rows?: number; className?: string }) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-muted/40 border border-border p-3 text-sm outline-none focus:border-primary/50 resize-none"
      />
    </div>
  );
}

function Slider({ label, value, min, max, step = 1, suffix, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
        <span className="text-xs font-mono text-primary">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}

function Pills<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "h-9 px-4 rounded-lg text-xs font-semibold border transition",
              value === o.id ? "border-primary/60 bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function readImages(files: FileList | null, cb: (urls: string[]) => void) {
  if (!files || !files.length) return;
  const out: string[] = [];
  let done = 0;
  Array.from(files).forEach((f) => {
    const r = new FileReader();
    r.onload = () => { out.push(String(r.result)); if (++done === files.length) cb(out); };
    r.readAsDataURL(f);
  });
}

function ImagePick({ url, onPick, className }: { url: string; onPick: (u: string) => void; className?: string }) {
  const inp = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        onClick={() => inp.current?.click()}
        className={cn("relative group rounded-xl overflow-hidden border border-border bg-muted grid place-items-center", className)}
      >
        {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="size-6 text-muted-foreground" />}
        <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition grid place-items-center">
          <Upload className="size-5 text-white" />
        </span>
      </button>
      <input ref={inp} type="file" accept="image/*" className="hidden" onChange={(e) => readImages(e.target.files, ([u]) => { if (u) { onPick(u); siteActions.addMedia([u]); } })} />
    </>
  );
}

/* ---------------- Hero tab ---------------- */

const HERO_KINDS: { id: HeroButtonKind; label: string }[] = [
  { id: "booking", label: "حجز" },
  { id: "whatsapp", label: "واتساب" },
  { id: "services", label: "الخدمات" },
  { id: "call", label: "اتصال" },
  { id: "link", label: "رابط مخصص" },
];

export function HeroTab({ s }: { s: SiteSettings }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <section className="glass-card rounded-2xl p-5">
          <Head icon={Sparkles} title="واجهة الموقع (Hero)" desc="العنوان الرئيسي والنص التعريفي وصورة الغلاف بعرض الشاشة الكامل." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Txt label="العنوان الرئيسي" value={s.heroTitle} onChange={(v) => siteActions.update({ heroTitle: v })} />
            <Txt label="الكلمة المميزة (بتدرّج لوني)" value={s.heroHighlight} onChange={(v) => siteActions.update({ heroHighlight: v })} />
            <Area label="النص التعريفي" value={s.heroSubtitle} onChange={(v) => siteActions.update({ heroSubtitle: v })} className="md:col-span-2" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <Pills
              label="محاذاة النص"
              value={s.heroAlign}
              options={[{ id: "right", label: "يمين" }, { id: "center", label: "وسط" }, { id: "left", label: "يسار" }]}
              onChange={(v) => siteActions.update({ heroAlign: v })}
            />
            <Slider label="ارتفاع الواجهة" value={s.heroHeight} min={50} max={100} suffix="vh" onChange={(v) => siteActions.update({ heroHeight: v })} />
            <Slider label="تعتيم الصورة" value={s.heroOverlay} min={0} max={90} suffix="%" onChange={(v) => siteActions.update({ heroOverlay: v })} />
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <Head
            icon={Link2}
            title={`أزرار الواجهة (${s.heroButtons.length})`}
            desc="أول زر يظهر بالتدرّج اللوني الأساسي."
            action={
              <button
                onClick={() => siteActions.addHeroButton({ kind: "link", label: "زر جديد", url: "" })}
                className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-xs font-semibold"
              >
                <Plus className="size-4" /> إضافة
              </button>
            }
          />
          <div className="space-y-3">
            {s.heroButtons.map((b, i) => (
              <div key={i} className="rounded-xl border border-border bg-muted/20 p-3 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 items-end">
                <Txt label="نص الزر" value={b.label} onChange={(v) => siteActions.updateHeroButton(i, { label: v })} />
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">الوظيفة</label>
                  <select
                    value={b.kind}
                    onChange={(e) => siteActions.updateHeroButton(i, { kind: e.target.value as HeroButtonKind })}
                    className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm outline-none focus:border-primary/50"
                  >
                    {HERO_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
                  </select>
                </div>
                <button onClick={() => siteActions.removeHeroButton(i)} className="size-10 rounded-lg text-destructive hover:bg-destructive/10 grid place-items-center">
                  <Trash2 className="size-4" />
                </button>
                {b.kind === "link" && (
                  <Txt label="الرابط" value={b.url ?? ""} placeholder="https://" onChange={(v) => siteActions.updateHeroButton(i, { url: v })} className="md:col-span-3" />
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-2xl p-5">
          <Head icon={Layout} title="الشكل العام" desc="حدة زوايا الأزرار وحجم الخطوط في الموقع." />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Pills<ButtonShape>
              label="شكل الأزرار"
              value={s.buttonShape}
              options={[{ id: "rounded", label: "دائري ناعم" }, { id: "pill", label: "كبسولة" }, { id: "square", label: "حواف حادة" }]}
              onChange={(v) => siteActions.update({ buttonShape: v })}
            />
            <Slider label="حجم الخط العام" value={Math.round((s.fontScale || 1) * 100)} min={90} max={125} suffix="%" onChange={(v) => siteActions.update({ fontScale: v / 100 })} />
          </div>
        </section>
      </div>

      <div className="space-y-4">
        <section className="glass-card rounded-2xl p-5">
          <Head icon={ImageIcon} title="صورة الغلاف" />
          <ImagePick url={s.heroImage} onPick={(u) => siteActions.update({ heroImage: u })} className="w-full aspect-[16/10]" />
          {s.heroImage && (
            <button onClick={() => siteActions.update({ heroImage: "" })} className="mt-3 inline-flex items-center gap-2 h-9 px-3 rounded-lg text-xs text-destructive hover:bg-destructive/10">
              <Trash2 className="size-4" /> حذف الصورة
            </button>
          )}
        </section>
        <section className="glass-card rounded-2xl p-5">
          <Head icon={ImageIcon} title="أيقونة الموقع (Favicon)" />
          <ImagePick url={s.faviconUrl} onPick={(u) => siteActions.update({ faviconUrl: u })} className="size-20" />
        </section>
      </div>
    </div>
  );
}

/* ---------------- Sections tab ---------------- */

export function SectionsTab({ s }: { s: SiteSettings }) {
  const order = s.sectionOrder;
  return (
    <div className="space-y-4">
      <section className="glass-card rounded-2xl p-5">
        <Head icon={Layout} title="ترتيب الأقسام وإظهارها" desc="اسحبي الأقسام للأعلى أو الأسفل لتغيير ترتيب ظهورها في الموقع، أو أخفِ أي قسم." />
        <div className="space-y-2">
          {order.map((id, i) => {
            const hidden = s.hiddenSections.includes(id);
            return (
              <div key={id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
                <div className="flex flex-col">
                  <button onClick={() => siteActions.moveSection(i, -1)} disabled={i === 0} className="size-6 grid place-items-center rounded hover:bg-muted disabled:opacity-30">
                    <ChevronUp className="size-4" />
                  </button>
                  <button onClick={() => siteActions.moveSection(i, 1)} disabled={i === order.length - 1} className="size-6 grid place-items-center rounded hover:bg-muted disabled:opacity-30">
                    <ChevronDown className="size-4" />
                  </button>
                </div>
                <div className="min-w-0">
                  <div className={cn("text-sm font-bold truncate", hidden && "opacity-50 line-through")}>{SECTION_LABELS[id]}</div>
                  <div className="text-[11px] text-muted-foreground">#{id}</div>
                </div>
                <button
                  onClick={() => siteActions.toggleSection(id)}
                  className={cn("inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-semibold border", hidden ? "border-border text-muted-foreground" : "border-primary/40 text-primary bg-primary/10")}
                >
                  {hidden ? <><EyeOff className="size-4" /> مخفي</> : <><Eye className="size-4" /> ظاهر</>}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <Head icon={Sparkles} title="عناوين الأقسام" desc="العنوان والوصف الظاهر أعلى كل قسم." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Txt label="عنوان قسم اللمسات" value={s.showcaseTitle} onChange={(v) => siteActions.update({ showcaseTitle: v })} />
          <Txt label="وصف قسم اللمسات" value={s.showcaseDesc} onChange={(v) => siteActions.update({ showcaseDesc: v })} />
          <Txt label="عنوان الخدمات" value={s.servicesTitle} onChange={(v) => siteActions.update({ servicesTitle: v })} />
          <Txt label="وصف الخدمات" value={s.servicesDesc} onChange={(v) => siteActions.update({ servicesDesc: v })} />
          <Txt label="عنوان المعرض" value={s.galleryTitle} onChange={(v) => siteActions.update({ galleryTitle: v })} />
          <Txt label="وصف المعرض" value={s.galleryDesc} onChange={(v) => siteActions.update({ galleryDesc: v })} />
          <Txt label="عنوان الفريق" value={s.teamTitle} onChange={(v) => siteActions.update({ teamTitle: v })} />
          <Txt label="وصف الفريق" value={s.teamDesc} onChange={(v) => siteActions.update({ teamDesc: v })} />
          <Txt label="عنوان التقييمات" value={s.reviewsTitle} onChange={(v) => siteActions.update({ reviewsTitle: v })} />
          <Txt label="وصف التقييمات" value={s.reviewsDesc} onChange={(v) => siteActions.update({ reviewsDesc: v })} />
          <Txt label="عنوان التواصل" value={s.contactTitle} onChange={(v) => siteActions.update({ contactTitle: v })} />
          <Txt label="وصف التواصل" value={s.contactDesc} onChange={(v) => siteActions.update({ contactDesc: v })} />
          <Txt label="نص التذييل" value={s.footerText} onChange={(v) => siteActions.update({ footerText: v })} className="md:col-span-2" />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={s.servicesShowPrice} onChange={(e) => siteActions.update({ servicesShowPrice: e.target.checked })} className="size-4 accent-primary" />
          إظهار أسعار الخدمات في الموقع
        </label>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <Head
          icon={ImageIcon}
          title={`معرض الأعمال (${galleryOf(s).length})`}
          desc="صور مصنّفة تظهر في معرض الموقع مع إمكانية التصفية والعرض المكبّر."
          action={
            <button
              onClick={() => siteActions.addGalleryItem({ url: "", title: "", category: "" })}
              className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-xs font-semibold"
            >
              <Plus className="size-4" /> إضافة صورة
            </button>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {galleryOf(s).map((it, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/20">
              <ImagePick url={it.url} onPick={(u) => siteActions.updateGalleryItem(i, { url: u })} className="size-20 shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Txt label="العنوان" value={it.title} onChange={(v) => siteActions.updateGalleryItem(i, { title: v })} />
                <Txt label="التصنيف" value={it.category} placeholder="شعر / مكياج / أظافر" onChange={(v) => siteActions.updateGalleryItem(i, { category: v })} />
              </div>
              <div className="flex flex-col shrink-0">
                <button onClick={() => siteActions.moveGalleryItem(i, -1)} className="size-8 grid place-items-center rounded hover:bg-muted"><ChevronUp className="size-4" /></button>
                <button onClick={() => siteActions.moveGalleryItem(i, 1)} className="size-8 grid place-items-center rounded hover:bg-muted"><ChevronDown className="size-4" /></button>
                <button onClick={() => siteActions.removeGalleryItem(i)} className="size-8 grid place-items-center rounded text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <Head
          icon={Users}
          title={`فريق العمل (${s.team.length})`}
          desc="عند تركه فارغًا يعرض الموقع الموظفات النشطات تلقائيًا."
          action={
            <button
              onClick={() => siteActions.addTeamMember({ id: crypto.randomUUID(), name: "اسم الأخصائية", role: "أخصائية تجميل", bio: "", photo: "", instagram: "" })}
              className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-xs font-semibold"
            >
              <Plus className="size-4" /> إضافة عضوة
            </button>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {s.team.map((m, i) => (
            <div key={m.id} className="p-3 rounded-xl border border-border bg-muted/20 flex gap-3">
              <ImagePick url={m.photo} onPick={(u) => siteActions.updateTeamMember(i, { photo: u })} className="size-24 shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Txt label="الاسم" value={m.name} onChange={(v) => siteActions.updateTeamMember(i, { name: v })} />
                <Txt label="التخصص" value={m.role} onChange={(v) => siteActions.updateTeamMember(i, { role: v })} />
                <Txt label="إنستغرام" value={m.instagram} placeholder="https://instagram.com/..." onChange={(v) => siteActions.updateTeamMember(i, { instagram: v })} />
                <Area label="نبذة" value={m.bio} rows={2} onChange={(v) => siteActions.updateTeamMember(i, { bio: v })} />
                <div className="flex gap-1">
                  <button onClick={() => siteActions.moveTeamMember(i, -1)} className="size-8 grid place-items-center rounded hover:bg-muted"><ChevronUp className="size-4" /></button>
                  <button onClick={() => siteActions.moveTeamMember(i, 1)} className="size-8 grid place-items-center rounded hover:bg-muted"><ChevronDown className="size-4" /></button>
                  <button onClick={() => siteActions.removeTeamMember(i)} className="size-8 grid place-items-center rounded text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------------- Contact + booking tab ---------------- */

export function ContactTab({ s }: { s: SiteSettings }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <section className="glass-card rounded-2xl p-5">
        <Head icon={MapPin} title="بيانات التواصل" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Txt label="رقم الجوال" value={s.phone} onChange={(v) => siteActions.update({ phone: v })} />
          <Txt label="البريد الإلكتروني" value={s.email} onChange={(v) => siteActions.update({ email: v })} />
          <Txt label="أوقات العمل" value={s.hours} onChange={(v) => siteActions.update({ hours: v })} className="md:col-span-2" />
          <Txt label="العنوان" value={s.address} onChange={(v) => siteActions.update({ address: v })} className="md:col-span-2" />
          <Txt label="رابط الخريطة" value={s.mapsUrl} placeholder="https://maps.google.com/..." onChange={(v) => siteActions.update({ mapsUrl: v })} className="md:col-span-2" />
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <Head icon={Link2} title="حسابات التواصل الاجتماعي" desc="الروابط المُدخلة فقط تظهر في الموقع." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Txt label="Instagram" value={s.instagram} onChange={(v) => siteActions.update({ instagram: v })} />
          <Txt label="Snapchat" value={s.snapchat} onChange={(v) => siteActions.update({ snapchat: v })} />
          <Txt label="TikTok" value={s.tiktok} onChange={(v) => siteActions.update({ tiktok: v })} />
          <Txt label="X (تويتر)" value={s.xLink} onChange={(v) => siteActions.update({ xLink: v })} />
          <Txt label="Facebook" value={s.facebook} onChange={(v) => siteActions.update({ facebook: v })} className="md:col-span-2" />
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5 lg:col-span-2">
        <Head icon={Sparkles} title="طريقة الحجز" desc="ماذا يحدث عند ضغط زر الحجز في الموقع." />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Pills<BookingMode>
            label="نمط الحجز"
            value={s.bookingMode}
            options={[
              { id: "internal", label: "نظام الحجز الداخلي" },
              { id: "whatsapp", label: "واتساب" },
              { id: "call", label: "اتصال" },
              { id: "link", label: "رابط خارجي" },
            ]}
            onChange={(v) => siteActions.update({ bookingMode: v })}
          />
          <Txt label="نص زر الحجز" value={s.bookingLabel} onChange={(v) => siteActions.update({ bookingLabel: v })} />
          {s.bookingMode === "link" && (
            <Txt label="رابط الحجز الخارجي" value={s.bookingUrl} placeholder="https://" onChange={(v) => siteActions.update({ bookingUrl: v })} className="md:col-span-2" />
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------------- SEO tab ---------------- */

export function SeoTab({ s }: { s: SiteSettings }) {
  const [len] = useState(0);
  void len;
  const title = s.seoTitle || `${s.salonName} — ${s.tagline}`;
  const desc = s.seoDescription || s.heroSubtitle;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <section className="glass-card rounded-2xl p-5 lg:col-span-2 space-y-3">
        <Head icon={Search} title="تحسين محركات البحث (SEO)" desc="عنوان ووصف الصفحة كما يظهران في نتائج البحث." />
        <Txt label={`عنوان الصفحة (${title.length}/60)`} value={s.seoTitle} placeholder={title} onChange={(v) => siteActions.update({ seoTitle: v })} />
        <Area label={`وصف الصفحة (${desc.length}/160)`} value={s.seoDescription} onChange={(v) => siteActions.update({ seoDescription: v })} />
        <Txt label="الكلمات المفتاحية" value={s.seoKeywords} onChange={(v) => siteActions.update({ seoKeywords: v })} />
        <div className="pt-2 border-t border-border" />
        <Txt label="عنوان المشاركة (OG)" value={s.ogTitle} placeholder={title} onChange={(v) => siteActions.update({ ogTitle: v })} />
        <Area label="وصف المشاركة (OG)" value={s.ogDescription} onChange={(v) => siteActions.update({ ogDescription: v })} rows={2} />
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">صورة المشاركة</label>
          <ImagePick url={s.ogImage || s.heroImage} onPick={(u) => siteActions.update({ ogImage: u })} className="w-full max-w-sm aspect-[16/9]" />
        </div>
      </section>

      <section className="glass-card rounded-2xl p-5">
        <Head icon={Search} title="معاينة نتيجة البحث" />
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <div className="text-[11px] text-muted-foreground truncate">salon.example.com</div>
          <div className="text-primary text-base font-semibold mt-1 line-clamp-2">{title}</div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{desc}</p>
        </div>
      </section>
    </div>
  );
}
