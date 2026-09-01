import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarCog,
  Sparkles,
  Globe,
  UserCircle,
  Receipt,
  Settings,
  Search,
  Bell,
  Scissors,
  Package,
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
  PanelRightClose,
  PanelRightOpen,
  BriefcaseBusiness,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLatenessWatcher } from "@/lib/lateness";
import { useAccount } from "@/hooks/use-account";
import { useSiteSettings } from "@/lib/site-settings";
import { canManage, signOutAccount, ROLE_LABEL, homeForRole, type AppRole } from "@/lib/account";
import { loadSalonDomain } from "@/lib/db/domain-repo";
import { listBranches, logBranchSwitch, type Branch } from "@/lib/db/ops-repo";
import { restoreActiveBranch, setActiveBranch, useActiveBranch } from "@/lib/active-branch";
import { searchBranches } from "@/lib/branch-scope";
import { PlanUpgradeNotice } from "@/components/platform/plan-gate";
import { lastSeenSignups, listSignupNotifications } from "@/lib/db/join-requests-repo";


/** Which roles may open each area. Anything not listed is open to any signed-in user. */
const ROUTE_ROLES: { prefix: string; roles: AppRole[] }[] = [
  { prefix: "/platform", roles: ["platform_owner"] },
  { prefix: "/platform-settings", roles: ["platform_owner"] },
  { prefix: "/platform-site", roles: ["platform_owner"] },
  { prefix: "/platform-subscriptions", roles: ["platform_owner"] },
  { prefix: "/platform-customers", roles: ["platform_owner"] },
  { prefix: "/platform-database", roles: ["platform_owner"] },
  { prefix: "/platform-activity", roles: ["platform_owner"] },
  { prefix: "/platform-analytics", roles: ["platform_owner"] },

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
  { prefix: "/branch-audit", roles: ["platform_owner", "salon_owner", "branch_manager"] },
  { prefix: "/hr", roles: ["platform_owner", "salon_owner", "branch_manager"] },
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
  { to: "/pos", label: "نقطة البيع", icon: ShoppingCart, manager: true, module: "pos", group: "daily" },
  { to: "/cash", label: "الصندوق والورديات", icon: Banknote, manager: true, module: "cash", group: "daily" },
  { to: "/customers", label: "العملاء", icon: UserCircle, manager: true, module: "customers", group: "daily" },

  // Financial management & accounting
  { to: "/invoices", label: "الفواتير", icon: Receipt, manager: true, module: "invoices", group: "finance" },
  { to: "/ledger", label: "السجل المالي", icon: NotebookPen, manager: true, module: "ledger", group: "finance" },
  { to: "/expenses", label: "المصروفات", icon: TrendingDown, manager: true, module: "expenses", group: "finance" },
  { to: "/accounting", label: "مركز المحاسبة", icon: Calculator, manager: true, module: "accounting", group: "finance" },
  { to: "/accounting/journal", label: "القيود اليومية", icon: NotebookPen, manager: true, module: "accounting", group: "finance" },
  { to: "/accounting/accounts", label: "دليل الحسابات", icon: BookOpen, manager: true, module: "accounting", group: "finance" },
  { to: "/accounting/trial-balance", label: "ميزان المراجعة", icon: Scale, manager: true, module: "accounting", group: "finance" },
  { to: "/accounting/financials", label: "القوائم المالية", icon: LineChart, manager: true, module: "accounting", group: "finance" },
  { to: "/accounting/vat", label: "الضرائب والإقرارات", icon: Percent, manager: true, module: "accounting", group: "finance" },
  { to: "/accounting/einvoice", label: "الفواتير الإلكترونية", icon: FileCode2, manager: true, module: "accounting", group: "finance" },
  { to: "/accounting/assets", label: "الأصول الثابتة", icon: Building, manager: true, module: "accounting", group: "finance" },
  { to: "/reports", label: "مركز التقارير", icon: BarChart3, manager: true, module: "reports", group: "finance" },

  // Salon management
  { to: "/services", label: "الخدمات", icon: Sparkles, manager: true, module: "services", group: "manage" },
  { to: "/hr", label: "الموارد البشرية", icon: BriefcaseBusiness, manager: true, module: "staff", group: "manage" },
  { to: "/inventory", label: "المخزون", icon: Package, manager: true, module: "inventory", group: "manage" },
  { to: "/stocktake", label: "جرد المستودع", icon: ClipboardCheck, manager: true, module: "inventory", group: "manage" },
  { to: "/stock-log", label: "حركات المخزون", icon: PackageSearch, manager: true, module: "inventory", group: "manage" },
  { to: "/coupons", label: "الكوبونات والعروض", icon: Ticket, manager: true, module: "coupons", group: "manage" },
  { to: "/branches", label: "الفروع", icon: Building2, manager: true, module: "branches", group: "manage" },

  // System & settings
  { to: "/booking-settings", label: "ضبط الحجز", icon: CalendarCog, manager: true, module: "booking_settings", group: "system" },
  { to: "/invoice-settings", label: "ضبط الفواتير", icon: Receipt, manager: true, module: "invoice_settings", group: "system" },

  { to: "/users", label: "المستخدمون والصلاحيات", icon: ShieldCheck, manager: true, module: "users", group: "system" },
  { to: "/store-settings", label: "إعدادات المتجر والتوثيق", icon: ShieldCheck, manager: true, group: "system" },
  { to: "/subscription", label: "الاشتراك والباقة", icon: Crown, manager: true, group: "system" },
  { to: "/activity-log", label: "سجل النشاط", icon: History, manager: true, module: "activity_log", group: "system" },
  { to: "/branch-audit", label: "سجل تدقيق الفروع", icon: Building2, manager: true, module: "branch_audit", group: "system" },
];



