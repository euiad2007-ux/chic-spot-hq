import { createFileRoute } from "@tanstack/react-router";
import { DatabaseZap, Fingerprint, KeyRound, Lock, ScrollText, Server } from "lucide-react";

import { InfoBlock, MarketingPage } from "@/components/platform/marketing-page";

const TITLE = "الأمان وحماية البيانات — NOVAA";
const DESC =
  "كيف نحمي بيانات متجرك: عزل على مستوى قاعدة البيانات، صلاحيات حسب الدور، تشفير الاتصال، سجل نشاط ونسخ احتياطي.";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/security" }],
  }),
  component: SecurityPage,
});

const pillars = [
  { icon: Lock, title: "اتصال مشفّر", desc: "كل الاتصالات عبر HTTPS مع شهادات حديثة، وكلمات المرور مُخزّنة مُشفّرة." },
  { icon: DatabaseZap, title: "عزل لكل متجر", desc: "سياسات على مستوى الصفوف تمنع أي متجر من قراءة بيانات متجر آخر." },
  { icon: Fingerprint, title: "صلاحيات حسب الدور", desc: "مالك، مدير فرع، أخصائية، كاشير — كل دور يرى ما يخصه فقط." },
  { icon: ScrollText, title: "سجل نشاط", desc: "تتبّع العمليات الحساسة: التعديلات، الإلغاءات، الخصومات وحركات الصندوق." },
  { icon: Server, title: "نسخ احتياطي", desc: "نسخ دورية للبيانات مع إمكانية الاستعادة عند الحاجة." },
  { icon: KeyRound, title: "دخول آمن", desc: "دعوات موظفين بروابط محدودة الصلاحية، وإعادة تعيين كلمة المرور بأمان." },
];

function SecurityPage() {
  return (
    <MarketingPage
      kicker="الثقة والأمان"
      title="بياناتك محفوظة ومعزولة ومراقَبة"
      intro="الأمان ليس ميزة إضافية في NOVAA بل أساس التصميم: كل طلب يُتحقق منه، وكل عملية حساسة تُسجّل، وكل متجر معزول تمامًا."
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <article key={p.title} className="rounded-2xl border border-border bg-card/60 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <p.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-bold">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
            </article>
          ))}
        </div>

        <InfoBlock title="بياناتك ملكك">
          <p>
            لا نستخدم بيانات متجرك أو عملائك لأي غرض غير تشغيل الخدمة لك. يمكنك تصدير عملائك وفواتيرك
            وتقاريرك في أي وقت، وطلب حذف الحساب نهائيًا.
          </p>
        </InfoBlock>

        <InfoBlock title="الإبلاغ عن ثغرة">
          <p>
            إذا لاحظت مشكلة أمنية، تواصل معنا مباشرة من قنوات التواصل في الصفحة الرئيسية مع وصف
            الخطوات. نتعامل مع هذه التقارير بأولوية عالية وسرية تامة.
          </p>
        </InfoBlock>
      </div>
    </MarketingPage>
  );
}
