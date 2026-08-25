import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Store, User, Scissors, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  createSalonForCurrentUser,
  ensureClientProfile,
  signOutAccount,
} from "@/lib/account";
import { useRefreshAccount } from "@/hooks/use-account";
import { clearDataContext } from "@/lib/db/context";
import { resetHydration, hydrateAll } from "@/lib/db/hydrate";
import { acceptStaffInvite } from "@/lib/db/invites-repo";
import { supabase } from "@/integrations/supabase/client";

/** True when the signed-in user already owns a salon (one store per account). */
async function ownsSalon(): Promise<boolean> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return false;
  const { data } = await supabase.from("salons").select("id").eq("owner_id", uid).limit(1);
  return (data?.length ?? 0) > 0;
}

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "تجهيز الحساب — Salon Flow" },
      {
        name: "description",
        content: "أكمل تجهيز حسابك: أنشئ مشغلك الخاص أو تابع كعميلة للحجز في المشاغل.",
      },
      { property: "og:title", content: "تجهيز الحساب — Salon Flow" },
      { property: "og:description", content: "خطوة واحدة لبدء استخدام Salon Flow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const refreshAccount = useRefreshAccount();
  const [choice, setChoice] = useState<"owner" | "client" | "invite">("owner");
  const [inviteCode, setInviteCode] = useState("");
  const ownerQuery = useQuery({ queryKey: ["owns-salon"], queryFn: ownsSalon });
  const alreadyOwner = ownerQuery.data === true;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const code = new URLSearchParams(window.location.search).get("invite");
    if (code) {
      setInviteCode(code);
      setChoice("invite");
    }
  }, []);

  useEffect(() => {
    if (alreadyOwner && choice === "owner") setChoice("client");
  }, [alreadyOwner, choice]);
  const [salonName, setSalonName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  async function finish(to: string) {
    clearDataContext();
    resetHydration();
    await hydrateAll(true);
    await refreshAccount();
    navigate({ to, replace: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (choice === "invite") {
        if (!inviteCode.trim()) throw new Error("رمز الدعوة مطلوب");
        await acceptStaffInvite(inviteCode);
        toast.success("تم قبول الدعوة");
        await finish("/specialist");
      } else if (choice === "owner") {
        if (alreadyOwner) throw new Error("لديك مشغل بالفعل — لا يمكن إنشاء مشغل جديد بنفس الحساب");
        if (!salonName.trim()) throw new Error("اسم المشغل مطلوب");
        await createSalonForCurrentUser(salonName, phone);
        toast.success("تم إنشاء المشغل");
        await finish("/dashboard");
      } else {
        const id = await ensureClientProfile();
        if (!id) {
          toast.error("لا يوجد مشغل متاح حاليًا — أنشئ مشغلك أو تواصل مع المشغل لإضافتك");
          return;
        }
        toast.success("تم تجهيز حسابك");
        await finish("/client");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إكمال التجهيز");
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
        <div className="flex items-center justify-center gap-3 mb-7">
          <span className="size-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Scissors className="size-6 text-primary-foreground" />
          </span>
          <span className="text-2xl font-extrabold gradient-text">Salon Flow</span>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl p-6 shadow-lg">
          <h1 className="text-lg font-bold text-center">خطوة أخيرة لتجهيز حسابك</h1>
          <p className="mt-2 text-sm text-muted-foreground text-center">
            حسابك غير مرتبط بأي مشغل بعد. اختر كيف تريد استخدام المنصة.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={alreadyOwner}
                title={alreadyOwner ? "لديك مشغل بالفعل" : undefined}
                onClick={() => setChoice("owner")}
                className={
                  "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-semibold transition " +
                  (choice === "owner"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50")
                }
              >
                <Store className="size-4" />
                صاحب مشغل
              </button>
              <button
                type="button"
                onClick={() => setChoice("invite")}
                className={
                  "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-semibold transition " +
                  (choice === "invite"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50")
                }
              >
                <UserPlus className="size-4" />
                موظف مدعو
              </button>
              <button
                type="button"
                onClick={() => setChoice("client")}
                className={
                  "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-semibold transition " +
                  (choice === "client"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted/50")
                }
              >
                <User className="size-4" />
                عميلة
              </button>
            </div>

            {alreadyOwner && (
              <p className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                لديك مشغل مسجّل بهذا الحساب — لا يمكن إنشاء مشغل جديد، ويمكنك الانضمام لمشاغل أخرى
                كعميلة أو كموظفة عبر دعوة.
              </p>
            )}

            {choice === "invite" ? (
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">رمز الدعوة</span>
                <input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  placeholder="مثال: 9F2A7C4B1D3E"
                  className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm font-mono outline-none focus:border-primary"
                />
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  استخدم نفس البريد الإلكتروني الذي وصلتك عليه الدعوة.
                </span>
              </label>
            ) : choice === "owner" ? (
              <>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">
                    اسم المشغل / الصالون
                  </span>
                  <input
                    value={salonName}
                    onChange={(e) => setSalonName(e.target.value)}
                    required
                    className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">رقم الجوال</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    className="mt-1 w-full h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                </label>
              </>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                سيتم تجهيز ملف عميلة لك للحجز ومتابعة المحفظة ونقاط الولاء.
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full h-11 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              متابعة
            </button>
          </form>

          <button
            type="button"
            onClick={async () => {
              await signOutAccount();
              navigate({ to: "/auth", replace: true });
            }}
            className="mt-4 w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    </main>
  );
}
