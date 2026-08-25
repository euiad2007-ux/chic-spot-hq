import { createFileRoute } from "@tanstack/react-router";

import { SalonSiteView } from "@/routes/site";

export const Route = createFileRoute("/salon/$slug")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "صفحة المشغل — Chic Spot" },
      {
        name: "description",
        content: "صفحة المشغل الرسمية: الخدمات والأسعار وفريق العمل والتقييمات مع حجز إلكتروني فوري.",
      },
      { property: "og:title", content: "احجزي موعدك بسهولة" },
      { property: "og:description", content: "خدمات تجميل وعناية، أخصائيات محترفات، وحجز إلكتروني مباشر." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalonPage,
});

function SalonPage() {
  const { slug } = Route.useParams();
  return <SalonSiteView slug={slug} />;
}
