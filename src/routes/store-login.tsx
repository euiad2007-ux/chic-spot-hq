import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Scissors, Loader2, IdCard, User, ArrowLeft, Eye, EyeOff, KeyRound, Home } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { SiteLink } from "@/components/salon/salon-nav-links";
import {
  signIn,
  signUp,
  homeForRole,
  loadAccount,
  sendPasswordReset,
  signOutAccount,
} from "@/lib/account";
import { requestJoinSalon } from "@/lib/db/join-requests-repo";
import { useRefreshAccount } from "@/hooks/use-account";
import {
  useSiteSettings,
  settingsToCssVars,
  googleFontsHref,
} from "@/lib/site-settings";

const STORE_OAUTH_PENDING = "storeLogin.oauthPending";

function rememberedStoreEmail(slug?: string) {
  return `storeLogin.rememberedEmail.${slug ?? "default"}`;
}

export const Route = createFileRoute("/store-login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "دخول المشغل — الموظفون والعملاء" },
      {
        name: "description",
        content:
          "صفحة دخول خاصة بالمشغل: دخول الموظفين إلى لوحة العمل ودخول العملاء لإدارة حجوزاتهم ومحفظتهم.",
      },
      { property: "og:title", content: "دخول المشغل — الموظفون والعملاء" },
      { property: "og:description", content: "دخول الموظفين والعملاء الخاص بهذا المشغل." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoreLoginPage,
});

type Audience = "client" | "staff";

function StoreLoginPage() {
  return <StoreLoginView />;
}

