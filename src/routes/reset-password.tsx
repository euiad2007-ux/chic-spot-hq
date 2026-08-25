import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Scissors, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { updatePassword } from "@/lib/account";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تعيين كلمة مرور جديدة — Salon Flow" },
      {
        name: "description",
        content: "أدخل كلمة مرور جديدة لحسابك في Salon Flow بعد استلام رابط الاستعادة على بريدك.",
      },
      { property: "og:title", content: "تعيين كلمة مرور جديدة — Salon Flow" },
      { property: "og:description", content: "استعادة الوصول إلى حسابك بأمان." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await updatePassword(password);
      toast.success("تم تحديث كلمة المرور");
      navigate({ to: "/auth", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر تحديث كلمة المرور");
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
          <span className="size-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Scissors className="size-6 text-primary-foreground" />
          </span>
          <span className="text-2xl font-extrabold gradient-text">Salon Flow</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-6 shadow-lg">
          <h1 className="text-lg font-bold text-center">كلمة مرور جديدة</h1>
          {!ready ? (
            <p className="mt-3 text-sm text-muted-foreground text-center">
              افتح رابط الاستعادة من بريدك الإلكتروني ثم أعد المحاولة من هذه الصفحة.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4 mt-5">
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">كلمة المرور الجديدة</span>
                <div className="relative mt-1">
                  <input
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className="w-full h-11 rounded-xl border border-input bg-background px-3 pl-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((v) => !v)}
                    aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    className="absolute inset-y-0 left-0 px-3 grid place-items-center text-muted-foreground hover:text-foreground"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>
              <button
                type="submit"
                disabled={busy}
                className="w-full h-11 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                تحديث كلمة المرور
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
      </div>
    </main>
  );
}
