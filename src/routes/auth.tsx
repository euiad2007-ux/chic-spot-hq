import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Scissors, Loader2, Store, User } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { signIn, signUp, homeForRole, loadAccount } from "@/lib/account";
import { useRefreshAccount } from "@/hooks/use-account";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — Salon Flow" },
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
  const [mode, setMode] = useState<Mode>("signin");
  const [asOwner, setAsOwner] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [salonName, setSalonName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  // Already signed in → go to the right home.
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
      if (mode === "signin") {
        await signIn(email, password);
        toast.success("تم تسجيل الدخول");
        await afterAuth();
      } else {
        if (!fullName.trim()) throw new Error("الاسم مطلوب");
        if (asOwner && !salonName.trim()) throw new Error("اسم المشغل مطلوب");
        const { needsConfirmation } = await signUp({
          email,
          password,
          fullName,
          phone,
          salonName: asOwner ? salonName : undefined,
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

  async function onGoogle() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/auth",
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      toast.success("تم تسجيل الدخول");
      await afterAuth();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الدخول عبر Google");
    } finally {
      setBusy(false);
    }
  }


  return (
    <main
      dir="rtl"
      className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-br from-primary/10 via-background to-accent/10"
    >
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-7">
          <span className="size-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Scissors className="size-6 text-primary-foreground" />
          </span>
          <span className="text-2xl font-extrabold gradient-text">Salon Flow</span>
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
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAsOwner(true)}
                      className={
                        "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-semibold transition " +
                        (asOwner
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/50")
                      }
                    >
                      <Store className="size-4" />
                      صاحب مشغل
                    </button>
                    <button
                      type="button"
                      onClick={() => setAsOwner(false)}
                      className={
                        "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-semibold transition " +
                        (!asOwner
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:bg-muted/50")
                      }
                    >
                      <User className="size-4" />
                      عميل
                    </button>
                  </div>
                  <Field
                    label="الاسم الكامل"
                    value={fullName}
                    onChange={setFullName}
                    autoComplete="name"
                    required
                  />
                  {asOwner && (
                    <Field
                      label="اسم المشغل / الصالون"
                      value={salonName}
                      onChange={setSalonName}
                      required
                    />
                  )}
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
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
              />

              <button
                type="submit"
                disabled={busy}
                className="w-full h-11 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
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

        <p className="mt-5 text-center text-xs text-muted-foreground">
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
