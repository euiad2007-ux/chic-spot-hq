import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

/** Links shared by the marketing header/footer across every public page. */
export const MARKETING_LINKS = [
  { to: "/about", label: "من نحن" },
  { to: "/faq", label: "الأسئلة الشائعة" },
  { to: "/security", label: "الأمان والبيانات" },
  { to: "/privacy", label: "سياسة الخصوصية" },
  { to: "/terms", label: "الشروط والأحكام" },
] as const;

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent">
            <Sparkles className="size-5 text-primary-foreground" />
          </span>
          <span className="text-lg font-extrabold gradient-text">NOVAA</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm md:flex">
          {MARKETING_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-muted-foreground transition-colors hover:text-primary"
              activeProps={{ className: "text-primary font-semibold" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          to="/auth"
          className="inline-flex h-10 items-center rounded-xl bg-gradient-to-l from-primary to-accent px-5 text-sm font-bold text-primary-foreground"
        >
          ابدأ الآن
        </Link>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-8 md:grid-cols-3">
        <div>
          <span className="text-lg font-extrabold gradient-text">NOVAA</span>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            منصة سعودية لإدارة المشاغل والصالونات: حجوزات، فواتير ضريبية، فروع، مخزون ورواتب —
            بواجهة عربية وبيانات معزولة لكل متجر.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold">المنصة</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            {MARKETING_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-primary">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold">الدخول</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/auth" className="hover:text-primary">
                دخول ملاك المشاغل
              </Link>
            </li>
            <li>
              <Link to="/store-login" className="hover:text-primary">
                دخول الموظفين والعملاء
              </Link>
            </li>
            <li>
              <Link to="/" hash="plans" className="hover:text-primary">
                باقات الاشتراك
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NOVAA — جميع الحقوق محفوظة
      </div>
    </footer>
  );
}

/** Shared shell for the informational marketing pages. */
export function MarketingPage({
  kicker,
  title,
  intro,
  children,
}: {
  kicker: string;
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main dir="rtl" className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      <section className="aurora overflow-hidden border-b border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-8 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
            {kicker}
          </span>
          <h1 className="rise-in mt-6 text-3xl font-extrabold sm:text-5xl">{title}</h1>
          {intro && (
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {intro}
            </p>
          )}
        </div>
      </section>
      <div className="mx-auto max-w-4xl px-4 py-14 sm:px-8">{children}</div>
      <MarketingFooter />
    </main>
  );
}

/** One content block inside a marketing page. */
export function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-6">
      <h2 className="text-lg font-extrabold">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