/** Salon-scoped login. With `slug` it brands and links to that salon only. */
export function StoreLoginView({ slug }: { slug?: string }) {
  const navigate = useNavigate();
  const refreshAccount = useRefreshAccount();
  const site = useSiteSettings();

  const [audience, setAudience] = useState<Audience>("client");
  const [creating, setCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [salonId, setSalonId] = useState<string | null>(null);
  const [siteReady, setSiteReady] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);

  // Store branding comes from the salon's own site settings.
  useEffect(() => {
    void import("@/lib/db/public-hydrate").then(async (m) => {
      const meta = await m.hydratePublicSite(slug, true);
      setSalonId(meta?.salonId ?? null);
      setSiteReady(true);
    });
  }, [slug]);


  // The salon's own favicon completes the branded login identity.
  useEffect(() => {
    if (typeof document === "undefined" || !site.faviconUrl) return;
    let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.href = site.faviconUrl;
  }, [site.faviconUrl]);

  useEffect(() => {
    const href = googleFontsHref(site);
    if (typeof document === "undefined" || !href) return;
    let link = document.getElementById("store-login-fonts") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = "store-login-fonts";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [site]);

  useEffect(() => {
    const saved = window.localStorage.getItem(rememberedStoreEmail(slug));
    if (saved) setEmail(saved);
  }, [slug]);

  // Continue automatically only when returning from a Google button click.
  useEffect(() => {
    if (!siteReady || window.sessionStorage.getItem(STORE_OAUTH_PENDING) !== "1") return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled) return;
      const account = await loadAccount();
      if (!account || cancelled) return;
      const stored =
        typeof window === "undefined"
          ? null
          : window.sessionStorage.getItem("storeLogin.audience");
      if (stored) window.sessionStorage.removeItem("storeLogin.audience");
      window.sessionStorage.removeItem(STORE_OAUTH_PENDING);
      await afterAuth(stored === "staff" ? "staff" : stored === "client" ? "client" : audience);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteReady]);

  /**
   * Attaches the freshly signed-in user to this salon:
   * clients are activated at once, staff wait for the merchant's approval.
   */
  async function afterAuth(kind: Audience = audience) {
    const [{ clearDataContext }, { resetHydration }] = await Promise.all([
      import("@/lib/db/context"),
      import("@/lib/db/hydrate"),
    ]);
    clearDataContext();
    resetHydration();
    // Retry the profile read: a flaky connection must not turn a successful
    // sign-in into a bounce back to this login page.
    let account = null as Awaited<ReturnType<typeof loadAccount>>;
    for (let attempt = 0; attempt < 3 && !account; attempt += 1) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt));
      try {
        account = await loadAccount();
      } catch {
        account = null;
      }
    }


    if (salonId) {
      const alreadyMember = account?.memberships.some((m) => m.salon_id === salonId) ?? false;
      if (kind === "staff" && !alreadyMember) {
        const res = await requestJoinSalon({
          salonId,
          kind: "staff",
          name: fullName || account?.fullName,
          phone,
          jobTitle,
        });
        if (res.status !== "member") {
          await signOutAccount();
          await refreshAccount();
          toast.success("تم إرسال طلب الانضمام — سيتم تفعيل حسابك بعد موافقة إدارة المشغل");
          return;
        }
      } else if (kind === "client" && !alreadyMember) {
        await requestJoinSalon({
          salonId,
          kind: "client",
          name: fullName || account?.fullName,
          phone,
        });
        account = await loadAccount();
      }
    }

    await refreshAccount();
    navigate({ to: account ? homeForRole(account.role) : "/", replace: true });
  }

  async function onGoogle() {
    if (busy) return;
    setBusy(true);
    try {
      window.sessionStorage.setItem("storeLogin.audience", audience);
      window.sessionStorage.setItem(STORE_OAUTH_PENDING, "1");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + (slug ? `/salon/${slug}/login` : "/store-login"),
      });
      if (result.error) throw result.error;
      if (!("redirected" in result && result.redirected)) await afterAuth();
    } catch (err) {
      window.sessionStorage.removeItem(STORE_OAUTH_PENDING);
      toast.error(err instanceof Error ? err.message : "تعذّر الدخول عبر Google");
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (creating) {
        if (!fullName.trim()) throw new Error("الاسم مطلوب");
        const { needsConfirmation } = await signUp({ email, password, fullName, phone });
        if (needsConfirmation) {
          toast.success("تم إنشاء الحساب — تحقق من بريدك لتأكيد الحساب");
          setCreating(false);
        } else {
          toast.success("تم إنشاء الحساب");
          await afterAuth();
        }
      } else {
        await signIn(email, password);
        if (rememberEmail) window.localStorage.setItem(rememberedStoreEmail(slug), email.trim());
        else window.localStorage.removeItem(rememberedStoreEmail(slug));
        toast.success("تم تسجيل الدخول");
        await afterAuth();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إكمال العملية");
    } finally {
      setBusy(false);
    }
  }

  const gradient = `linear-gradient(90deg, ${site.primary}, ${site.accent})`;

  return (
    <main
      dir="rtl"
      className="store-login min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        ...settingsToCssVars(site),
        background: `linear-gradient(160deg, ${site.primary}1a, transparent 55%), var(--background)`,
      }}
    >
      <style>{`.store-login h1,.store-login h2{font-family:var(--font-display)}`}</style>

      <div className="w-full max-w-md">
        <SiteLink slug={slug} className="flex items-center justify-center gap-3 mb-7">
          <span
            className="size-12 rounded-2xl grid place-items-center overflow-hidden"
            style={{ background: gradient }}
          >
            {site.logoUrl ? (
              <img src={site.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Scissors className="size-6 text-white" aria-hidden />
            )}
          </span>
          <span className="text-2xl font-extrabold">{site.salonName}</span>
        </SiteLink>


        <div className="rounded-2xl border border-border bg-card/85 backdrop-blur-xl p-6 shadow-lg">
          <h1 className="text-lg font-bold text-center">دخول {site.salonName}</h1>
          <p className="text-xs text-muted-foreground text-center mt-1">
            هذه الصفحة خاصة بموظفي وعملاء هذا المشغل فقط
          </p>

          <div className="grid grid-cols-2 gap-2 mt-5">
            {(
              [
                { id: "client" as Audience, label: "دخول العملاء", icon: User },
                { id: "staff" as Audience, label: "دخول الموظفين", icon: IdCard },
              ]
            ).map((a) => {
              const on = audience === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    setAudience(a.id);
                    setCreating(false);
                  }}
                  className="flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-bold transition"
                  style={
                    on
                      ? { borderColor: site.primary, background: `${site.primary}18`, color: site.primary }
                      : undefined
                  }
                >
                  <a.icon className="size-4" aria-hidden />
                  {a.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={onSubmit} className="space-y-4 mt-5">
            {creating && (
              <>
                <Field label="الاسم الكامل" value={fullName} onChange={setFullName} autoComplete="name" required />
                <Field label="رقم الجوال" value={phone} onChange={setPhone} type="tel" autoComplete="tel" />
                {audience === "staff" && (
                  <Field label="المسمى الوظيفي" value={jobTitle} onChange={setJobTitle} />
                )}
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
              autoComplete={creating ? "new-password" : "current-password"}
              required
              minLength={6}
              reveal={showPwd}
              onToggleReveal={() => setShowPwd((v) => !v)}
            />

            {!creating && (
              <div className="flex items-center justify-between gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="size-4 accent-[var(--site-primary)]"
                  />
                  تذكّر البريد
                </label>
                <button
                  type="button"
                  onClick={onForgot}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline disabled:opacity-60"
                  style={{ color: site.primary }}
                >
                  <KeyRound className="size-3.5" aria-hidden /> نسيت كلمة المرور؟
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-xl text-white font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: gradient }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {creating
                ? audience === "staff"
                  ? "إرسال طلب انضمام كموظف"
                  : "إنشاء حساب العميل"
                : audience === "staff"
                  ? "دخول الموظف"
                  : "دخول العميل"}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-semibold text-muted-foreground">أو</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={onGoogle}
            disabled={busy}
            className="mt-4 w-full h-11 rounded-xl border border-border bg-background hover:bg-muted/50 font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2a7 7 0 0 1-6.6-4.8H1.4v3.1A12 12 0 0 0 12 24Z"
              />
              <path fill="#FBBC05" d="M5.4 14.5a7.2 7.2 0 0 1 0-5H1.4a12 12 0 0 0 0 8.1l4-3.1Z" />
              <path
                fill="#EA4335"
                d="M12 4.8c1.8 0 3.3.6 4.5 1.8l3.4-3.4A11.6 11.6 0 0 0 12 0 12 12 0 0 0 1.4 6.4l4 3.1A7 7 0 0 1 12 4.8Z"
              />
            </svg>
            {audience === "staff" ? "متابعة بحساب Google كموظف" : "متابعة بحساب Google"}
          </button>

          <button
            type="button"
            onClick={() => setCreating((v) => !v)}
            className="mt-4 w-full text-center text-sm font-semibold hover:underline"
            style={{ color: site.primary }}
          >
            {creating
              ? "لدي حساب بالفعل — تسجيل الدخول"
              : audience === "staff"
                ? "موظف جديد؟ أرسل طلب انضمام"
                : "عميل جديد؟ أنشئ حسابك"}
          </button>

          {audience === "staff" && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              طلبات الموظفين تحتاج موافقة إدارة المشغل قبل تفعيل الحساب.
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
          <SiteLink
            slug={slug}
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden /> العودة إلى موقع {site.salonName}
          </SiteLink>
          <a
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Home className="size-3.5" aria-hidden /> الصفحة الرئيسية
          </a>
        </div>

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
