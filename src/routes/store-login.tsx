import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Scissors, Loader2, IdCard, User, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { signIn, signUp, homeForRole, loadAccount } from "@/lib/account";
import { useRefreshAccount } from "@/hooks/use-account";
import {
  useSiteSettings,
  settingsToCssVars,
  googleFontsHref,
} from "@/lib/site-settings";

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
  const [busy, setBusy] = useState(false);

  // Store branding comes from the salon's own site settings.
  useEffect(() => {
    void import("@/lib/db/public-hydrate").then((m) => m.hydratePublicSite(slug));
  }, [slug]);


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

  // Already signed in → straight to the right home.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled) return;
      const account = await loadAccount();
      if (!account || cancelled) return;
      await refreshAccount();
      navigate({ to: homeForRole(account.role), replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, refreshAccount]);

  async function afterAuth() {
    const account = await loadAccount();
    await refreshAccount();
    navigate({ to: account ? homeForRole(account.role) : "/", replace: true });
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
        <Link to="/site" className="flex items-center justify-center gap-3 mb-7">
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
        </Link>

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
              type="password"
              autoComplete={creating ? "new-password" : "current-password"}
              required
              minLength={6}
            />

            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-xl text-white font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: gradient }}
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              {creating ? "إنشاء حساب العميل" : audience === "staff" ? "دخول الموظف" : "دخول العميل"}
            </button>
          </form>

          {audience === "client" ? (
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="mt-4 w-full text-center text-sm font-semibold hover:underline"
              style={{ color: site.primary }}
            >
              {creating ? "لدي حساب بالفعل — تسجيل الدخول" : "عميل جديد؟ أنشئ حسابك"}
            </button>
          ) : (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              حسابات الموظفين تُنشأ من إدارة المشغل. راجع الإدارة إذا لم تتمكن من الدخول.
            </p>
          )}
        </div>

        <Link
          to="/site"
          className="mt-5 flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> العودة إلى موقع {site.salonName}
        </Link>
      </div>
    </main>
  );
}

type FieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & {
  label: string;
  value: string;
  onChange: (v: string) => void;
};

function Field({ label, value, onChange, type = "text", ...rest }: FieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        {...rest}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
