import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Building2,
  FileText,
  Landmark,
  Loader2,
  Lock,
  Mail,
  Save,
  Trash2,
  Upload,
  ShieldQuestion,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/salon/app-shell";
import { SettingsLoadingScreen } from "@/components/salon/settings-loading-screen";
import { supabase } from "@/integrations/supabase/client";
import { currentSalonId } from "@/lib/db/hydrate";
import {
  changeEmail,
  changePassword,
  resendEmailConfirmation,
  suggestPassword,
} from "@/lib/account";
import {
  COUNTRIES,
  CURRENCIES,
  DOC_KINDS,
  EMPTY_VERIFICATION,
  VERIFICATION_LABEL,
  loadStoreProfile,
  loadVerification,
  removeStoreDoc,
  saveStoreProfile,
  saveVerification,
  storeDocUrl,
  uploadStoreDoc,
  type StoreProfile,
  type StoreVerification,
} from "@/lib/db/store-profile-repo";

export const Route = createFileRoute("/_authenticated/store-settings")({
  head: () => ({
    meta: [
      { title: "إعدادات المتجر والتوثيق — Salon Flow" },
      {
        name: "description",
        content:
          "ضبط بيانات المتجر: الاسم والجوال والعملة والبلد، وتأكيد البريد الإلكتروني، وتغيير كلمة المرور، ورفع الأوراق النظامية لتوثيق المتجر.",
      },
      { property: "og:title", content: "إعدادات المتجر والتوثيق" },
      {
        property: "og:description",
        content: "توثيق المتجر بالسجل التجاري أو العمل الحر والهوية وبيانات الآيبان البنكي.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoreSettingsPage,
});

function StoreSettingsPage() {
  const salonId = currentSalonId();
  const qc = useQueryClient();

  const profileQ = useQuery({
    queryKey: ["store-profile", salonId],
    queryFn: () => loadStoreProfile(salonId!),
    enabled: Boolean(salonId),
  });
  const verifyQ = useQuery({
    queryKey: ["store-verification", salonId],
    queryFn: () => loadVerification(salonId!),
    enabled: Boolean(salonId),
  });
  const userQ = useQuery({
    queryKey: ["auth-user-email"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return {
        email: data.user?.email ?? "",
        confirmed: Boolean(data.user?.email_confirmed_at),
        createdAt: data.user?.created_at ?? null,
      };
    },
  });

  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [verify, setVerify] = useState<StoreVerification>(EMPTY_VERIFICATION);

  useEffect(() => {
    if (profileQ.data) setProfile(profileQ.data);
  }, [profileQ.data]);
  useEffect(() => {
    if (verifyQ.data) setVerify(verifyQ.data);
  }, [verifyQ.data]);

  const saveProfile = useMutation({
    mutationFn: () => saveStoreProfile(profile!),
    onSuccess: () => {
      toast.success("تم حفظ بيانات المتجر");
      void qc.invalidateQueries({ queryKey: ["store-profile", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveDocs = useMutation({
    mutationFn: (submit: boolean) => saveVerification(salonId!, verify, submit),
    onSuccess: (status) => {
      setVerify((v) => ({ ...v, status }));
      toast.success(status === "pending" ? "تم إرسال الطلب للمراجعة" : "تم حفظ بيانات التوثيق");
      void qc.invalidateQueries({ queryKey: ["store-verification", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!salonId) {
    return (
      <AppShell title="إعدادات المتجر" subtitle="بيانات المتجر والتوثيق">
        <p className="text-sm text-muted-foreground">لا يوجد متجر مرتبط بحسابك.</p>
      </AppShell>
    );
  }

  if (profileQ.isPending || verifyQ.isPending || !profile) {
    return <SettingsLoadingScreen label="جاري تحميل بيانات المتجر…" />;
  }

  const set = <K extends keyof StoreProfile>(k: K, v: StoreProfile[K]) =>
    setProfile((p) => (p ? { ...p, [k]: v } : p));
  const setV = <K extends keyof StoreVerification>(k: K, v: StoreVerification[K]) =>
    setVerify((s) => ({ ...s, [k]: v }));

  const badge =
    verify.status === "verified"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
      : verify.status === "pending"
        ? "border-amber-500/40 bg-amber-500/10 text-amber-600"
        : verify.status === "rejected"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-border bg-muted/50 text-muted-foreground";

  return (
    <AppShell
      title="إعدادات المتجر والتوثيق"
      subtitle="بيانات المتجر، البريد وكلمة المرور، والأوراق النظامية"
      action={
        <span className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold ${badge}`}>
          <BadgeCheck className="size-4" /> حالة التوثيق: {VERIFICATION_LABEL[verify.status]}
        </span>
      }
    >
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card title="بيانات المتجر" icon={Building2}>
          <Field label="اسم المتجر" value={profile.name} onChange={(v) => set("name", v)} />
          <Field label="رقم الجوال" value={profile.phone} onChange={(v) => set("phone", v)} />
          <Select
            label="العملة"
            value={profile.currency}
            onChange={(v) => set("currency", v)}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          />
          <Select
            label="البلد"
            value={profile.country}
            onChange={(v) => set("country", v)}
            options={COUNTRIES.map((c) => ({ value: c.code, label: c.label }))}
          />
          <Field
            label="الرقم الضريبي (VAT)"
            value={profile.vatNumber}
            onChange={(v) => set("vatNumber", v)}
          />
          <Field
            label="الرقم الضريبي الموحّد / رقم المكلّف"
            value={profile.taxNumber}
            onChange={(v) => set("taxNumber", v)}
          />
          <button
            onClick={() => saveProfile.mutate()}
            disabled={saveProfile.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saveProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            حفظ بيانات المتجر
          </button>
          {profile.slug && (
            <a
              href={`/salon/${encodeURIComponent(profile.slug)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" /> عرض صفحة المتجر
            </a>
          )}
        </Card>

        <div className="space-y-4">
          <EmailCard
            email={userQ.data?.email ?? ""}
            confirmed={userQ.data?.confirmed ?? false}
            createdAt={userQ.data?.createdAt ?? null}
            onRefresh={() => void qc.invalidateQueries({ queryKey: ["auth-user-email"] })}
          />
          <PasswordCard />
        </div>

        <Card title="الأوراق النظامية للتوثيق" icon={FileText}>
          <Select
            label="نوع المستند"
            value={verify.docKind}
            onChange={(v) => setV("docKind", v as StoreVerification["docKind"])}
            options={DOC_KINDS.map((d) => ({ value: d.id, label: d.label }))}
          />
          <Field label="الاسم النظامي" value={verify.legalName} onChange={(v) => setV("legalName", v)} />
          <Field label="رقم المستند" value={verify.docNumber} onChange={(v) => setV("docNumber", v)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="تاريخ الإصدار"
              type="date"
              value={verify.docIssuedOn}
              onChange={(v) => setV("docIssuedOn", v)}
            />
            <Field
              label="تاريخ الانتهاء"
              type="date"
              value={verify.docExpiresOn}
              onChange={(v) => setV("docExpiresOn", v)}
            />
          </div>
          <Field
            label="رقم الهوية / الإقامة"
            value={verify.nationalId}
            onChange={(v) => setV("nationalId", v)}
          />
          <DocUploader
            salonId={salonId}
            files={verify.files}
            onChange={(files) => setV("files", files)}
          />
          {verify.status === "rejected" && verify.reviewNote && (
            <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
              سبب الرفض: {verify.reviewNote}
            </p>
          )}
        </Card>

        <Card title="الحساب البنكي" icon={Landmark}>
          <Field label="اسم البنك" value={verify.bankName} onChange={(v) => setV("bankName", v)} />
          <Field
            label="رقم الآيبان (IBAN)"
            value={verify.iban}
            onChange={(v) => setV("iban", v)}
            placeholder="SA00 0000 0000 0000 0000 0000"
          />
          <Field
            label="اسم صاحب الحساب"
            value={verify.accountHolder}
            onChange={(v) => setV("accountHolder", v)}
          />
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => saveDocs.mutate(false)}
              disabled={saveDocs.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"
            >
              <Save className="size-4" /> حفظ كمسودة
            </button>
            <button
              onClick={() => {
                if (!verify.docNumber.trim() || verify.files.length === 0) {
                  toast.error("أدخل رقم المستند وارفع صورة المستند قبل طلب التوثيق");
                  return;
                }
                saveDocs.mutate(true);
              }}
              disabled={saveDocs.isPending || verify.status === "verified"}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {saveDocs.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BadgeCheck className="size-4" />
              )}
              إرسال طلب التوثيق
            </button>
          </div>
          <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <ShieldQuestion className="mt-0.5 size-3.5 shrink-0" />
            المستندات مخزّنة بشكل خاص ولا يراها إلا فريق المنصة عند المراجعة.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

function EmailCard({
  email,
  confirmed,
  createdAt,
  onRefresh,
}: {
  email: string;
  confirmed: boolean;
  createdAt: string | null;
  onRefresh: () => void;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const daysLeft = (() => {
    if (!createdAt || confirmed) return null;
    const deadline = new Date(createdAt).getTime() + 30 * 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((deadline - Date.now()) / (24 * 60 * 60 * 1000)));
  })();

  return (
    <Card title="البريد الإلكتروني" icon={Mail}>
      <p className="text-sm font-semibold">{email || "—"}</p>
      {confirmed ? (
        <p className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-600">
          <BadgeCheck className="size-4" /> البريد مؤكَّد
        </p>
      ) : (
        <div className="space-y-2">
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
            بريدك يحتاج إلى تأكيد
            {daysLeft !== null && ` — متبقٍ ${daysLeft} يومًا لإكمال التأكيد`}.
          </p>
          <button
            onClick={async () => {
              setBusy(true);
              try {
                await resendEmailConfirmation(email);
                toast.success("أرسلنا رابط التأكيد إلى بريدك");
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "تعذّر الإرسال");
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy || !email}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
            توثيق البريد الآن
          </button>
        </div>
      )}

      <Field label="تغيير البريد الإلكتروني" value={newEmail} onChange={setNewEmail} type="email" />
      <button
        onClick={async () => {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newEmail.trim())) {
            toast.error("أدخل بريدًا إلكترونيًا صحيحًا");
            return;
          }
          setBusy(true);
          try {
            await changeEmail(newEmail);
            toast.success("أرسلنا رابط تأكيد إلى البريد الجديد");
            setNewEmail("");
            onRefresh();
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "تعذّر تغيير البريد");
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-60"
      >
        <Mail className="size-4" /> تحديث البريد
      </button>
    </Card>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Card title="كلمة المرور" icon={Lock}>
      <Field
        label="كلمة المرور الحالية"
        value={current}
        onChange={setCurrent}
        type="password"
        autoComplete="current-password"
      />
      <Field
        label="كلمة المرور الجديدة"
        value={next}
        onChange={setNext}
        type="password"
        autoComplete="new-password"
      />
      <Field
        label="تأكيد كلمة المرور الجديدة"
        value={confirm}
        onChange={setConfirm}
        type="password"
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => {
          const p = suggestPassword();
          setNext(p);
          setConfirm(p);
          toast.success(`كلمة مرور مقترحة: ${p}`);
        }}
        className="text-xs font-semibold text-primary hover:underline"
      >
        اقترح كلمة مرور قوية
      </button>
      <button
        onClick={async () => {
          if (next.length < 8) {
            toast.error("كلمة المرور الجديدة يجب أن تكون ٨ أحرف على الأقل");
            return;
          }
          if (next !== confirm) {
            toast.error("كلمة المرور وتأكيدها غير متطابقين");
            return;
          }
          setBusy(true);
          try {
            await changePassword(current, next);
            toast.success("تم تغيير كلمة المرور");
            setCurrent("");
            setNext("");
            setConfirm("");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "تعذّر تغيير كلمة المرور");
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        تغيير كلمة المرور
      </button>
    </Card>
  );
}

function DocUploader({
  salonId,
  files,
  onChange,
}: {
  salonId: string;
  files: StoreVerification["files"];
  onChange: (files: StoreVerification["files"]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState("");

  return (
    <div className="space-y-2">
      <Field label="وصف المستند" value={label} onChange={setLabel} placeholder="صورة السجل التجاري" />
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          try {
            const uploaded = await uploadStoreDoc(salonId, file, label);
            onChange([...files, uploaded]);
            setLabel("");
            toast.success("تم رفع المستند — لا تنسَ الحفظ");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "تعذّر رفع المستند");
          } finally {
            setBusy(false);
          }
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-primary/50 px-4 text-sm font-semibold text-primary disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        رفع مستند (PDF أو صورة)
      </button>

      <ul className="space-y-1.5">
        {files.map((f) => (
          <li
            key={f.path}
            className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs"
          >
            <button
              type="button"
              onClick={async () => {
                try {
                  const url = await storeDocUrl(f.path);
                  window.open(url, "_blank", "noopener");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "تعذّر فتح المستند");
                }
              }}
              className="font-semibold text-primary hover:underline"
            >
              {f.label}
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await removeStoreDoc(f.path);
                } catch {
                  /* keep the list in sync even when the object is already gone */
                }
                onChange(files.filter((x) => x.path !== f.path));
              }}
              aria-label="حذف المستند"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
        {files.length === 0 && (
          <li className="text-[11px] text-muted-foreground">لم يتم رفع أي مستند بعد.</li>
        )}
      </ul>
    </div>
  );
}

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <h2 className="flex items-center gap-2 font-bold">
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
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

function Select({
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
        className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
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
