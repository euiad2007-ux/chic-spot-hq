import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCog,
  Sparkles,
  Users2,
  UserCircle,
  Receipt,
  Settings,
  Search,
  Bell,
  Scissors,
  Package,
  Fingerprint,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "لوحة التحكم", icon: LayoutDashboard },
  { to: "/bookings", label: "الحجوزات", icon: CalendarDays },
  { to: "/calendar", label: "التقويم", icon: CalendarDays },
  { to: "/services", label: "الخدمات", icon: Sparkles },
  { to: "/inventory", label: "المخزون", icon: Package },
  { to: "/staff", label: "الموظفون", icon: Users2 },
  { to: "/attendance", label: "الحضور والانصراف", icon: Fingerprint },
  { to: "/customers", label: "العملاء", icon: UserCircle },
  { to: "/invoices", label: "الفواتير", icon: Receipt },
  { to: "/booking-settings", label: "ضبط الحجز", icon: CalendarCog },
] as const;

export function AppShell({ children, title, subtitle, action }: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-l border-border bg-sidebar/60 backdrop-blur-xl hidden md:flex flex-col">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-border">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Scissors className="size-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold text-base leading-none">لمسة</div>
            <div className="text-[11px] text-muted-foreground mt-1">إدارة المشاغل</div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-gradient-to-l from-primary/20 to-accent/10 text-foreground border border-primary/30 shadow-[var(--shadow-glow)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="size-4" />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <Link to="/settings" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent">
            <Settings className="size-4" />
            <span>إعدادات الموقع</span>
          </Link>
          <Link to="/site" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent">
            <Sparkles className="size-4" />
            <span>الموقع العام</span>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background/40 backdrop-blur-xl sticky top-0 z-30">
          <div className="h-full px-4 md:px-8 flex items-center gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                placeholder="ابحث عن عميل، حجز، أو خدمة..."
                className="w-full h-10 rounded-lg bg-muted/40 border border-border pr-10 pl-3 text-sm outline-none focus:border-primary/50 focus:bg-muted/60 transition"
              />
            </div>
            <button className="size-10 rounded-lg border border-border bg-muted/40 hover:bg-muted grid place-items-center relative">
              <Bell className="size-4" />
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-accent" />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold leading-none">صالون لمسة</div>
                <div className="text-[11px] text-muted-foreground mt-1">فرع الروضة</div>
              </div>
              <div className="size-10 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-bold">
                ل
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 md:px-8 py-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>

        <main className="px-4 md:px-8 pb-24 md:pb-10 flex-1 min-w-0">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl">
        <div className="grid grid-cols-5">
          {nav.slice(0, 5).map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)]")} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
