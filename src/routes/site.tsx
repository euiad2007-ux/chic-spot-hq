import { createFileRoute, Link } from "@tanstack/react-router";
import { useSalon, formatSAR } from "@/lib/salon-store";
import { Scissors, Sparkles, Clock, MapPin, Phone, Star, LogIn, CalendarDays } from "lucide-react";
import { useMemo } from "react";

export const Route = createFileRoute("/site")({
  head: () => ({
    meta: [
      { title: "صالون لمسة — فرع الروضة" },
      { name: "description", content: "احجزي خدمات التجميل والعناية في صالون لمسة بسهولة عبر الإنترنت." },
      { property: "og:title", content: "صالون لمسة" },
      { property: "og:description", content: "خدمات تجميل راقية، حجز إلكتروني، وأخصائيات محترفات." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: SitePage,
});

function SitePage() {
  const { services, staff } = useSalon((s) => s);
  const categories = useMemo(() => {
    const m = new Map<string, typeof services>();
    services.filter((s) => s.active).forEach((s) => {
      const arr = m.get(s.category) ?? [];
      arr.push(s);
      m.set(s.category, arr);
    });
    return Array.from(m.entries());
  }, [services]);

  return (
    <div className="min-h-screen" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/site" className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center shadow-[var(--shadow-glow)]">
              <Scissors className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold text-base leading-none">صالون لمسة</div>
              <div className="text-[11px] text-muted-foreground mt-1">فرع الروضة — الرياض</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm hover:bg-muted">
              <LogIn className="size-4" /> تسجيل الدخول
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold shadow-[var(--shadow-glow)]">
              <CalendarDays className="size-4" /> احجزي الآن
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-20 -right-20 size-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-1.5 text-xs text-primary font-semibold">
            <Sparkles className="size-3.5" /> جمالك يبدأ من هنا
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-black tracking-tight">
            لمستك <span className="gradient-text">الخاصة</span>
            <br />
            بأيدي خبيرات
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-muted-foreground">
            احجزي خدمات الشعر والمكياج والعناية بالبشرة والأظافر في دقائق. أخصائيات معتمدات وأجواء راقية بانتظارك.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link to="/login" className="inline-flex items-center gap-2 h-12 px-7 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground font-semibold shadow-[var(--shadow-glow)]">
              احجزي موعد
            </Link>
            <a href="#services" className="inline-flex items-center gap-2 h-12 px-7 rounded-lg border border-border font-semibold hover:bg-muted">
              تصفحي الخدمات
            </a>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5"><Star className="size-4 text-warning fill-warning" /> 4.9 تقييم</div>
            <div className="flex items-center gap-1.5"><Sparkles className="size-4 text-accent" /> +2000 عميلة</div>
            <div className="flex items-center gap-1.5"><Clock className="size-4 text-primary" /> مفتوح 9ص - 11م</div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">خدماتنا</h2>
          <p className="text-muted-foreground mt-2">مجموعة كاملة من خدمات التجميل الفاخرة</p>
        </div>
        <div className="space-y-10">
          {categories.map(([cat, list]) => (
            <div key={cat}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-gradient-to-l from-primary to-accent" />
                {cat}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {list.map((s) => (
                  <div key={s.id} className="glass-card rounded-2xl p-5 group hover:border-primary/40 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-bold text-base">{s.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="size-3" /> {s.durationMin} دقيقة
                        </div>
                      </div>
                      <div className="text-lg font-bold gradient-text whitespace-nowrap">{formatSAR(s.price)}</div>
                    </div>
                    <Link to="/login" className="mt-4 w-full inline-flex items-center justify-center h-9 rounded-lg bg-muted/40 border border-border text-xs font-semibold hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition">
                      احجزي الآن
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">فريقنا</h2>
          <p className="text-muted-foreground mt-2">أخصائيات خبيرات لخدمتك</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {staff.filter((s) => s.active).map((s) => (
            <div key={s.id} className="glass-card rounded-2xl p-5 text-center">
              <div className="mx-auto size-20 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground text-2xl font-bold shadow-[var(--shadow-glow)]">
                {s.name.charAt(0)}
              </div>
              <div className="mt-3 font-bold">{s.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact / Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex items-start gap-3">
            <MapPin className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">العنوان</div>
              <div className="text-xs text-muted-foreground mt-1">حي الروضة، شارع الأمير سلطان، الرياض</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">للتواصل</div>
              <div className="text-xs text-muted-foreground mt-1">0501234567</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-sm">مواعيد العمل</div>
              <div className="text-xs text-muted-foreground mt-1">السبت - الخميس: 9ص - 11م</div>
            </div>
          </div>
        </div>
        <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
          © 2026 صالون لمسة — جميع الحقوق محفوظة
        </div>
      </footer>
    </div>
  );
}
