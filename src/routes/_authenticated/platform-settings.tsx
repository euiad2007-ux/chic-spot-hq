import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Banknote, Phone, Share2, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/salon/app-shell";
import { SettingsLoadingScreen } from "@/components/salon/settings-loading-screen";
import {
  PlatformContactCard,
  SOCIAL_META,
  usePlatformSettings,
  PLATFORM_SETTINGS_KEY,
} from "@/components/platform/platform-contact-card";
import { useAccount } from "@/hooks/use-account";
import {
  EMPTY_PLATFORM_SETTINGS,
  savePlatformSettings,
  type PlatformSettings,
} from "@/lib/db/platform-settings-repo";

export const Route = createFileRoute("/_authenticated/platform-settings")({
  head: () => ({
    meta: [
      { title: "إعدادات المنصة — بيانات السداد والتواصل | Salon Flow" },
      {
        name: "description",
        content:
          "ضبط رقم الحساب البنكي وأرقام التواصل وصفحات التواصل الاجتماعي ومحتوى الصفحة الرئيسية للمنصة.",
      },
      { property: "og:title", content: "إعدادات المنصة — Salon Flow" },
      {
        property: "og:description",
        content: "لوحة مالك المنصة لضبط بيانات السداد والتواصل ومحتوى صفحة الويب الرئيسية.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlatformSettingsPage,
});

function PlatformSettingsPage() {
  const { data: account } = useAccount();
  const isOwner = account?.role === "platform_owner";
  const qc = useQueryClient();
  const loaded = usePlatformSettings(undefined, true);
  const [form, setForm] = useState<PlatformSettings>(EMPTY_PLATFORM_SETTINGS);
  const [settingsReady, setSettingsReady] = useState(false);

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
      toast.success("تم حفظ إعدادات المنصة");
      void qc.invalidateQueries({ queryKey: PLATFORM_SETTINGS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loaded.isPending || loaded.isFetching || !settingsReady) {
    return <SettingsLoadingScreen label="جاري تحميل إعدادات المنصة المحفوظة…" />;
  }

  const set = <K extends keyof PlatformSettings>(k: K, v: PlatformSettings[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  if (!isOwner) {
    return (
      <AppShell title="إعدادات المنصة" subtitle="مخصصة لمالك المنصة">
        <p className="text-sm text-muted-foreground">هذه الصفحة متاحة لمالك المنصة فقط.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="إعدادات المنصة"
      subtitle="بيانات السداد وأرقام التواصل والسوشل ميديا ومحتوى الصفحة الرئيسية"
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
        <Card title="الحساب البنكي" icon={Banknote}>
          <Field label="اسم المنصة" value={form.brandName} onChange={(v) => set("brandName", v)} />
          <Field label="اسم البنك" value={form.bankName} onChange={(v) => set("bankName", v)} />
          <Field
            label="اسم صاحب الحساب"
            value={form.bankAccountName}
            onChange={(v) => set("bankAccountName", v)}
          />
          <Field label="رقم الآيبان (IBAN)" value={form.iban} onChange={(v) => set("iban", v)} />
          <Field
            label="رقم الحساب"
            value={form.accountNumber}
            onChange={(v) => set("accountNumber", v)}
          />
        </Card>

        <Card title="أرقام التواصل" icon={Phone}>
          <Field label="رقم الجوال" value={form.phone} onChange={(v) => set("phone", v)} />
          <Field label="رقم الواتساب" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} />
          <Field label="البريد الإلكتروني" value={form.email} onChange={(v) => set("email", v)} />
          <Field
            label="ساعات الدعم"
            value={form.supportHours}
            onChange={(v) => set("supportHours", v)}
            placeholder="الأحد - الخميس 9ص - 6م"
          />
        </Card>

        <Card title="صفحات التواصل الاجتماعي" icon={Share2}>
          {SOCIAL_META.map((s) => (
            <Field
              key={s.key}
              label={s.label}
              value={form.socials[s.key] ?? ""}
              placeholder="https://"
              onChange={(v) => set("socials", { ...form.socials, [s.key]: v })}
            />
          ))}
        </Card>

        <Card title="محتوى الصفحة الرئيسية" icon={LayoutTemplate}>
          <Field
            label="العنوان الرئيسي"
            value={form.home.headline ?? ""}
            onChange={(v) => set("home", { ...form.home, headline: v })}
          />
          <Field
            label="النص التعريفي"
            value={form.home.subheadline ?? ""}
            onChange={(v) => set("home", { ...form.home, subheadline: v })}
          />
          <Field
            label="نص زر البداية"
            value={form.home.ctaLabel ?? ""}
            onChange={(v) => set("home", { ...form.home, ctaLabel: v })}
          />
          <Field
            label="عنوان قسم الباقات"
            value={form.home.plansTitle ?? ""}
            onChange={(v) => set("home", { ...form.home, plansTitle: v })}
          />
          <Field
            label="ملاحظة تحت الباقات"
            value={form.home.plansNote ?? ""}
            onChange={(v) => set("home", { ...form.home, plansNote: v })}
          />
          <Field
            label="عنوان قسم التواصل"
            value={form.home.contactTitle ?? ""}
            onChange={(v) => set("home", { ...form.home, contactTitle: v })}
          />
        </Card>

        <div className="lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            معاينة ما يراه التجار
          </h2>
          <PlatformContactCard settings={form} />
        </div>
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
  icon: typeof Banknote;
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
      />
    </label>
  );
}
