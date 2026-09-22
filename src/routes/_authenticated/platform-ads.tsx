import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clapperboard,
  ImageIcon,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { OwnerShell } from "@/components/platform/owner-shell";
import { SettingsLoadingScreen } from "@/components/salon/settings-loading-screen";
import { ImageUploadField } from "@/components/platform/image-upload-field";
import { VideoUploadField } from "@/components/platform/video-upload-field";
import {
  usePlatformSettings,
  PLATFORM_SETTINGS_KEY,
} from "@/components/platform/platform-contact-card";
import { useAccount } from "@/hooks/use-account";
import {
  EMPTY_PLATFORM_SETTINGS,
  savePlatformSettings,
  type PlatformAd,
  type PlatformHome,
  type PlatformSettings,
} from "@/lib/db/platform-settings-repo";
import type { PlatformTheme } from "@/lib/platform-theme";

export const Route = createFileRoute("/_authenticated/platform-ads")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "الإعلانات والفيديوهات — لوحة مالك المنصة | NOVAA" },
      {
        name: "description",
        content:
          "رفع الإعلانات والفيديوهات، اختيار فيديو خلفية الصفحة الرئيسية، وتعديل شعار NOVAA الذي يظهر في نهاية الفيديو.",
      },
      { property: "og:title", content: "الإعلانات والفيديوهات — NOVAA" },
      {
        property: "og:description",
        content: "مكتبة وسائط المنصة: فيديوهات إعلانية وصور وشعار نهاية الفيديو.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlatformAdsPage,
});

