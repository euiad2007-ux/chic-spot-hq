import { createFileRoute } from "@tanstack/react-router";

import { StoreLoginView } from "@/routes/store-login";

export const Route = createFileRoute("/salon/$slug/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "دخول المشغل — الموظفون والعميلات" },
      {
        name: "description",
        content: "صفحة الدخول الخاصة بهذا المشغل: دخول الموظفين إلى لوحة العمل ودخول العميلات لإدارة الحجوزات والمحفظة.",
      },
      { property: "og:title", content: "دخول المشغل" },
      { property: "og:description", content: "دخول خاص بموظفي وعميلات هذا المشغل فقط." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SalonLoginPage,
});

function SalonLoginPage() {
  const { slug } = Route.useParams();
  return <StoreLoginView slug={slug} />;
}
