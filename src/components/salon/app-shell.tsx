import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LayoutDashboard, Settings, Scissors, Users2, Users, Package, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteSettings } from "@/lib/site-settings";

const nav = [
  { to: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/services", label: "الخدمات", icon: Sparkles },
  { to: "/staff", label: "الموظفون", icon: Users2 },
  { to: "/customers", label: "العملاء", icon: Users },
  { to: "/inventory", label: "المخزن", icon: Package },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

export function AppShell({ children, title, subtitle, action }: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const s = useSiteSettings();

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-l border-border bg-sidebar/60 backdrop-blur-xl hidden md:flex flex-col">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-border">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)] overflow-hidden">
            {s.logoUrl ? (
              <img src={s.logoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <Scissors className="size-5 text-primary-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{s.salonName || "لمسة"}</div>
            <div className="text-[11px] text-muted-foreground truncate">{s.branchName || ""}</div>
          </div>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition",
                  active
                    ? "bg-gradient-to-l from-primary/25 to-accent/15 text-foreground border border-primary/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border bg-background/50 backdrop-blur-xl flex items-center justify-between gap-3 px-4 md:px-6 sticky top-0 z-30">
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold truncate">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          {action}
        </header>
        <main className="flex-1 p-4 md:p-6 pb-24 md:pb-6">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl">
          <div className="grid grid-cols-6">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
