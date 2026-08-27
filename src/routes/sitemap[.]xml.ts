import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://novaa.live";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

/** Public merchant pages, mirroring the /salon/$slug loader (active, non-suspended stores). */
async function salonEntries(): Promise<SitemapEntry[]> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("salons")
      .select("slug, is_suspended, subscription_status")
      .eq("is_suspended", false)
      .limit(5000);
    if (error || !data) return [];
    return data
      .filter((s) => s.slug && s.subscription_status !== "canceled")
      .map((s) => ({
        path: `/salon/${encodeURIComponent(s.slug)}`,
        changefreq: "weekly" as const,
        priority: "0.7",
      }));
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/?lang=en", changefreq: "weekly", priority: "0.8" },
          { path: "/site", changefreq: "weekly", priority: "0.8" },
          { path: "/auth", changefreq: "monthly", priority: "0.5" },
          ...(await salonEntries()),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path.replace(/&/g, "&amp;")}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