export function AppShell({
  children,
  title,
  subtitle,
  action,
  fullBleed = false,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Screen-filling pages (booking board / POS): compact header, no page scroll. */
  fullBleed?: boolean;
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
  /** Collapsed (icon-only) sidebar, remembered between visits. */
  const [railed, setRailed] = useState(false);
  useEffect(() => {
    setRailed(localStorage.getItem("sidebar-railed") === "1");
  }, []);
  const toggleRail = () =>
    setRailed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-railed", next ? "1" : "0");
      return next;
    });
  const manager = canManage(account?.role);
  const items = nav.filter((n) =>
    (n.platform ? account?.role === "platform_owner" : n.manager ? manager : true) &&
    allowedForPath(n.to, account?.role) &&
    (!n.module || account?.role === "platform_owner" || account?.enabledModules.includes(n.module)),
  );
  // Direct-URL protection: a page whose module is outside the plan shows an upgrade notice.
  const currentNav = [...nav]
    .sort((a, b) => b.to.length - a.to.length)
    .find((n) => pathname === n.to || pathname.startsWith(n.to + "/"));
  const lockedModule =
    currentNav?.module &&
    account &&
    account.role !== "platform_owner" &&
    !account.enabledModules.includes(currentNav.module)
      ? currentNav.module
      : null;
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  // New sign-ups (staff requests / client registrations) badge for the merchant.
  const signupsQuery = useQuery({
    queryKey: ["signup-notifications", account?.salonId],
    queryFn: () => listSignupNotifications(account!.salonId!),
    enabled: !!account?.salonId && manager,
    refetchInterval: 60_000,
  });
  const seenAt = lastSeenSignups();
  const unseenSignups = (signupsQuery.data ?? []).filter(
    (n) => !seenAt || n.created_at > seenAt,
  ).length;


  // Branch scope: everything branch-aware (services, invoices, POS…) follows it.
  const activeBranch = useActiveBranch();
  const branchesQuery = useQuery({
    queryKey: ["branches", account?.salonId],
    queryFn: () => listBranches(account!.salonId!),
    enabled: !!account?.salonId && manager,
  });
  const branches = branchesQuery.data ?? [];
  useEffect(() => {
    restoreActiveBranch(account?.salonId ?? null);
  }, [account?.salonId]);
  useEffect(() => {
    // Drop a stale selection (branch deleted or belongs to another salon).
    if (activeBranch && branches.length && !branches.some((b) => b.id === activeBranch)) {
      setActiveBranch(account?.salonId ?? null, null);
    }
  }, [activeBranch, branches, account?.salonId]);

  /** Switches the branch scope and records who did it in the audit trail. */
  function switchBranch(id: string | null) {
    const salonId = account?.salonId ?? null;
    const nameOf = (b: string | null) => (b ? branches.find((x) => x.id === b)?.name ?? null : null);
    const from = activeBranch;
    if (from === id) return;
    setActiveBranch(salonId, id);
    toast.success(id ? `تم التبديل إلى ${nameOf(id) ?? "الفرع"}` : "تم عرض كل الفروع");
    if (salonId && account?.userId) {
      void logBranchSwitch({
        salonId,
        userId: account.userId,
        userName: account.fullName ?? null,
        fromBranchId: from,
        fromBranchName: nameOf(from),
        toBranchId: id,
        toBranchName: nameOf(id),
      });
    }
  }

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await signOutAccount();
    // Merchants land back on their own public salon page after signing out.
    if (typeof window !== "undefined") window.location.assign(sitePath);
    else navigate({ to: "/auth", replace: true });
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

  const navLinks = (onNavigate?: () => void, rail = false) =>
    GROUPS.map((g) => {
      const groupItems = items.filter((n) => n.group === g.id);
      if (groupItems.length === 0) return null;
      const hasActive = groupItems.some((n) => isActive(n.to));
      const expanded = closedGroups[g.id] === undefined ? true : !closedGroups[g.id];
      const isOpen = rail ? true : expanded || hasActive;
      if (rail) {
        return (
          <div key={g.id} className="space-y-1 pt-2 first:pt-0">
            <div className="mx-auto h-px w-6 bg-border" />
            {groupItems.map((n) => {
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  data-tour={n.to}
                  onClick={onNavigate}
                  title={n.label}
                  aria-label={n.label}
                  className={cn(
                    "group relative flex items-center justify-center rounded-lg h-10 transition-all",
                    isActive(n.to)
                      ? "bg-gradient-to-l from-primary/20 to-accent/10 text-foreground border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="pointer-events-none absolute right-12 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-semibold text-background opacity-0 transition group-hover:opacity-100 z-40">
                    {n.label}
                  </span>
                </Link>
              );
            })}
          </div>
        );
      }
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
                data-tour={n.to}
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
    <div className={cn("flex", fullBleed ? "h-screen overflow-hidden" : "min-h-screen")} dir="rtl">
      {/* Sidebar */}
      <aside
        data-tour="sidebar"
        className={cn(
          "shrink-0 border-l border-border bg-sidebar/60 backdrop-blur-xl hidden md:flex flex-col transition-[width] duration-200",
          railed ? "w-16" : "w-64",
        )}
      >
        <div className={cn("h-16 flex items-center gap-3 border-b border-border", railed ? "px-2 justify-center" : "px-5")}>
          {site.logoUrl ? (
            <img
              src={site.logoUrl}
              alt={`شعار ${account?.salonName ?? "Salon Flow"}`}
              className={cn("h-16 w-auto object-contain bg-transparent shrink-0", railed ? "max-w-[40px]" : "max-w-[120px]")}
            />
          ) : (
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[var(--shadow-glow)]">
              <Scissors className="size-5 text-primary-foreground" />
            </div>
          )}
          {!railed && (
            <div className="min-w-0">
              <div className="font-bold text-base leading-none truncate">
                {account?.salonName ?? "Salon Flow"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {account ? ROLE_LABEL[account.role] : "إدارة المشاغل"}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggleRail}
          aria-label={railed ? "توسيع القائمة" : "طي القائمة"}
          title={railed ? "توسيع القائمة" : "طي القائمة"}
          className={cn(
            "mx-2 mt-2 h-9 rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 flex items-center gap-2 transition",
            railed ? "justify-center" : "justify-between px-3",
          )}
        >
          {railed ? <PanelRightOpen className="size-4" /> : <><span className="text-xs font-semibold">طي القائمة</span><PanelRightClose className="size-4" /></>}
        </button>
        <nav className={cn("flex-1 space-y-1 overflow-y-auto", railed ? "p-2" : "p-3")}>{navLinks(undefined, railed)}</nav>
        <div className={cn("border-t border-border space-y-1", railed ? "p-2" : "p-3")}>
          {manager && (account?.role === "platform_owner" || account?.enabledModules.includes("site_settings")) && (
            <Link
              to="/settings"
              data-tour="/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
            >
              <Settings className="size-4" />
              {!railed && <span>إعدادات الموقع</span>}
            </Link>
          )}
          <a
            href={sitePath}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
          >
            <Sparkles className="size-4" />
            {!railed && <span>الموقع العام</span>}
          </a>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-destructive hover:bg-sidebar-accent"
          >
            <LogOut className="size-4" />
            {!railed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className={cn("flex-1 flex flex-col min-w-0", fullBleed && "min-h-0 overflow-hidden")}>
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
            {manager && branches.length > 0 && (
              <BranchPicker
                branches={branches}
                activeBranch={activeBranch}
                onSelect={(id) => switchBranch(id)}
              />
            )}


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
            <Link
              to="/join-requests"
              aria-label={
                unseenSignups > 0 ? `التنبيهات — ${unseenSignups} تسجيل جديد` : "التنبيهات"
              }
              className="size-10 rounded-lg border border-border bg-muted/40 hover:bg-muted grid place-items-center relative"
            >
              <Bell className="size-4" />
              {unseenSignups > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-accent text-[10px] font-bold text-accent-foreground grid place-items-center">
                  {unseenSignups > 9 ? "9+" : unseenSignups}
                </span>
              )}
            </Link>
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

        <div
          className={cn(
            "flex items-start justify-between gap-4 flex-wrap",
            fullBleed ? "px-4 md:px-6 py-3" : "px-4 md:px-8 py-6",
          )}
        >
          <div data-tour="page-title">
            <h1 className={cn("font-bold tracking-tight", fullBleed ? "text-xl md:text-2xl" : "text-2xl md:text-3xl")}>{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>

        <main
          className={cn(
            "flex-1 min-w-0",
            fullBleed
              ? "px-3 md:px-6 pb-20 md:pb-4 min-h-0 flex flex-col"
              : "px-4 md:px-8 pb-24 md:pb-10",
          )}
        >
          {lockedModule ? <PlanUpgradeNotice module={lockedModule} /> : children}
        </main>

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

/** Header branch scope picker: quick search, address preview and paused state. */
function BranchPicker({
  branches,
  activeBranch,
  onSelect,
}: {
  branches: Branch[];
  activeBranch: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const current = branches.find((b) => b.id === activeBranch) ?? null;
  const results = searchBranches(branches, q);

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          setQ("");
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="اختيار الفرع"
        className="h-10 max-w-[220px] rounded-lg border border-border bg-muted/40 px-3 flex items-center gap-2 text-sm font-semibold hover:bg-muted/60 transition"
      >
        <Building2 className="size-4 text-primary shrink-0" />
        <span className="truncate">{current ? current.name : "كل الفروع"}</span>
        {current && !current.active && (
          <span className="text-[10px] px-1.5 rounded-full border border-border text-muted-foreground shrink-0">
            موقوف
          </span>
        )}
        <ChevronDown className="size-3.5 text-muted-foreground shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="listbox"
            aria-label="الفروع"
            className="absolute z-50 mt-2 left-0 w-[300px] max-w-[85vw] rounded-xl border border-border bg-card shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-border relative">
              <Search className="size-4 absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث باسم الفرع أو العنوان..."
                aria-label="بحث في الفروع"
                className="w-full h-9 rounded-lg bg-muted/40 border border-border pr-9 pl-3 text-sm outline-none focus:border-primary/50"
              />
            </div>
            <ul className="max-h-72 overflow-y-auto p-1.5 space-y-1">
              <li>
                <button
                  onClick={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-right rounded-lg px-3 py-2 text-sm font-semibold hover:bg-muted/60 transition",
                    !activeBranch && "bg-primary/10 text-primary",
                  )}
                >
                  كل الفروع
                  <span className="block text-[11px] font-normal text-muted-foreground">
                    عرض بيانات المشغل كاملة
                  </span>
                </button>
              </li>
              {results.map((b) => (
                <li key={b.id}>
                  <button
                    onClick={() => {
                      onSelect(b.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full text-right rounded-lg px-3 py-2 hover:bg-muted/60 transition",
                      activeBranch === b.id && "bg-primary/10 text-primary",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span className="truncate">{b.name}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 rounded-full border shrink-0",
                          b.active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {b.active ? "مفعّل" : "موقوف"}
                      </span>
                    </span>
                    <span className="block text-[11px] text-muted-foreground truncate">
                      {b.address || b.phone || "بدون عنوان مسجّل"}
                    </span>
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="px-3 py-4 text-xs text-muted-foreground text-center">
                  لا توجد فروع مطابقة للبحث
                </li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
