import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, HeartHandshake, Rocket, ShieldCheck, Target, Users2 } from "lucide-react";

import { InfoBlock, MarketingPage } from "@/components/platform/marketing-page";

const TITLE = "من نحن — NOVAA لإدارة المشاغل والصالونات";
const DESC =
  "تعرّف على فريق NOVAA ورسالتنا: بناء منصة عربية موثوقة لإدارة المشاغل والصالونات بحجوزات وفواتير ضريبية وتقارير دقيقة.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/about" }],
  }),
  component: AboutPage,
});

const values = [
  { icon: Target, title: "دقة بلا تعقيد", desc: "كل شاشة مبنية لتُنجز مهمة واحدة بسرعة، دون تدريب طويل." },
  { icon: ShieldCheck, title: "أمان أولًا", desc: "عزل بيانات كل متجر على مستوى قاعدة البيانات وصلاحيات مفصّلة." },
  { icon: HeartHandshake, title: "دعم قريب", desc: "فريق دعم عربي يتابع متجرك من التأسيس حتى التشغيل اليومي." },
  { icon: Rocket, title: "تطوير مستمر", desc: "تحديثات شهرية مبنية على ملاحظات الملاك ومشرفي الفروع." },
];

const stats = [
  { value: "٢٤+", label: "قسمًا تشغيليًا ومحاسبيًا" },
  { value: "١٠٠٪", label: "واجهة عربية من اليمين لليسار" },
  { value: "ZATCA", label: "فواتير إلكترونية متوافقة" },
  { value: "٢٤/٧", label: "توفر سحابي ونسخ احتياطي" },
];

function AboutPage() {
  return (
    <MarketingPage
      kicker="قصتنا"
      title="نبني تشغيل المشاغل بعقلية المحاسب وحِس المصمم"
      intro="NOVAA منصة سحابية سعودية تجمع الحجوزات ونقطة البيع والمخزون والرواتب والمحاسبة في نظام واحد، لتُدير مشغلك وفروعك بثقة ووضوح."
    >
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-card/60 p-4 text-center">
              <div className="text-2xl font-extrabold gradient-text">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <InfoBlock title="رسالتنا">
          <p>
            بدأت NOVAA من مشكلة واقعية: مشاغل تُدار بدفاتر ورقية ومجموعات واتساب، وتقارير لا تظهر إلا
            في نهاية الشهر. بنينا نظامًا يجعل كل حجز وكل ريال وكل ساعة عمل مرئية لحظيًا، ويحوّل
            التشغيل اليومي إلى قرارات مبنية على أرقام.
          </p>
          <p>
            هدفنا أن يستطيع مالك مشغل واحد — أو شبكة فروع — أن يفتح لوحة واحدة صباحًا فيعرف بالضبط:
            ماذا يحدث اليوم، من يعمل، ما المخزون الناقص، وما ربح الأمس.
          </p>
        </InfoBlock>

        <div className="grid gap-3 sm:grid-cols-2">
          {values.map((v) => (
            <article key={v.title} className="rounded-2xl border border-border bg-card/60 p-5">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <v.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-bold">{v.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
            </article>
          ))}
        </div>

        <InfoBlock title="كيف نعمل">
          <p>
            <Building2 className="mb-0.5 me-1 inline size-4 text-primary" />
            نبدأ بتأسيس متجرك: الفروع والخدمات والموظفون والأسعار والضريبة، ثم نُفعّل موقع الحجز
            الخاص بك.
          </p>
          <p>
            <Users2 className="mb-0.5 me-1 inline size-4 text-primary" />
            ندرّب فريقك على نقطة البيع والصندوق والحضور، ونضبط الصلاحيات لكل دور.
          </p>
          <p>
            ثم نتابع معك التقارير الشهرية: الأداء، الربحية، أفضل الخدمات، والموظفون الأعلى إنتاجية.
          </p>
        </InfoBlock>

        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-6 text-center">
          <h2 className="text-xl font-extrabold">جاهز تجرّب NOVAA على متجرك؟</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            أنشئ حساب مالك المشغل وابدأ بباقة تجريبية تشمل جميع الأقسام.
          </p>
          <Link
            to="/auth"
            className="mt-5 inline-flex h-11 items-center rounded-xl bg-gradient-to-l from-primary to-accent px-6 text-sm font-bold text-primary-foreground"
          >
            إنشاء حساب
          </Link>
        </div>
      </div>
    </MarketingPage>
  );
}
