import { createFileRoute } from "@tanstack/react-router";

import { InfoBlock, MarketingPage } from "@/components/platform/marketing-page";

const TITLE = "سياسة الخصوصية — NOVAA";
const DESC =
  "كيف تجمع منصة NOVAA البيانات وتستخدمها وتحميها، وحقوقك في الوصول إلى بياناتك وتصديرها وحذفها.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <MarketingPage
      kicker="سياساتنا"
      title="سياسة الخصوصية"
      intro="نوضح بشكل صريح ما نجمعه من بيانات، ولماذا، ومن يستطيع الوصول إليه، وكيف تتحكم أنت في بيانات متجرك وعملائك."
    >
      <div className="space-y-4">
        <InfoBlock title="١. البيانات التي نجمعها">
          <p>
            بيانات الحساب (الاسم، البريد، رقم الجوال)، وبيانات المتجر (الفروع، الخدمات، الأسعار،
            الموظفون)، وبيانات التشغيل (الحجوزات، الفواتير، المخزون، الرواتب)، وبيانات فنية محدودة
            مثل نوع الجهاز والمتصفح وصفحات الزيارة لتحسين الخدمة.
          </p>
        </InfoBlock>
        <InfoBlock title="٢. لماذا نستخدمها">
          <p>
            لتشغيل الخدمة التي طلبتها: إتمام الحجوزات، إصدار الفواتير، احتساب الرواتب والعمولات،
            إظهار التقارير، وإرسال التنبيهات والتذكيرات. لا نبيع بياناتك ولا نستخدمها للإعلانات.
          </p>
        </InfoBlock>
        <InfoBlock title="٣. عزل البيانات والوصول">
          <p>
            بيانات كل متجر معزولة على مستوى قاعدة البيانات بصلاحيات صارمة، ولا يرى المستخدم إلا ما
            يسمح به دوره. وصول فريق الدعم يكون بطلب منك ولغرض حل مشكلة محددة.
          </p>
        </InfoBlock>
        <InfoBlock title="٤. الاحتفاظ بالبيانات">
          <p>
            نحتفظ بالبيانات طوال مدة اشتراكك، وبالسجلات المالية للمدة التي تفرضها الأنظمة المحاسبية
            والضريبية. عند إلغاء الحساب يمكنك تصدير بياناتك قبل الحذف.
          </p>
        </InfoBlock>
        <InfoBlock title="٥. حقوقك">
          <p>
            لك الحق في الوصول إلى بياناتك وتصحيحها وتصديرها وطلب حذفها، وفي معرفة من وصل إليها عبر
            سجل النشاط. لطلب أي من ذلك تواصل معنا من صفحة التواصل في الصفحة الرئيسية.
          </p>
        </InfoBlock>
        <InfoBlock title="٦. ملفات الارتباط">
          <p>
            نستخدم ملفات ارتباط أساسية لحفظ الجلسة وتذكّر تفضيلاتك، وقياسات استخدام مجمّعة لتحسين
            الأداء — دون تتبّع إعلاني.
          </p>
        </InfoBlock>
        <InfoBlock title="٧. تحديث السياسة">
          <p>
            قد نحدّث هذه السياسة عند إضافة ميزات جديدة، وسنعلن أي تغيير جوهري داخل لوحة التحكم قبل
            تطبيقه.
          </p>
        </InfoBlock>
      </div>
    </MarketingPage>
  );
}
