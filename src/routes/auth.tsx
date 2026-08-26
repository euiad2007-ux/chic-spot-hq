import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Scissors, Loader2, Store, Eye, EyeOff, ArrowLeft, KeyRound, Check } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

import { signIn, signUp, homeForRole, loadAccount, resendConfirmation, sendPasswordReset } from "@/lib/account";
import { useRefreshAccount } from "@/hooks/use-account";
import { usePlatformSettings } from "@/components/platform/platform-contact-card";
import { EMPTY_PLATFORM_SETTINGS } from "@/lib/db/platform-settings-repo";
import { fontHref, primaryButtonClass, themeVars } from "@/lib/platform-theme";

const REMEMBERED_OWNER_EMAIL = "platformAuth.rememberedEmail";
const OWNER_OAUTH_PENDING = "platformAuth.oauthPending";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "دخول ملاك المشاغل — Salon Flow" },
      {
        name: "description",
        content: "سجّل الدخول إلى حساب مشغلك أو حسابك الشخصي لإدارة الحجوزات والخدمات والفواتير.",
      },
      { property: "og:title", content: "تسجيل الدخول — Salon Flow" },
      { property: "og:description", content: "دخول آمن لأصحاب المشاغل والموظفين والعملاء." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const refreshAccount = useRefreshAccount();
  const platform = usePlatformSettings();
  const settings = platform.data ?? EMPTY_PLATFORM_SETTINGS;
  const home = settings.home ?? {};
  const theme = home.theme;
  const brand = settings.brandName || "Salon Flow";
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [salonName, setSalonName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);

  // Restore only the non-sensitive email preference. Passwords remain under
  // the browser/password manager, while the auth client persists the session.
  useEffect(() => {
    const saved = window.localStorage.getItem(REMEMBERED_OWNER_EMAIL);
    if (saved) setEmail(saved);
  }, []);

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

  // Automatic continuation is allowed only after the user explicitly pressed
  // the Google button. Merely visiting /auth never opens the dashboard.
  useEffect(() => {
    if (window.sessionStorage.getItem(OWNER_OAUTH_PENDING) !== "1") return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled) return;
      window.sessionStorage.removeItem(OWNER_OAUTH_PENDING);
      await afterAuth();
    })();
    return () => {
      cancelled = true;
    };
    // Run once on an OAuth return only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function afterAuth() {
    const [{ clearDataContext }, { resetHydration }] = await Promise.all([
      import("@/lib/db/context"),
      import("@/lib/db/hydrate"),
    ]);
    clearDataContext();
    resetHydration();
    // Weak networks can drop the first profile read; retry before giving up so a
    // successful sign-in is never reported as a failure.
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
    await refreshAccount();
    await navigate({ to: homeForRole(account.role), replace: true });
  }


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        if (rememberEmail) window.localStorage.setItem(REMEMBERED_OWNER_EMAIL, email.trim());
        else window.localStorage.removeItem(REMEMBERED_OWNER_EMAIL);
        toast.success("تم تسجيل الدخول");
        await afterAuth();
      } else {
        if (!fullName.trim()) throw new Error("الاسم مطلوب");
        if (!salonName.trim()) throw new Error("اسم المشغل مطلوب");
        const { needsConfirmation } = await signUp({
          email,
          password,
          fullName,
          phone,
          salonName,
        });
        if (needsConfirmation) {
          setSent(true);
          toast.success("تم إنشاء الحساب — تحقق من بريدك لتأكيد الحساب");
        } else {
          toast.success("تم إنشاء الحساب");
          await afterAuth();
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إكمال العملية");
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
      window.sessionStorage.setItem(OWNER_OAUTH_PENDING, "1");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      toast.success("تم تسجيل الدخول");
      await afterAuth();
    } catch (err) {
      window.sessionStorage.removeItem(OWNER_OAUTH_PENDING);
      toast.error(err instanceof Error ? err.message : "تعذّر الدخول عبر Google");
    } finally {
      setBusy(false);
    }
  }


  return (
    <main
      dir="rtl"
      style={themeVars(theme)}
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10 bg-background text-foreground"
    >
      {home.heroImageUrl && (
        <img
          src={home.heroImageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full object-cover opacity-15"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background/90 to-accent/15" />
      <div className="relative w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-7">
          {home.logoUrl ? (
            <img src={home.logoUrl} alt={brand} className="h-14 max-w-48 object-contain" />
          ) : (
            <span className="size-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)]">
              <Scissors className="size-6 text-primary-foreground" />
            </span>
          )}
          <span className="leading-tight">
            <span className="block text-2xl font-extrabold">{brand}</span>
            {home.tagline && <span className="block text-xs text-muted-foreground">{home.tagline}</span>}
          </span>
        </Link>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-6 shadow-lg">
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-muted/50 mb-6">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setSent(false);
                }}
                className={
                  "h-10 rounded-lg text-sm font-semibold transition " +
                  (mode === m
                    ? "bg-card shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {m === "signin" ? "تسجيل الدخول" : "حساب جديد"}
              </button>
            ))}
          </div>

          {sent ? (
            <div className="text-center space-y-3 py-4">
              <h1 className="text-lg font-bold">تحقق من بريدك الإلكتروني</h1>
              <p className="text-sm text-muted-foreground">
                أرسلنا رابط تأكيد إلى <span className="font-semibold">{email}</span>. بعد التأكيد
                سجّل الدخول وسيتم تجهيز لوحة مشغلك تلقائيًا.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await resendConfirmation(email);
                    toast.success("أعدنا إرسال رابط التأكيد");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "تعذّر إرسال الرابط");
                  } finally {
                    setBusy(false);
                  }
                }}
                className="w-full h-11 rounded-xl border border-input text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                إعادة إرسال رابط التأكيد
              </button>
              <button
                type="button"
                onClick={() => {
                  setSent(false);
                  setMode("signin");
                }}
                className="text-sm font-semibold text-primary hover:underline"
              >
                الانتقال لتسجيل الدخول

              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div className="rounded-xl border border-primary/30 bg-primary/10 p-3 flex items-start gap-2 text-[11px] font-semibold text-primary">
                    <Store className="size-4 shrink-0" aria-hidden />
                    <span>
                      التسجيل هنا لملاك المشاغل فقط. الموظفون والعملاء يدخلون من صفحة دخول المشغل
                      الخاصة به.
                    </span>
                  </div>
                  <Field
                    label="الاسم الكامل"
                    value={fullName}
                    onChange={setFullName}
                    autoComplete="name"
                    required
                  />
                  <Field
                    label="اسم المشغل / الصالون"
                    value={salonName}
                    onChange={setSalonName}
                    required
                  />
                  <Field
                    label="رقم الجوال"
                    value={phone}
                    onChange={setPhone}
                    type="tel"
                    autoComplete="tel"
                  />
                </>
              )}

              <Field
                label="البريد الإلكتروني"
                value={email}
                onChange={setEmail}
                type="email"
                autoComplete="email"
                required
              />
              <Field
                label="كلمة المرور"
                value={password}
                onChange={setPassword}
                type={showPwd ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                reveal={showPwd}
                onToggleReveal={() => setShowPwd((v) => !v)}
              />

              {mode === "signin" && (
                <div className="flex items-center justify-between gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={rememberEmail}
                      onChange={(e) => setRememberEmail(e.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="size-4 rounded border border-input grid place-items-center peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                      {rememberEmail && <Check className="size-3" />}
                    </span>
                    تذكّر البريد
                  </label>
                  <button
                    type="button"
                    onClick={onForgot}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                  >
                    <KeyRound className="size-3.5" aria-hidden /> نسيت كلمة المرور؟
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className={`w-full h-11 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60 ${primaryButtonClass(theme)}`}
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                {mode === "signin" ? "دخول" : "إنشاء الحساب"}
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
                className="w-full h-11 rounded-xl border border-input bg-background font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-muted/50 transition disabled:opacity-60"
              >
                <GoogleMark />
                المتابعة باستخدام Google
              </button>
            </form>

          )}
        </div>

        <Link
          to="/"
          className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
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
  /** Shows an eye toggle for password fields. */
  reveal?: boolean;
  onToggleReveal?: () => void;
};

function Field({ label, value, onChange, type = "text", reveal, onToggleReveal, ...rest }: FieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="relative mt-1">
        <input
          {...rest}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={
            "w-full h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 " +
            (onToggleReveal ? "pl-10" : "")
          }
        />
        {onToggleReveal && (
          <button
            type="button"
            onClick={onToggleReveal}
            aria-label={reveal ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
            className="absolute inset-y-0 left-0 px-3 grid place-items-center text-muted-foreground hover:text-foreground"
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
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.3 17.6 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v8.3h12.5c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.5-4.2 6.6-10.3 6.6-17.4z" />
      <path fill="#FBBC05" d="M10.4 28.7A14.6 14.6 0 019.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 000 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.2 0 11.5-2 15.5-5.6l-7.6-5.9c-2 1.4-4.7 2.4-7.9 2.4-6.4 0-11.7-3.8-13.6-9.2l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}
