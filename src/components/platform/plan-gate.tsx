import { Link } from "@tanstack/react-router";
import { Crown, Lock } from "lucide-react";

import { moduleLabel } from "@/components/platform/plans-showcase";
import { usePlatformSettings, PlatformContactCard } from "@/components/platform/platform-contact-card";
import { usePlanCaps } from "@/lib/plan-limits";

/** Shown instead of a page body when the salon's plan does not include the module. */
export function PlanUpgradeNotice({ module }: { module: string }) {
  const { plan } = usePlanCaps();
  const settings = usePlatformSettings();
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <section className="rounded-2xl border border-primary/40 bg-primary/5 p-6 text-center space-y-3">
        <span className="mx-auto size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Lock className="size-6" />
        </span>
        <h2 className="text-xl font-extrabold">هذه الميزة غير متاحة في باقتك</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          قسم «{moduleLabel(module)}» غير مشمول في {plan?.name ? `باقة «${plan.name}»` : "باقتك الحالية"} —
          الباقة لا تدعم هذه الميزة، يجب ترقية الاشتراك لتفعيلها.
        </p>
        <Link
          to="/subscription"
          className="inline-flex h-11 items-center gap-2 px-6 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm"
        >
          <Crown className="size-4" /> ترقية الاشتراك
        </Link>
      </section>
      {settings.data && <PlatformContactCard settings={settings.data} compact />}
    </div>
  );
}
