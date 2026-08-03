import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
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
  Wallet,
  Ticket,
  Crown,
  LogOut,
  ShoppingCart,
  Banknote,
  TrendingDown,
  Menu,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAccount } from "@/hooks/use-account";
import { canManage, signOutAccount, ROLE_LABEL, homeForRole, type AppRole } from "@/lib/account";

/** Which roles may open each area. Anything not listed is open to any signed-in user. */
const ROUTE_ROLES: { prefix: string; roles: AppRole[] }[] = [
  { prefix: "/platform", roles: ["platform_owner"] },
  { prefix: "/dashboard", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/services", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/pos", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/cash", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/expenses", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/inventory", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/branches", roles: ["platform_owner", "salon_owner"] },
  { prefix: "/reports", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/subscription", roles: ["platform_owner", "salon_owner"] },
  { prefix: "/activity-log", roles: ["platform_owner", "salon_owner"] },
  { prefix: "/staff", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/payroll", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/attendance", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/customers", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/coupons", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/invoices", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/booking-settings", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/settings", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/bookings", roles: ["platform_owner", "salon_owner", "branch_manager", "staff"] },
  { prefix: "/calendar", roles: ["platform_owner", "salon_owner", "branch_manager", "staff"] },
  { prefix: "/specialist", roles: ["platform_owner", "salon_owner", "branch_manager", "staff"] },
  { prefix: "/client", roles: ["client"] },
];

function allowedForPath(pathname: string, role: AppRole | undefined): boolean {
  const rule = ROUTE_ROLES.find((r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"));
  if (!rule) return true;
  return !!role && rule.roles.includes(role);
}

const nav: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  manager: boolean;
  platform?: boolean;
  module?: string;
}[] = [
  { to: "/platform", label: "لوحة المنصة", icon: Crown, manager: true, platform: true },
  { to: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, manager: true },
  { to: "/bookings", label: "الحجوزات", icon: CalendarDays, manager: false, module: "bookings" },
  { to: "/calendar", label: "التقويم", icon: CalendarDays, manager: false, module: "calendar" },
  { to: "/pos", label: "نقطة البيع", icon: ShoppingCart, manager: true },
  { to: "/cash", label: "الصندوق والورديات", icon: Banknote, manager: true },
  { to: "/expenses", label: "المصروفات", icon: TrendingDown, manager: true },
  { to: "/services", label: "الخدمات", icon: Sparkles, manager: true, module: "services" },
  { to: "/inventory", label: "المخزون", icon: Package, manager: true, module: "inventory" },
  { to: "/staff", label: "الموظفون", icon: Users2, manager: true, module: "staff" },
  { to: "/payroll", label: "الرواتب", icon: Wallet, manager: true, module: "payroll" },
  { to: "/attendance", label: "الحضور والانصراف", icon: Fingerprint, manager: true, module: "attendance" },
  { to: "/customers", label: "العملاء", icon: UserCircle, manager: true, module: "customers" },
  { to: "/coupons", label: "الكوبونات", icon: Ticket, manager: true, module: "coupons" },
  { to: "/invoices", label: "الفواتير", icon: Receipt, manager: true, module: "invoices" },
  { to: "/booking-settings", label: "ضبط الحجز", icon: CalendarCog, manager: true, module: "booking_settings" },
];

export function AppShell({
  children,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: account, isLoading: accountLoading } = useAccount();
  const [menuOpen, setMenuOpen] = useState(false);

  const permitted = accountLoading || !account ? null : allowedForPath(pathname, account.role);

  // Roles that cannot open this area are sent back to their own home page.
  useEffect(() => {
    if (permitted === false && account) {
      navigate({ to: homeForRole(account.role), replace: true });
    }
  }, [permitted, account, navigate]);

  const manager = canManage(account?.role);
  const items = nav.filter((n) =>
    (n.platform ? account?.role === "platform_owner" : n.manager ? manager : true) &&
    (!n.module || account?.role === "platform_owner" || account?.enabledModules.includes(n.module)),
  );
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await signOutAccount();
    navigate({ to: "/auth", replace: true });
  }

  const initial = (account?.salonName ?? account?.fullName ?? "S").trim().charAt(0) || "S";

  const navLinks = (onNavigate?: () => void) =>
    items.map((n) => {
      const Icon = n.icon;
      return (
        <Link
          key={n.to}
          to={n.to}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
            isActive(n.to)
              ? "bg-gradient-to-l from-primary/20 to-accent/10 text-foreground border border-primary/30 shadow-[var(--shadow-glow)]"
              : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
          )}
        >
          <Icon className="size-4" />
          <span>{n.label}</span>
        </Link>
      );
    });

  if (permitted === false) {
    return (
      <div className="min-h-screen grid place-items-center px-6 text-center" dir="rtl">
        <p className="text-sm text-muted-foreground">لا تملك صلاحية الوصول إلى هذه الصفحة…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-l border-border bg-sidebar/60 backdrop-blur-xl hidden md:flex flex-col">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-border">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Scissors className="size-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base leading-none truncate">
              {account?.salonName ?? "Salon Flow"}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {account ? ROLE_LABEL[account.role] : "إدارة المشاغل"}
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">{navLinks()}</nav>
        <div className="p-3 border-t border-border space-y-1">
          {manager && (account?.role === "platform_owner" || account?.enabledModules.includes("site_settings")) && (
            <Link
              to="/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            >
              <Settings className="size-4" />
              <span>إعدادات الموقع</span>
            </Link>
          )}
          <Link
            to="/site"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          >
            <Sparkles className="size-4" />
            <span>الموقع العام</span>
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-background/40 backdrop-blur-xl sticky top-0 z-30">
          <div className="h-full px-4 md:px-8 flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="القائمة"
              className="md:hidden size-10 rounded-lg border border-border bg-muted/40 grid place-items-center"
            >
              <Menu className="size-4" />
            </button>
            <div className="flex-1 max-w-md relative hidden sm:block">
              <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                placeholder="ابحث عن عميل، حجز، أو خدمة..."
                aria-label="بحث"
                className="w-full h-10 rounded-lg bg-muted/40 border border-border pr-10 pl-3 text-sm outline-none focus:border-primary/50 focus:bg-muted/60 transition"
              />
            </div>
            <div className="flex-1 sm:hidden" />
            <button
              aria-label="التنبيهات"
              className="size-10 rounded-lg border border-border bg-muted/40 hover:bg-muted grid place-items-center relative"
            >
              <Bell className="size-4" />
              <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-accent" />
            </button>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold leading-none">
                  {account?.fullName ?? "…"}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {account?.salonName ?? ""}
                </div>
              </div>
              <div className="size-10 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-bold">
                {initial}
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

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <button
            aria-label="إغلاق"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
          />
          <div className="relative ml-auto h-full w-72 bg-card border-l border-border p-3 overflow-y-auto">
            <div className="flex items-center justify-between px-2 py-3">
              <span className="font-bold">{account?.salonName ?? "Salon Flow"}</span>
              <button onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة">
                <X className="size-5" />
              </button>
            </div>
            <nav className="space-y-1">{navLinks(() => setMenuOpen(false))}</nav>
            <div className="mt-3 border-t border-border pt-3 space-y-1">
              {manager && (account?.role === "platform_owner" || account?.enabledModules.includes("site_settings")) && (
                <Link
                  to="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground"
                >
                  <Settings className="size-4" />
                  <span>إعدادات الموقع</span>
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-destructive"
              >
                <LogOut className="size-4" />
                <span>تسجيل الخروج</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/85 backdrop-blur-xl">
        <div className="grid grid-cols-4">
          {items.slice(0, 4).map((n) => {
            const Icon = n.icon;
            const active = isActive(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5")} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
