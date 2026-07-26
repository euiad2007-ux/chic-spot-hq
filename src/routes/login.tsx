import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSalon, actions } from "@/lib/salon-store";
import { auth } from "@/lib/auth-store";
import { Scissors, User, Briefcase, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — صالون لمسة" },
      { name: "description", content: "دخول العملاء والموظفين وأصحاب الصالون." },
    ],
  }),
  component: LoginPage,
});

type Tab = "client" | "staff" | "owner";

function LoginPage() {
  const [tab, setTab] = useState<Tab>("client");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const { customers, staff } = useSalon((s) => s);
  const navigate = useNavigate();

  const submit = () => {
    if (tab === "owner") {
      auth.signIn({ role: "owner", id: "owner", name: "مالكة الصالون" });
      toast.success("مرحباً بك");
      navigate({ to: "/" });
      return;
    }
    if (!phone) return toast.error("أدخلي رقم الجوال");
    if (tab === "staff") {
      const s = staff.find((x) => x.phone === phone);
      if (!s) return toast.error("رقم غير مسجل. تواصلي مع الإدارة.");
      auth.signIn({ role: "staff", id: s.id, name: s.name });
      toast.success(`أهلاً ${s.name}`);
      navigate({ to: "/specialist" });
      return;
    }
    // client
    let c = customers.find((x) => x.phone === phone);
    if (!c) {
      if (!name) return toast.error("أدخلي الاسم لإنشاء حساب");
      c = actions.addCustomer({ name, phone, gender: "female" });
    }
    auth.signIn({ role: "client", id: c.id, name: c.name });
    toast.success(`أهلاً ${c.name}`);
    navigate({ to: "/client" });
  };

  const tabs: { key: Tab; label: string; icon: typeof User }[] = [
    { key: "client", label: "عميلة", icon: User },
    { key: "staff", label: "موظفة", icon: Briefcase },
    { key: "owner", label: "الإدارة", icon: Shield },
  ];

  return (
    <div className="min-h-screen grid place-items-center p-4" dir="rtl">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 size-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-accent/20 blur-3xl" />
      </div>
      <div className="glass-card rounded-3xl w-full max-w-md p-8">
        <Link to="/site" className="flex items-center gap-3 justify-center">
          <div className="size-11 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center shadow-[var(--shadow-glow)]">
            <Scissors className="size-6 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-lg leading-none">صالون لمسة</div>
            <div className="text-[11px] text-muted-foreground mt-1">تسجيل الدخول</div>
          </div>
        </Link>

        <div className="mt-8 grid grid-cols-3 gap-2 rounded-xl bg-muted/40 border border-border p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition",
                  active
                    ? "bg-gradient-to-l from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="mt-6 space-y-4">
          {tab !== "owner" && (
            <>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">رقم الجوال</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05xxxxxxxx"
                  className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm focus:border-primary/50 outline-none"
                />
              </div>
              {tab === "client" && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                    الاسم <span className="text-muted-foreground/60">(للعميلات الجديدات)</span>
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="اسمك الكامل"
                    className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm focus:border-primary/50 outline-none"
                  />
                </div>
              )}
            </>
          )}
          {tab === "owner" && (
            <div className="text-sm text-muted-foreground text-center py-4">
              دخول تجريبي لمالكة الصالون — بدون كلمة مرور
            </div>
          )}

          <button
            onClick={submit}
            className="w-full h-12 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold shadow-[var(--shadow-glow)]"
          >
            دخول
          </button>

          <div className="text-center text-xs text-muted-foreground">
            <Link to="/site" className="hover:text-foreground">← عودة للموقع</Link>
          </div>
        </div>

        {tab === "staff" && staff.length > 0 && (
          <div className="mt-5 text-[10px] text-muted-foreground text-center">
            جربي: {staff[0].phone}
          </div>
        )}
        {tab === "client" && customers.length > 0 && (
          <div className="mt-5 text-[10px] text-muted-foreground text-center">
            جربي: {customers[0].phone}
          </div>
        )}
      </div>
    </div>
  );
}
