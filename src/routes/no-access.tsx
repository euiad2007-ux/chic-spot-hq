import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/no-access")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لا تملك صلاحية على هذا النطاق — Salon Flow" },
      {
        name: "description",
        content: "هذا النطاق يخص مشغلًا آخر، ولا يمكن فتح لوحة التحكم عبره إلا لأعضاء المشغل المالك للنطاق.",
      },
      { property: "og:title", content: "لا تملك صلاحية على هذا النطاق" },
      { property: "og:description", content: "النطاق يخص مشغلًا آخر — سجّل الدخول من نطاق مشغلك." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NoAccessPage,
});

function NoAccessPage() {
  return (
    <main dir="rtl" className="min-h-screen grid place-items-center bg-background px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center space-y-4">
        <div className="mx-auto size-14 rounded-2xl bg-destructive/10 text-destructive grid place-items-center">
          <ShieldAlert className="size-7" />
        </div>
        <h1 className="text-xl font-black">لا تملك صلاحية على هذا النطاق</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          هذا النطاق مرتبط بمشغل آخر. حسابك لا ينتمي إلى هذا المشغل، لذلك لا يمكن فتح لوحة التحكم من
          هنا. استخدم نطاق مشغلك أو رابط المنصة الرئيسي.
        </p>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link
            to="/site"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-border text-sm hover:bg-muted"
          >
            موقع المشغل
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            <ArrowLeft className="size-4" /> تسجيل الدخول بحساب آخر
          </Link>
        </div>
      </div>
    </main>
  );
}
