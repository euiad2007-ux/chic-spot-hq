import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  Crown,
  LayoutDashboard,
  ReceiptText,
  Users2,
  Database,
  Settings,
  Globe,
  Home,
  LogOut,
  Loader2,
  Menu,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAccount } from "@/hooks/use-account";
import { homeForRole, signOutAccount } from "@/lib/account";

/** Owner-only areas. The platform owner has no branches, bookings or POS. */
export const OWNER_NAV: { to: string; label: string; icon: typeof Crown }[] = [
  { to: "/platform", label: "لوحة المالك", icon: LayoutDashboard },
  { to: "/platform-subscriptions", label: "إدارة الاشتراكات", icon: ReceiptText },
  { to: "/platform-customers", label: "عملاء المتاجر", icon: Users2 },
  { to: "/platform-database", label: "قواعد البيانات", icon: Database },
  { to: "/platform-settings", label: "إعدادات المنصة", icon: Settings },
  { to: "/platform-site", label: "هوية الموقع الرئيسي", icon: Globe },
];

/**
 * Layout for the platform-owner console. Deliberately different from the
 * merchant dashboard: a dark command bar with horizontal navigation and no
 * salon-specific chrome (branches, bookings, notifications…).
 */
export function OwnerShell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const { data: account, isLoading } = useAccount();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwner = account?.role === "platform_owner";

  useEffect(() => {
    if (!isLoading && account && !isOwner) {
      navigate({ to: homeForRole(account.role), replace: true });
    }
  }, [isLoading, account, isOwner, navigate]);

  async function handleSignOut() {
    await qc.cancelQueries();
    qc.clear();
    await signOutAccount();
    // Leaving the owner console always lands on the platform home page.
    if (typeof window !== "undefined") window.location.assign("/");
    else navigate({ to: "/", replace: true });
  }

  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <header className="bg-gradient-to-l from-primary via-primary to-accent text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="h-16 flex items-center gap-3">
            <span className="size-10 rounded-2xl bg-primary-foreground/15 grid place-items-center shrink-0">
              <Crown className="size-5" />
            </span>
            <div className="min-w-0">
              <div className="font-extrabold leading-none truncate">لوحة مالك المنصة</div>
              <div className="text-[11px] opacity-80 mt-1 truncate">
                {account?.fullName || account?.email || "—"}
              </div>
            </div>
            <div className="flex-1" />
            <Link
              to="/"
              className="hidden sm:inline-flex h-10 px-3 rounded-xl bg-primary-foreground/15 hover:bg-primary-foreground/25 items-center gap-2 text-sm font-semibold"
            >
              <Home className="size-4" /> الصفحة الرئيسية
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="h-10 px-3 rounded-xl bg-primary-foreground/15 hover:bg-primary-foreground/25 inline-flex items-center gap-2 text-sm font-semibold"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">خروج</span>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="القائمة"
              className="md:hidden size-10 rounded-xl bg-primary-foreground/15 grid place-items-center"
            >
              {menuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>

          <nav className="hidden md:flex gap-1 pb-2 overflow-x-auto">
            {OWNER_NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "h-10 px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold whitespace-nowrap transition",
                  isActive(n.to)
                    ? "bg-background text-foreground shadow"
                    : "text-primary-foreground/85 hover:bg-primary-foreground/15",
                )}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            ))}
          </nav>

          {menuOpen && (
            <nav className="md:hidden pb-3 space-y-1">
              {OWNER_NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold",
                    isActive(n.to)
                      ? "bg-background text-foreground"
                      : "text-primary-foreground/85 hover:bg-primary-foreground/15",
                  )}
                >
                  <n.icon className="size-4" />
                  {n.label}
                </Link>
              ))}
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-primary-foreground/85"
              >
                <Home className="size-4" /> الصفحة الرئيسية
              </Link>
            </nav>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 md:px-8 py-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {action}
        </div>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
