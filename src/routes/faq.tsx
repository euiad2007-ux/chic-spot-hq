import { createFileRoute, Link } from "@tanstack/react-router";

import { MarketingPage } from "@/components/platform/marketing-page";

const TITLE = "الأسئلة الشائعة — NOVAA";
const DESC =
  "أجوبة عن الاشتراك والفواتير الضريبية والفروع والموظفين وموقع الحجز في منصة NOVAA لإدارة المشاغل والصالونات.";

const FAQS = [
  {
    q: "هل أحتاج خبرة تقنية لتشغيل النظام؟",
    a: "لا. النظام عربي بالكامل ومرتب حسب المهام اليومية: الحجوزات، نقطة البيع، الصندوق، المخزون، الرواتب. التأسيس يستغرق دقائق ويمكن لفريقنا مساعدتك.",
  },
  {
    q: "هل الفواتير متوافقة مع الفاتورة الإلكترونية والضريبة؟",
    a: "نعم. الفواتير تدعم ضريبة القيمة المضافة وترقيمًا تسلسليًا ورمز QR ومتطلبات الفاتورة الإلكترونية (ZATCA)، وتُطبع حرارية أو A4.",
  },
  {
    q: "هل يمكنني إدارة أكثر من فرع؟",
    a: "نعم. لكل فرع موظفوه وخدماته وأسعاره وصندوقه وتقاريره، مع تقارير مجمّعة على مستوى المتجر ولوحة تدقيق للفروع.",
  },
  {
    q: "هل لكل مشغل موقع إلكتروني؟",
    a: "نعم، لكل متجر صفحة إلكترونية بهويته وألوانه ورابط خاص، مع حجز إلكتروني مباشر وإمكانية ربط دومين خاص.",
  },
  {
    q: "كيف تُحسب حدود الباقة؟",
    a: "كل باقة تحدد عدد الفروع والموظفين والخدمات والعملاء والفواتير الشهرية والأقسام المتاحة، وتُفعّل تلقائيًا عند الاشتراك أو الترقية.",
  },
  {
    q: "هل توجد فترة تجريبية؟",
    a: "نعم، كل متجر جديد يبدأ بباقة تجريبية تشمل جميع الأقسام قبل الاشتراك، دون الحاجة لبطاقة.",
  },
  {
    q: "من يملك بياناتي؟ وهل يمكنني تصديرها؟",
    a: "بياناتك ملكك. يمكنك تصدير العملاء والفواتير والتقارير بصيغ جاهزة في أي وقت، وطلب حذف الحساب نهائيًا.",
  },
  {
    q: "هل يستطيع الموظفون رؤية كل شيء؟",
    a: "لا. الصلاحيات مفصّلة حسب الدور: مالك، مدير فرع، أخصائية، كاشير — وكل دور يرى ما يحتاجه فقط.",
  },
];

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/faq" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          inLanguage: "ar",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  return (
    <MarketingPage
      kicker="الأسئلة الشائعة"
      title="كل ما تحتاج معرفته قبل البدء"
      intro="جمعنا أكثر الأسئلة التي يطرحها ملاك المشاغل قبل الاشتراك. لم تجد سؤالك؟ تواصل معنا وسنجيبك مباشرة."
    >
      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <details
            key={f.q}
            open={i === 0}
            className="group rounded-2xl border border-border bg-card/60 p-5 open:border-primary/30"
          >
            <summary className="cursor-pointer list-none font-bold marker:hidden">
              <span className="me-2 text-primary">{String(i + 1).padStart(2, "0")}</span>
              {f.q}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
      <div className="mt-8 text-center">
        <Link
          to="/about"
          className="inline-flex h-11 items-center rounded-xl border border-border px-6 text-sm font-semibold hover:bg-muted"
        >
          تعرّف على NOVAA
        </Link>
      </div>
    </MarketingPage>
  );
}
