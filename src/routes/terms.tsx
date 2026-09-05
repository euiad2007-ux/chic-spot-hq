import { createFileRoute } from "@tanstack/react-router";

import { InfoBlock, MarketingPage } from "@/components/platform/marketing-page";

const TITLE = "الشروط والأحكام — NOVAA";
const DESC =
  "شروط استخدام منصة NOVAA: الاشتراك والباقات والفواتير والاستخدام المسموح ومسؤوليات الطرفين.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <MarketingPage
      kicker="سياساتنا"
      title="الشروط والأحكام"
      intro="اتفاقية واضحة بين متجرك ومنصة NOVAA: ما نلتزم به، وما نطلبه منك، وكيف تُدار الاشتراكات والفواتير."
    >
      <div className="space-y-4">
        <InfoBlock title="١. الحساب والاشتراك">
          <p>
            التسجيل في المنصة مخصص لملاك المشاغل والصالونات والمنشآت الخدمية. أنت مسؤول عن صحة بيانات
            منشأتك وعن حماية بيانات الدخول الخاصة بك وبفريقك.
          </p>
        </InfoBlock>
        <InfoBlock title="٢. الباقات والحدود">
          <p>
            تحدد كل باقة عدد الفروع والموظفين والخدمات والعملاء والفواتير الشهرية والأقسام المتاحة.
            عند تجاوز الحد يمكنك الترقية فورًا، وتُفعّل الحدود الجديدة تلقائيًا.
          </p>
        </InfoBlock>
        <InfoBlock title="٣. الدفع والتجديد">
          <p>
            الاشتراك شهري أو سنوي حسب الباقة المختارة، وتصدر فاتورة اشتراك لكل فترة. عند التأخر في
            السداد قد تُقيّد بعض الأقسام مؤقتًا مع الحفاظ على بياناتك.
          </p>
        </InfoBlock>
        <InfoBlock title="٤. الاستخدام المسموح">
          <p>
            يُمنع استخدام المنصة لأي نشاط مخالف للأنظمة، أو لإرسال رسائل غير مرغوبة، أو لمحاولة
            الوصول إلى بيانات متاجر أخرى، أو لإعادة بيع الخدمة دون اتفاق مكتوب.
          </p>
        </InfoBlock>
        <InfoBlock title="٥. الفواتير الضريبية">
          <p>
            توفّر المنصة أدوات إصدار فواتير متوافقة مع ضريبة القيمة المضافة والفاتورة الإلكترونية،
            وتبقى صحة بيانات المنشأة والرقم الضريبي والالتزام النظامي مسؤولية المتجر.
          </p>
        </InfoBlock>
        <InfoBlock title="٦. التوفر والدعم">
          <p>
            نعمل على توفر الخدمة على مدار الساعة مع نسخ احتياطي دوري، وقد تحدث فترات صيانة معلنة
            مسبقًا. الدعم متاح عبر قنوات التواصل المعتمدة داخل لوحة التحكم.
          </p>
        </InfoBlock>
        <InfoBlock title="٧. الإلغاء">
          <p>
            يمكنك إلغاء الاشتراك في أي وقت؛ تستمر الخدمة حتى نهاية الفترة المدفوعة، ويمكنك تصدير
            بياناتك قبل الإغلاق.
          </p>
        </InfoBlock>
      </div>
    </MarketingPage>
  );
}
