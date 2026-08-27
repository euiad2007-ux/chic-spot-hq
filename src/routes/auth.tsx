import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Scissors,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  Wand2,
  ShieldCheck,
  Store,
  Phone,
  Mail,
  Lock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

import {
  signIn,
  signUp,
  homeForRole,
  loadAccount,
  sendPasswordReset,
  ensureOwnedSalon,
  currentUserOwnsSalon,
  suggestPassword,
} from "@/lib/account";
import { useRefreshAccount } from "@/hooks/use-account";
import { usePlatformSettings } from "@/components/platform/platform-contact-card";
import { EMPTY_PLATFORM_SETTINGS } from "@/lib/db/platform-settings-repo";
import {
  fontHref,
  primaryButtonClass,
  themeVars,
  brandNameStyle,
} from "@/lib/platform-theme";
import { markNewStore } from "@/components/salon/new-store-welcome";
import { PasswordStrength, passwordRules } from "@/components/salon/password-strength";
import { checkEmail } from "@/lib/email-check";

const LAST_EMAIL_KEY = "platformAuth.lastEmail";
const OAUTH_PENDING = "platformAuth.oauthPending";

export const Route = createFileRoute("/auth")({
  ssr: false,
  // Keeps a same-origin return path (e.g. the OAuth consent screen) across the
  // whole sign-in round trip.
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const n = s["next"];
    const safe = typeof n === "string" && n.startsWith("/") && !n.startsWith("//");
    return safe ? { next: n as string } : {};
  },
  head: () => ({
    meta: [
      { title: "تسجيل الدخول وفتح مشغل جديد — Salon Flow" },
      {
        name: "description",
        content:
          "دخول أصحاب المشاغل إلى لوحة التحكم أو فتح مشغل جديد في خطوة واحدة: اسم المشغل والجوال والبريد وكلمة المرور.",
      },
      { property: "og:title", content: "تسجيل الدخول — Salon Flow" },
      {
        property: "og:description",
        content: "دخول آمن لأصحاب المشاغل وفتح متجر جديد فورًا مع الاشتراك التجريبي.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const refreshAccount = useRefreshAccount();
  const platform = usePlatformSettings();
  const settings = platform.data ?? EMPTY_PLATFORM_SETTINGS;
  const home = settings.home ?? {};
  const theme = home.theme;
  const brand = settings.brandName || "Salon Flow";

  const [mode, setMode] = useState<Mode>("signin");
  const [salonName, setSalonName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);

  // Live email diagnostics: names the exact problem and offers a fix.
  const emailIssue = useMemo(() => checkEmail(email), [email]);
  const showEmailIssue = emailTouched && !!email && !!emailIssue;


  const lastEmail = useMemo(
    () => (typeof window === "undefined" ? "" : window.localStorage.getItem(LAST_EMAIL_KEY) ?? ""),
    [],
  );

  useEffect(() => {
    if (lastEmail) setEmail(lastEmail);
  }, [lastEmail]);

  // Load the platform font so the auth page always matches the landing page.
  useEffect(() => {
    const href = fontHref(theme?.font);
    if (!href) return;
    let link = document.querySelector<HTMLLinkElement>('link[data-auth-font="platform"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.dataset["authFont"] = "platform";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [theme?.font]);

  useEffect(() => {
    document.title = `تسجيل الدخول — ${brand}`;
    if (!home.faviconUrl) return;
    let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = home.faviconUrl;
  }, [brand, home.faviconUrl]);

  // Continue an OAuth round trip only when the user pressed the Google button.
  useEffect(() => {
    if (window.sessionStorage.getItem(OAUTH_PENDING) !== "1") return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled) return;
      window.sessionStorage.removeItem(OAUTH_PENDING);
      await afterAuth();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function afterAuth() {
    const [{ clearDataContext }, { resetHydration }] = await Promise.all([
      import("@/lib/db/context"),
      import("@/lib/db/hydrate"),
    ]);
    clearDataContext();
    resetHydration();
    let account = null as Awaited<ReturnType<typeof loadAccount>>;
    for (let attempt = 0; attempt < 3 && !account; attempt += 1) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt));
      try {
        account = await loadAccount();
      } catch {
        account = null;
      }
    }
    if (!account) throw new Error("تعذّر تحميل الحساب بعد الدخول، حاول مرة أخرى");
    if (email.trim()) window.localStorage.setItem(LAST_EMAIL_KEY, email.trim());
    await refreshAccount();
    if (next) {
      window.location.href = next;
      return;
    }
    await navigate({ to: homeForRole(account.role), replace: true });
  }

  function validate(): string | null {
    if (mode === "signup" && !salonName.trim()) return "اسم المشغل مطلوب";
    if (mode === "signup" && !/^[0-9+\s-]{8,}$/.test(phone.trim()))
      return "رقم الجوال غير صحيح (٨ أرقام على الأقل)";
    if (emailIssue) return emailIssue.message;
    if (!password) return "كلمة المرور مطلوبة";
    if (mode === "signup") {
      const failing = passwordRules(password, confirm).filter((r) => !r.ok);
      if (failing.length) return `كلمة المرور غير مكتملة: ${failing[0]!.label}`;
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const invalid = validate();
    if (invalid) {
      setFormError(invalid);
      toast.error(invalid);
      return;
    }
    setFormError(null);
    setBlocked(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        toast.success("تم تسجيل الدخول");
        await afterAuth();
      } else {
        const store = salonName.trim();
        const { alreadyRegistered } = await signUp({
          email,
          password,
          fullName: email.trim().split("@")[0] || store,
          phone,
          salonName: store,
        });
        if (alreadyRegistered) {
          setBlocked(
            "نعتذر — هذا البريد الإلكتروني يملك حسابًا ومتجرًا بالفعل. سجّل الدخول بنفس البريد لإدارة متجرك، أو استخدم «نسيت كلمة المرور».",
          );
          setMode("signin");
          return;
        }
        // Existing owner reaching signup with a live session: never open a
        // second store for the same account.
        if (await currentUserOwnsSalon()) {
          setBlocked(
            "نعتذر — هذا البريد الإلكتروني يملك متجرًا بالفعل، ولا يمكن فتح متجر ثانٍ بنفس البريد.",
          );
          setMode("signin");
          return;
        }
        markNewStore();
        await ensureOwnedSalon(store, phone);
        toast.success("تم إنشاء متجرك وتفعيل الاشتراك التجريبي");
        await afterAuth();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "تعذّر إكمال العملية";
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function onForgot() {
    if (busy) return;
    if (!email.trim()) {
      toast.error("أدخل بريدك الإلكتروني أولاً");
      return;
    }
    setBusy(true);
    try {
      await sendPasswordReset(email);
      toast.success("أرسلنا رابط استعادة كلمة المرور إلى بريدك");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إرسال رابط الاستعادة");
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    if (busy) return;
    setBusy(true);
    try {
      window.sessionStorage.setItem(OAUTH_PENDING, "1");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri:
          window.location.origin +
          "/auth" +
          (next ? `?next=${encodeURIComponent(next)}` : ""),
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      toast.success("تم تسجيل الدخول");
      await afterAuth();
    } catch (err) {
      window.sessionStorage.removeItem(OAUTH_PENDING);
      toast.error(err instanceof Error ? err.message : "تعذّر الدخول عبر Google");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      dir="rtl"
      style={themeVars(theme)}
      className="relative min-h-screen overflow-hidden bg-background text-foreground"
    >
      {home.heroImageUrl && (
        <img
          src={home.heroImageUrl}
          alt=""
          aria-hidden="true"
          style={{ opacity: (theme?.heroImageOpacity ?? 15) / 100 }}
          className="absolute inset-0 size-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background/92 to-accent/20" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-4 py-10">
        <Link to="/" className="mb-7 flex items-center justify-center gap-3">
          {home.logoUrl ? (
            <img src={home.logoUrl} alt={brand} className="h-14 max-w-48 object-contain" />
          ) : (
            <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-[var(--shadow-glow)]">
              <Scissors className="size-6 text-primary-foreground" />
            </span>
          )}
          <span className="leading-tight">
            <span className="block text-2xl font-extrabold" style={brandNameStyle(theme)}>
              {brand}
            </span>
            {home.tagline && (
              <span className="block text-xs text-muted-foreground">{home.tagline}</span>
            )}
          </span>
        </Link>

        <div className="rounded-3xl border border-border bg-card/85 p-6 shadow-xl backdrop-blur-xl">
          <h1 className="mb-5 text-center text-xl font-extrabold text-foreground">
            {mode === "signin" ? "تسجيل الدخول" : "فتح مشغل جديد"}
          </h1>
          <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-muted/50 p-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setFormError(null);
                  setBlocked(null);
                }}
                className={
                  "h-10 rounded-xl text-sm font-semibold transition " +
                  (mode === m
                    ? "bg-card text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {m === "signin" ? "تسجيل الدخول" : "فتح مشغل جديد"}
              </button>
            ))}
          </div>

          {blocked && (
            <p
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-xs font-semibold text-amber-700 dark:text-amber-300"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {blocked}
            </p>
          )}

          <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
            {formError && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive"
              >
                {formError}
              </p>
            )}

            {mode === "signup" ? (
              <>
                <Field
                  label="اسم المشغل / الصالون"
                  icon={Store}
                  value={salonName}
                  onChange={setSalonName}
                  autoComplete="organization"
                  placeholder="مشغل لمسة الجمال"
                  required
                />
                <Field
                  label="رقم الجوال"
                  icon={Phone}
                  value={phone}
                  onChange={setPhone}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="05xxxxxxxx"
                  required
                />
                <Field
                  label="البريد الإلكتروني"
                  icon={Mail}
                  value={email}
                  onChange={(v) => {
                    setEmail(v);
                    setEmailTouched(true);
                  }}
                  onBlur={() => setEmailTouched(true)}
                  type="email"
                  autoComplete="email"
                  required
                  aria-invalid={showEmailIssue || undefined}
                />
                <EmailHint
                  show={showEmailIssue}
                  issue={emailIssue}
                  onApply={(v) => setEmail(v)}
                />
                <Field
                  label="كلمة المرور"
                  icon={Lock}
                  value={password}
                  onChange={setPassword}
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  reveal={showPwd}
                  onToggleReveal={() => setShowPwd((v) => !v)}
                />
                <PasswordStrength password={password} confirm={confirm} />
                <button
                  type="button"
                  onClick={() => {
                    const generated = suggestPassword();
                    setPassword(generated);
                    setConfirm(generated);
                    setShowPwd(true);
                    toast.success("تم اقتراح كلمة مرور قوية — احفظها في المتصفح");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  <Wand2 className="size-3.5" aria-hidden /> اقترح كلمة مرور قوية
                </button>
                <Field
                  label="تأكيد كلمة المرور"
                  icon={Lock}
                  value={confirm}
                  onChange={setConfirm}
                  type={showPwd ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />
                <p className="flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-[11px] font-semibold text-primary">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                  ندخلك للوحة التحكم مباشرة مع الاشتراك التجريبي، ويمكنك تأكيد البريد الإلكتروني
                  لاحقًا خلال شهر من إعدادات المتجر.
                </p>
              </>
            ) : (
              <>
                {lastEmail && (
                  <p className="rounded-xl bg-muted/50 px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                    آخر دخول بهذا البريد: <span className="text-foreground">{lastEmail}</span>
                  </p>
                )}
                <Field
                  label="البريد الإلكتروني"
                  icon={Mail}
                  value={email}
                  onChange={(v) => {
                    setEmail(v);
                    setEmailTouched(true);
                  }}
                  onBlur={() => setEmailTouched(true)}
                  type="email"
                  autoComplete="username email"
                  required
                  aria-invalid={showEmailIssue || undefined}
                />
                <EmailHint
                  show={showEmailIssue}
                  issue={emailIssue}
                  onApply={(v) => setEmail(v)}
                />
                <Field
                  label="كلمة المرور"
                  icon={Lock}
                  value={password}
                  onChange={setPassword}
                  type={showPwd ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  reveal={showPwd}
                  onToggleReveal={() => setShowPwd((v) => !v)}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={onForgot}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                  >
                    <KeyRound className="size-3.5" aria-hidden /> نسيت كلمة المرور؟
                  </button>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={busy}
              className={`inline-flex h-11 w-full items-center justify-center gap-2 text-sm disabled:opacity-60 ${primaryButtonClass(theme)}`}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "تسجيل الدخول" : "تسجيل وفتح المشغل"}
            </button>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-semibold text-muted-foreground">أو</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={onGoogle}
              disabled={busy}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-input bg-background text-sm font-bold transition hover:bg-muted/50 disabled:opacity-60"
            >
              <GoogleMark />
              المتابعة باستخدام Google
            </button>
          </form>
        </div>

        <Link
          to="/"
          className="mt-5 inline-flex items-center justify-center gap-2 self-center rounded-xl border border-border bg-card/70 px-4 py-2 text-xs font-semibold text-muted-foreground backdrop-blur hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> العودة إلى الصفحة الرئيسية
        </Link>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          بالدخول أنت توافق على شروط الاستخدام وسياسة الخصوصية.
        </p>
      </div>
    </main>
  );
}

type FieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon?: typeof Mail;
  reveal?: boolean;
  onToggleReveal?: () => void;
};

function Field({
  label,
  value,
  onChange,
  type = "text",
  icon: Icon,
  reveal,
  onToggleReveal,
  ...rest
}: FieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="relative mt-1">
        {Icon && (
          <Icon
            className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted-foreground"
            aria-hidden
          />
        )}
        <input
          {...rest}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={
            "h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 " +
            (Icon ? "pr-9 " : "") +
            (onToggleReveal ? "pl-10" : "")
          }
        />
        {onToggleReveal && (
          <button
            type="button"
            onClick={onToggleReveal}
            aria-label={reveal ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            className="absolute inset-y-0 left-0 grid place-items-center px-3 text-muted-foreground hover:text-foreground"
          >
            {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
    </label>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.3 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v8.3h12.5c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.5-4.2 6.6-10.3 6.6-17.4z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7A14.6 14.6 0 019.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 000 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.2 0 11.5-2 15.5-5.6l-7.6-5.9c-2 1.4-4.7 2.4-7.9 2.4-6.4 0-11.7-3.8-13.6-9.2l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