const newId = () => `ad-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function PlatformAdsPage() {
  const { data: account } = useAccount();
  const isOwner = account?.role === "platform_owner";
  const qc = useQueryClient();
  const loaded = usePlatformSettings(undefined, true);
  const [form, setForm] = useState<PlatformSettings>(EMPTY_PLATFORM_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loaded.data && !loaded.isFetching) {
      setForm(loaded.data);
      setReady(true);
    }
  }, [loaded.data, loaded.isFetching]);

  const save = useMutation({
    mutationFn: (next: PlatformSettings) => savePlatformSettings(next),
    onSuccess: (_d, next) => {
      qc.setQueryData(PLATFORM_SETTINGS_KEY, structuredClone(next));
      toast.success("تم حفظ الإعلانات والوسائط");
      void qc.invalidateQueries({ queryKey: PLATFORM_SETTINGS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loaded.isPending || loaded.isFetching || !ready) {
    return <SettingsLoadingScreen label="جاري تحميل مكتبة الإعلانات…" />;
  }

  if (!isOwner) {
    return (
      <OwnerShell title="الإعلانات والفيديوهات" subtitle="مخصصة لمالك المنصة">
        <p className="text-sm text-muted-foreground">هذه الصفحة متاحة لمالك المنصة فقط.</p>
      </OwnerShell>
    );
  }

  const home = form.home;
  const theme: PlatformTheme = home.theme ?? {};
  const ads = home.ads ?? [];

  const setHome = <K extends keyof PlatformHome>(k: K, v: PlatformHome[K]) =>
    setForm((f) => ({ ...f, home: { ...f.home, [k]: v } }));
  const setThemeVal = <K extends keyof PlatformTheme>(k: K, v: PlatformTheme[K]) =>
    setHome("theme", { ...theme, [k]: v } as PlatformTheme);

  const setAds = (next: PlatformAd[]) => setHome("ads", next);
  const patchAd = (id: string, patch: Partial<PlatformAd>) =>
    setAds(ads.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const addAd = (kind: "video" | "image") =>
    setAds([...ads, { id: newId(), kind, url: "", title: "", desc: "", active: true }]);

  /** Makes this ad the hero background of the public home page. */
  const useAsHero = (ad: PlatformAd) => {
    if (!ad.url) {
      toast.error("ارفع الملف أو الصق رابطه أولًا.");
      return;
    }
    const next: PlatformSettings = {
      ...form,
      home: {
        ...form.home,
        heroMedia: ad.kind,
        ...(ad.kind === "video"
          ? { heroVideoUrl: ad.url, heroPosterUrl: ad.posterUrl || form.home.heroPosterUrl }
          : { heroImageUrl: ad.url }),
      },
    };
    setForm(next);
    save.mutate(next);
  };

  const heroUrl = home.heroMedia === "image" ? home.heroImageUrl : home.heroVideoUrl;

  return (
    <OwnerShell
      title="الإعلانات والفيديوهات"
      subtitle="مكتبة وسائط المنصة وشعار نهاية الفيديو"
      action={
        <button
          onClick={() => save.mutate(form)}
          disabled={save.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          <Save className="size-4" /> حفظ التغييرات
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <Card title="مكتبة الإعلانات" icon={Clapperboard}>
          <p className="text-xs text-muted-foreground">
            ارفع فيديوهات أو صور إعلانية، ثم اختر أي واحدة لتكون خلفية القسم الرئيسي في
            الصفحة الرسمية.
          </p>

          {ads.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              لا توجد إعلانات بعد — أضف أول إعلان.
            </p>
          )}

          <div className="space-y-4">
            {ads.map((ad) => {
              const isHero = !!ad.url && ad.url === heroUrl;
              return (
                <div key={ad.id} className="rounded-2xl border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                      {ad.kind === "video" ? (
                        <Clapperboard className="size-3.5" />
                      ) : (
                        <ImageIcon className="size-3.5" />
                      )}
                      {ad.kind === "video" ? "إعلان فيديو" : "إعلان صورة"}
                      {isHero && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          مستخدم في الصفحة الرئيسية
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAds(ads.filter((a) => a.id !== ad.id))}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" /> حذف
                    </button>
                  </div>

                  <Field
                    label="عنوان الإعلان"
                    value={ad.title ?? ""}
                    onChange={(v) => patchAd(ad.id, { title: v })}
                  />
                  <Field
                    label="وصف مختصر"
                    value={ad.desc ?? ""}
                    onChange={(v) => patchAd(ad.id, { desc: v })}
                  />

                  {ad.kind === "video" ? (
                    <>
                      <VideoUploadField
                        label="ملف الفيديو"
                        value={ad.url}
                        onChange={(v) => patchAd(ad.id, { url: v })}
                      />
                      <ImageUploadField
                        label="صورة الغلاف (تظهر قبل التشغيل)"
                        preset="hero"
                        value={ad.posterUrl ?? ""}
                        onChange={(v) => patchAd(ad.id, { posterUrl: v })}
                      />
                    </>
                  ) : (
                    <ImageUploadField
                      label="صورة الإعلان"
                      preset="hero"
                      value={ad.url}
                      onChange={(v) => patchAd(ad.id, { url: v })}
                    />
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => useAsHero(ad)}
                      disabled={save.isPending || isHero}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      <Star className="size-3.5" />
                      {isHero ? "يظهر الآن في الرئيسية" : "اجعله خلفية الصفحة الرئيسية"}
                    </button>
                    <ToggleRow
                      label="مفعّل"
                      value={ad.active !== false}
                      onChange={(v) => patchAd(ad.id, { active: v })}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addAd("video")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              <Plus className="size-3.5" /> إعلان فيديو
            </button>
            <button
              type="button"
              onClick={() => addAd("image")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              <Plus className="size-3.5" /> إعلان صورة
            </button>
          </div>
        </Card>

        <Card title="شعار NOVAA في نهاية الفيديو" icon={Sparkles}>
          <ToggleRow
            label="إظهار بطاقة الشعار في نهاية الفيديو"
            value={home.showHeroEndCard !== false}
            onChange={(v) => setHome("showHeroEndCard", v)}
          />
          <ImageUploadField
            label="شعار نهاية الفيديو"
            preset="logo"
            contain
            value={home.heroEndLogoUrl ?? ""}
            onChange={(v) => setHome("heroEndLogoUrl", v)}
          />
          <NumberRow
            label="عرض الشعار (بكسل)"
            min={120}
            max={900}
            step={10}
            value={theme.heroEndLogoWidth ?? 430}
            onChange={(v) => setThemeVal("heroEndLogoWidth", v)}
          />
          <NumberRow
            label="شفافية تعتيم الفيديو (%)"
            min={0}
            max={100}
            step={5}
            value={theme.heroOverlayOpacity ?? 70}
            onChange={(v) => setThemeVal("heroOverlayOpacity", v)}
          />

          <div className="rounded-2xl border border-border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold">معاينة خلفية الصفحة الرئيسية</p>
            {home.heroMedia === "image" ? (
              home.heroImageUrl ? (
                <img
                  src={home.heroImageUrl}
                  alt="معاينة خلفية الصفحة الرئيسية"
                  className="h-40 w-full rounded-xl object-cover"
                />
              ) : (
                <p className="text-xs text-muted-foreground">لم تُختر صورة بعد.</p>
              )
            ) : home.heroVideoUrl ? (
              <video
                src={home.heroVideoUrl}
                poster={home.heroPosterUrl || undefined}
                muted
                loop
                playsInline
                controls
                className="h-40 w-full rounded-xl object-cover"
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                لم يُختر فيديو بعد — استخدم «اجعله خلفية الصفحة الرئيسية».
              </p>
            )}
            {home.heroEndLogoUrl && home.showHeroEndCard !== false && (
              <div className="grid place-items-center rounded-xl bg-background p-4">
                <img
                  src={home.heroEndLogoUrl}
                  alt="شعار نهاية الفيديو"
                  style={{ width: Math.min(theme.heroEndLogoWidth ?? 430, 320) }}
                  className="h-auto object-contain"
                />
              </div>
            )}
          </div>
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
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-bold">
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-primary size-4"
      />
      {label}
    </label>
  );
}

function NumberRow({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted-foreground">
        {label} — {value}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}
