import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/salon/app-shell";
import { AccountingNav } from "@/components/salon/accounting-nav";
import { useAccount } from "@/hooks/use-account";
import { JournalPanel } from "@/components/salon/journal-panel";
import { JournalForm } from "@/components/salon/journal-form";

export const Route = createFileRoute("/_authenticated/accounting/journal")({
  head: () => ({
    meta: [
      { title: "القيود اليومية والترحيل المحاسبي | Salon Flow" },
      {
        name: "description",
        content:
          "دفتر القيود اليومية للمشغل: ترحيل تلقائي للفواتير والمصروفات والرواتب والجرد، وتسجيل قيود يدوية مزدوجة متوازنة.",
      },
      { property: "og:title", content: "القيود اليومية — Salon Flow" },
      { property: "og:description", content: "ترحيل محاسبي تلقائي وقيود يدوية بنظام القيد المزدوج." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const [tab, setTab] = useState<"auto" | "manual">("auto");

  return (
    <AppShell title="القيود اليومية" subtitle="الترحيل التلقائي والقيود اليدوية بنظام القيد المزدوج">
      <div className="space-y-4">
        <AccountingNav />
        <nav className="flex flex-wrap gap-2">
          {(
            [
              { id: "auto", label: "الترحيل ودفتر القيود" },
              { id: "manual", label: "قيد يدوي" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? "h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
                  : "h-10 px-4 rounded-xl border border-border font-bold text-sm text-muted-foreground"
              }
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "auto" ? <JournalPanel salonId={salonId} /> : <JournalForm salonId={salonId} />}
      </div>
    </AppShell>
  );
}
