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
  Building2,
  BarChart3,
  History,
  Menu,
  X,
  ChevronDown,
  ClipboardCheck,
  Calculator,
  PackageSearch,
  BookOpen,
  Building,
  LineChart,
  ShieldCheck,
  NotebookPen,
  Scale,
  Percent,
  FileCode2,
  ExternalLink,
  Share2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLatenessWatcher } from "@/lib/lateness";
import { useAccount } from "@/hooks/use-account";
import { useSiteSettings } from "@/lib/site-settings";
import { canManage, signOutAccount, ROLE_LABEL, homeForRole, type AppRole } from "@/lib/account";
import { loadSalonDomain } from "@/lib/db/domain-repo";

/** Which roles may open each area. Anything not listed is open to any signed-in user. */
const ROUTE_ROLES: { prefix: string; roles: AppRole[] }[] = [
  { prefix: "/platform", roles: ["platform_owner"] },
  { prefix: "/dashboard", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/services", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/pos", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/cash", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/expenses", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/inventory", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/stocktake", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/stock-log", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/accounting", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/accounts", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/financials", roles: ["platform_owner", "salon_owner"] },
  { prefix: "/assets", roles: ["platform_owner", "salon_owner"] },
  { prefix: "/accounting/financials", roles: ["platform_owner", "salon_owner"] },
  { prefix: "/accounting/assets", roles: ["platform_owner", "salon_owner"] },
  { prefix: "/users", roles: ["platform_owner", "salon_owner"] },
  { prefix: "/branches", roles: ["platform_owner", "salon_owner"] },
  { prefix: "/reports", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/subscription", roles: ["platform_owner", "salon_owner"] },
  { prefix: "/activity-log", roles: ["platform_owner", "salon_owner"] },
  { prefix: "/staff", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/payroll", roles: ["platform_owner", "salon_owner"] },
  { prefix: "/attendance", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/customers", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/coupons", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/invoices", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/booking-settings", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/invoice-settings", roles: ["platform_owner", "salon_owner", "branch_manager"] },

  { prefix: "/settings", roles: ["platform_owner", "salon_owner"] },
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

type NavGroup = "main" | "daily" | "finance" | "manage" | "system";

/** Section headers for the sidebar, in display order. */
const GROUPS: { id: NavGroup; label: string }[] = [
  { id: "main", label: "الرئيسية" },
  { id: "daily", label: "العمليات اليومية" },
  { id: "finance", label: "الإدارة المالية والمحاسبة" },
  { id: "manage", label: "إدارة المشغل" },
  { id: "system", label: "النظام والإعدادات" },
];

const nav: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  manager: boolean;
  group: NavGroup;
  platform?: boolean;
  module?: string;
}[] = [
  { to: "/platform", label: "لوحة المنصة", icon: Crown, manager: true, platform: true, group: "main" },
  { to: "/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, manager: true, group: "main" },

  // Daily operations
  { to: "/bookings", label: "الحجوزات", icon: CalendarDays, manager: false, module: "bookings", group: "daily" },
  { to: "/calendar", label: "التقويم", icon: CalendarDays, manager: false, module: "calendar", group: "daily" },
  { to: "/pos", label: "نقطة البيع", icon: ShoppingCart, manager: true, group: "daily" },
  { to: "/cash", label: "الصندوق والورديات", icon: Banknote, manager: true, group: "daily" },
  { to: "/customers", label: "العملاء", icon: UserCircle, manager: true, module: "customers", group: "daily" },
  { to: "/attendance", label: "الحضور والانصراف", icon: Fingerprint, manager: true, module: "attendance", group: "daily" },

  // Financial management & accounting
  { to: "/invoices", label: "الفواتير", icon: Receipt, manager: true, module: "invoices", group: "finance" },
  { to: "/ledger", label: "السجل المالي", icon: NotebookPen, manager: true, group: "finance" },
  { to: "/expenses", label: "المصروفات", icon: TrendingDown, manager: true, group: "finance" },
  { to: "/accounting", label: "مركز المحاسبة", icon: Calculator, manager: true, group: "finance" },
  { to: "/accounting/journal", label: "القيود اليومية", icon: NotebookPen, manager: true, group: "finance" },
  { to: "/accounting/accounts", label: "دليل الحسابات", icon: BookOpen, manager: true, group: "finance" },
  { to: "/accounting/trial-balance", label: "ميزان المراجعة", icon: Scale, manager: true, group: "finance" },
  { to: "/accounting/financials", label: "القوائم المالية", icon: LineChart, manager: true, group: "finance" },
  { to: "/accounting/vat", label: "الضرائب والإقرارات", icon: Percent, manager: true, group: "finance" },
  { to: "/accounting/einvoice", label: "الفواتير الإلكترونية", icon: FileCode2, manager: true, group: "finance" },
  { to: "/accounting/assets", label: "الأصول الثابتة", icon: Building, manager: true, group: "finance" },
  { to: "/payroll", label: "الرواتب والعمولات", icon: Wallet, manager: true, module: "payroll", group: "finance" },
  { to: "/reports", label: "مركز التقارير", icon: BarChart3, manager: true, group: "finance" },

  // Salon management
  { to: "/services", label: "الخدمات", icon: Sparkles, manager: true, module: "services", group: "manage" },
  { to: "/staff", label: "الموظفون", icon: Users2, manager: true, module: "staff", group: "manage" },
  { to: "/inventory", label: "المخزون", icon: Package, manager: true, module: "inventory", group: "manage" },
  { to: "/stocktake", label: "جرد المستودع", icon: ClipboardCheck, manager: true, module: "inventory", group: "manage" },
  { to: "/stock-log", label: "حركات المخزون", icon: PackageSearch, manager: true, module: "inventory", group: "manage" },
  { to: "/coupons", label: "الكوبونات والعروض", icon: Ticket, manager: true, module: "coupons", group: "manage" },
  { to: "/branches", label: "الفروع", icon: Building2, manager: true, group: "manage" },

  // System & settings
  { to: "/booking-settings", label: "ضبط الحجز", icon: CalendarCog, manager: true, module: "booking_settings", group: "system" },
  { to: "/invoice-settings", label: "ضبط الفواتير", icon: Receipt, manager: true, group: "system" },

  { to: "/users", label: "المستخدمون والصلاحيات", icon: ShieldCheck, manager: true, group: "system" },
  { to: "/subscription", label: "الاشتراك والباقة", icon: Crown, manager: true, group: "system" },
  { to: "/activity-log", label: "سجل النشاط", icon: History, manager: true, group: "system" },
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
  const site = useSiteSettings();
  // Alerts the reception/admin when a booking's service time passed without starting.
  useLatenessWatcher({ enabled: !!account });
  const [menuOpen, setMenuOpen] = useState(false);
  const [sitePath, setSitePath] = useState("/site");

  const permitted = accountLoading || !account ? null : allowedForPath(pathname, account.role);

  // Roles that cannot open this area are sent back to their own home page.
  useEffect(() => {
    if (permitted === false && account) {
      navigate({ to: homeForRole(account.role), replace: true });
    }
  }, [permitted, account, navigate]);

  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const manager = canManage(account?.role);
  const items = nav.filter((n) =>
    (n.platform ? account?.role === "platform_owner" : n.manager ? manager : true) &&
    allowedForPath(n.to, account?.role) &&
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

  useEffect(() => {
    let active = true;
    if (!account?.salonId) {
      setSitePath("/site");
      return () => {
        active = false;
      };
    }
    void loadSalonDomain(account.salonId)
      .then((info) => {
        if (!active) return;
        setSitePath(info?.slug ? `/salon/${encodeURIComponent(info.slug)}` : "/site");
      })
      .catch(() => {
        if (active) setSitePath("/site");
      });
    return () => {
      active = false;
    };
  }, [account?.salonId]);

  const siteUrl = typeof window === "undefined" ? sitePath : new URL(sitePath, window.location.origin).toString();

  async function handleShareSite() {
    try {
      if (typeof navigator !== "undefined" && "share" in navigator && typeof navigator.share === "function") {
        await navigator.share({ title: account?.salonName ?? site.salonName, url: siteUrl });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(siteUrl);
        toast.success("تم نسخ رابط الموقع");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("تعذّرت مشاركة الرابط");
    }
  }

  const navLinks = (onNavigate?: () => void) =>
    GROUPS.map((g) => {
      const groupItems = items.filter((n) => n.group === g.id);
      if (groupItems.length === 0) return null;
      const hasActive = groupItems.some((n) => isActive(n.to));
      const expanded = closedGroups[g.id] === undefined ? true : !closedGroups[g.id];
      const isOpen = expanded || hasActive;
      return (
        <div key={g.id} className="space-y-1">
          <button
            type="button"
            onClick={() => setClosedGroups((prev) => ({ ...prev, [g.id]: !(prev[g.id] ?? false) }))}
            aria-expanded={isOpen}
            className="w-full flex items-center justify-between gap-2 px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 hover:text-foreground transition"
          >
            <span>{g.label}</span>
            <ChevronDown className={cn("size-3.5 transition-transform", isOpen ? "" : "-rotate-90")} />
          </button>
          {isOpen && groupItems.map((n) => {
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
          })}
        </div>
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
          {site.logoUrl ? (
            <img
              src={site.logoUrl}
              alt={`شعار ${account?.salonName ?? "Salon Flow"}`}
              className="h-16 w-auto max-w-[120px] object-contain bg-transparent shrink-0"
            />
          ) : (
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)]">
              <Scissors className="size-5 text-primary-foreground" />
            </div>
          )}
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
          <a
            href={sitePath}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          >
            <Sparkles className="size-4" />
            <span>الموقع العام</span>
          </a>
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
            <Button asChild variant="outline" size="sm" className="h-10 gap-2 bg-muted/40">
              <a href={sitePath} target="_blank" rel="noreferrer" aria-label="زيارة موقع المشغل">
                <ExternalLink className="size-4" />
                <span className="hidden lg:inline">زيارة الموقع</span>
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 bg-muted/40"
              onClick={() => void handleShareSite()}
              aria-label="مشاركة رابط الموقع"
              title={siteUrl}
            >
              <Share2 className="size-4" />
            </Button>
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
              {site.logoUrl ? (
                <img src={site.logoUrl} alt="" className="h-10 w-auto max-w-[110px] object-contain bg-transparent" />
              ) : (
                <div className="size-10 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-bold">
                  {initial}
                </div>
              )}

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
              <span className="flex items-center gap-2 min-w-0">
                {site.logoUrl && (
                  <img src={site.logoUrl} alt="" className="h-10 w-auto max-w-[100px] object-contain bg-transparent" />
                )}
                <span className="font-bold truncate">{account?.salonName ?? "Salon Flow"}</span>
              </span>

              <button onClick={() => setMenuOpen(false)} aria-label="إغلاق القائمة">
                <X className="size-5" />
              </button>
            </div>
            <nav className="space-y-1">{navLinks(() => setMenuOpen(false))}</nav>
            <div className="mt-3 border-t border-border pt-3 space-y-1">
              <a
                href={sitePath}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground"
              >
                <ExternalLink className="size-4" />
                <span>زيارة الموقع</span>
              </a>
              <button
                type="button"
                onClick={() => void handleShareSite()}
                className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground"
              >
                <Share2 className="size-4" />
                <span>مشاركة الرابط</span>
              </button>
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
