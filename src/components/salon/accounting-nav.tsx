import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Building,
  Calculator,
  LayoutDashboard,
  LineChart,
  NotebookPen,
  Scale,
  FileCode2,
  FileMinus2,
  Lock,
} from "lucide-react";

/** Sub-navigation shared by every page inside the accounting section. */
const LINKS: { to: string; label: string; icon: typeof BookOpen; exact?: boolean }[] = [
  { to: "/accounting", label: "لوحة المحاسبة", icon: LayoutDashboard, exact: true },
  { to: "/accounting/accounts", label: "دليل الحسابات", icon: BookOpen },
  { to: "/accounting/journal", label: "القيود اليومية", icon: NotebookPen },
  { to: "/accounting/trial-balance", label: "ميزان المراجعة", icon: Scale },
  { to: "/accounting/financials", label: "القوائم المالية", icon: LineChart },
  { to: "/accounting/vat", label: "الضرائب والإقرارات", icon: Calculator },
  { to: "/accounting/einvoice", label: "الفواتير الإلكترونية", icon: FileCode2 },
  { to: "/accounting/credit-notes", label: "الملاحظات الدائنة", icon: FileMinus2 },
  { to: "/accounting/closing", label: "الإقفال السنوي", icon: Lock },
  { to: "/accounting/assets", label: "الأصول الثابتة", icon: Building },
];


export function AccountingNav() {
  return (
    <nav className="flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2">
      {LINKS.map((l) => {
        const Icon = l.icon;
        return (
          <Link
            key={l.to}
            to={l.to as never}
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
