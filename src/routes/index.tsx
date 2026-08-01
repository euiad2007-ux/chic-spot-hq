import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  Scissors,
  CalendarDays,
  Users2,
  Receipt,
  Package,
  Wallet,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { loadAccount, homeForRole } from "@/lib/account";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Salon Flow — منصة إدارة المشاغل والصالونات" },
      {
        name: "description",
        content:
          "منصة سحابية لإدارة المشاغل: حجوزات بلا تعارض، فواتير ضريبية، مخزون، رواتب وحضور، محافظ ونقاط ولاء.",
      },
      { property: "og:title", content: "Salon Flow — منصة إدارة المشاغل والصالونات" },
      {
        property: "og:description",
        content: "أدر مشغلك بالكامل من مكان واحد: الحجوزات والخدمات والموظفين والفواتير والمخزون.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: CalendarDays, title: "حجوزات ذكية", desc: "منع تعارض مواعيد الموظفين تلقائيًا وترقيم حجوزات تسلسلي." },
  { icon: Receipt, title: "فواتير وضريبة", desc: "ترقيم تسلسلي، ضريبة القيمة المضافة، دفعات جزئية واسترجاع." },
  { icon: Users2, title: "موظفون ورواتب", desc: "حضور بالموقع الجغرافي، عمولات، بدلات وكشوف رواتب شهرية." },
  { icon: Package, title: "مخزون دقيق", desc: "وحدات قياس مرنة، خصم تلقائي عند تنفيذ الخدمة وتنبيهات النقص." },
  { icon: Wallet, title: "محافظ وولاء", desc: "محفظة لكل عميل بسجل حركات كامل ونقاط ولاء وإحالات." },
  { icon: ShieldCheck, title: "أمان متعدد المشاغل", desc: "كل مشغل معزول تمامًا بصلاحيات على مستوى قاعدة البيانات." },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const tenant = await resolveTenant();
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!data.session) {
        // Reached through a salon's own domain: show that salon's website,
        // never the platform landing page.
        if (tenant) navigate({ to: "/site", replace: true });
        return;
      }
      const account = await loadAccount();
      if (!account || cancelled) return;
      navigate({ to: homeForRole(account.role), replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);


  return (
    <main dir="rtl" className="min-h-screen bg-background">
      <header className="h-16 border-b border-border flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Scissors className="size-5 text-primary-foreground" />
          </span>
          <span className="font-extrabold text-lg gradient-text">Salon Flow</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/site"
            className="hidden sm:inline-flex h-10 items-center px-4 rounded-lg border border-border text-sm hover:bg-muted"
          >
            موقع الصالون
          </Link>
          <Link
            to="/auth"
            className="inline-flex h-10 items-center px-5 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-bold"
          >
            دخول / تسجيل
          </Link>
        </div>
      </header>

      <section className="px-4 sm:px-8 py-16 sm:py-24 text-center max-w-3xl mx-auto">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
          نظام SaaS جاهز لآلاف المشاغل
        </span>
        <h1 className="mt-6 text-3xl sm:text-5xl font-extrabold leading-tight">
          أدِر مشغلك بالكامل من <span className="gradient-text">لوحة واحدة</span>
        </h1>
        <p className="mt-5 text-muted-foreground text-sm sm:text-base leading-relaxed">
          حجوزات، خدمات، موظفون، رواتب، مخزون، فواتير ضريبية، محافظ ونقاط ولاء — مع عزل كامل لبيانات
          كل مشغل وصلاحيات دقيقة لكل دور.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/auth"
            className="inline-flex h-12 items-center gap-2 px-7 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold"
          >
            ابدأ تجربة 30 يومًا
            <ArrowLeft className="size-4" />
          </Link>
          <Link
            to="/site"
            className="inline-flex h-12 items-center px-7 rounded-xl border border-border font-semibold hover:bg-muted"
          >
            استعراض موقع صالون
          </Link>
        </div>
      </section>

      <section className="px-4 sm:px-8 pb-20 max-w-5xl mx-auto grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <article key={f.title} className="rounded-2xl border border-border bg-card/70 p-5">
            <span className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <f.icon className="size-5" />
            </span>
            <h2 className="mt-4 font-bold">{f.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
          </article>
        ))}
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Salon Flow — جميع الحقوق محفوظة
      </footer>
    </main>
  );
}
