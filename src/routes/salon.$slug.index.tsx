import { createFileRoute } from "@tanstack/react-router";

import { SalonSiteView } from "@/routes/site";

export const Route = createFileRoute("/salon/$slug/")({
  ssr: false,
  head: ({ params }) => {
    const slug = params.slug;
    const canonical = `https://novaa.live/salon/${encodeURIComponent(slug)}`;
    const title = `${slug} — حجز مواعيد الصالون`;
    const description =
      "صفحة المشغل الرسمية: الخدمات والأسعار وفريق العمل والتقييمات مع حجز إلكتروني فوري.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        { property: "og:locale", content: "ar_SA" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "index, follow, max-image-preview:large" },
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "الرئيسية", item: "https://novaa.live/" },
              { "@type": "ListItem", position: 2, name: slug, item: canonical },
            ],
          }),
        },
      ],
    };
  },
  component: SalonPage,
});

function SalonPage() {
  const { slug } = Route.useParams();
  return <SalonSiteView slug={slug} />;
}
