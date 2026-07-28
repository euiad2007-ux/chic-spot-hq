import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { useSiteSettings } from "@/lib/site-settings";
import { Settings, Palette, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم — لمسة" },
      { name: "description", content: "لوحة تحكم بسيطة للبدء وتخصيص إعدادات الموقع." },
      { property: "og:title", content: "لوحة تحكم لمسة" },
      { property: "og:description", content: "ابدئي بتخصيص هوية صالونك من إعدادات الموقع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const s = useSiteSettings();

  return (
    <AppShell
      title="لوحة التحكم"
      subtitle={`أهلاً بكِ في ${s.salonName || "لمسة"}`}
      action={
        <Link
          to="/settings"
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold shadow-[var(--shadow-glow)]"
        >
          <Settings className="size-4" /> إعدادات الموقع
        </Link>
      }
    >
      <div className="glass-card rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
        <div className="absolute -top-16 -left-16 size-56 rounded-full blur-3xl bg-primary/20" />
        <div className="absolute -bottom-16 -right-16 size-56 rounded-full blur-3xl bg-accent/20" />
        <div className="relative">
          <div className="mx-auto size-16 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground shadow-[var(--shadow-glow)] mb-5">
            <Sparkles className="size-8" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">مرحباً بكِ في لوحة التحكم</h1>
          <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
            هذه بيئة نظيفة جاهزة للتخصيص. ابدئي بضبط هوية صالونك من صفحة إعدادات الموقع — الألوان، الخطوط، الشعار، والصور.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              to="/settings"
              className="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold shadow-[var(--shadow-glow)]"
            >
              <Palette className="size-4" /> فتح إعدادات الموقع
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
