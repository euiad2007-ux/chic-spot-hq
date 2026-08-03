import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Building,
  Calculator,
  LayoutDashboard,
  LineChart,
  NotebookPen,
  Scale,
} from "lucide-react";

/** Sub-navigation shared by every page inside the accounting section. */
const LINKS = [
  { to: "/accounting", label: "لوحة المحاسبة", icon: LayoutDashboard, exact: true },
  { to: "/accounting/accounts", label: "دليل الحسابات", icon: BookOpen },
  { to: "/accounting/journal", label: "القيود اليومية", icon: NotebookPen },
  { to: "/accounting/trial-balance", label: "ميزان المراجعة", icon: Scale },
  { to: "/accounting/financials", label: "القوائم المالية", icon: LineChart },
  { to: "/accounting/vat", label: "الضرائب والإقرارات", icon: Calculator },
  { to: "/accounting/assets", label: "الأصول الثابتة", icon: Building },
] as const;

export function AccountingNav() {
  return (
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2">
      {LINKS.map((l) => {
        const Icon = l.icon;
        return (
          <Link
            key={l.to}
            to={l.to}
            activeOptions={{ exact: l.exact ?? false }}
            className="h-10 px-3 rounded-xl border border-transparent text-sm font-bold text-muted-foreground inline-flex items-center gap-2 hover:bg-muted"
            activeProps={{
              className:
                "h-10 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold inline-flex items-center gap-2",
            }}
          >
            <Icon className="size-4" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
