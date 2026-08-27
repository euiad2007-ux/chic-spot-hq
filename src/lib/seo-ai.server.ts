/** Server-only helper: drafts SEO copy for the platform landing page with Lovable AI. */

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

export interface SeoDraftInput {
  brandName: string;
  lang: string;
  tagline?: string;
  headline?: string;
  subheadline?: string;
  features?: string[];
  services?: string[];
  extraHint?: string;
}

export interface SeoDraft {
  title: string;
  description: string;
  keywords: string[];
  ogTitle: string;
  ogDescription: string;
  features: { title: string; desc: string }[];
  includedItems: string[];
}

const SHAPE = `{
  "title": "string (<= 60 chars)",
  "description": "string (<= 155 chars)",
  "keywords": ["8-14 short search keywords"],
  "ogTitle": "string (<= 60 chars)",
  "ogDescription": "string (<= 150 chars)",
  "features": [{ "title": "string", "desc": "string (<= 90 chars)" }],
  "includedItems": ["5-8 short service/benefit lines"]
}`;

function firstJson(text: string): unknown {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("تعذّر قراءة اقتراحات الذكاء الاصطناعي");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function strList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);
}

export async function draftSeoContent(input: SeoDraftInput): Promise<SeoDraft> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("مساعد الذكاء الاصطناعي غير مهيأ حاليًا");

  const langLabel = input.lang === "en" ? "English" : "Arabic";
  const context = [
    `Brand: ${input.brandName}`,
    input.tagline ? `Tagline: ${input.tagline}` : "",
    input.headline ? `Headline: ${input.headline}` : "",
    input.subheadline ? `Subheadline: ${input.subheadline}` : "",
    input.features?.length ? `Current features: ${input.features.join(" | ")}` : "",
    input.services?.length ? `Current included items: ${input.services.join(" | ")}` : "",
    input.extraHint ? `Owner notes: ${input.extraHint}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const system = [
    "You are an SEO copywriter for a SaaS platform that manages beauty salons and spas",
    "(bookings, branches, staff, invoicing with VAT, inventory, payroll, loyalty wallets).",
    `Write every string in ${langLabel}, natural for real search behaviour in Gulf/Saudi markets.`,
    "Do not invent certifications, prices, awards, or customer numbers.",
    `Reply with JSON only, matching this shape exactly: ${SHAPE}`,
  ].join(" ");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: context },
      ],
    }),
  });

  if (res.status === 429) throw new Error("الطلبات كثيرة الآن، حاول بعد قليل");
  if (res.status === 402) throw new Error("انتهى رصيد الذكاء الاصطناعي، راجع الإعدادات");
  if (!res.ok) throw new Error("تعذّر توليد محتوى تحسين محركات البحث");

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = firstJson(data.choices?.[0]?.message?.content ?? "") as Record<string, unknown>;

  const features = Array.isArray(raw["features"])
    ? (raw["features"] as unknown[])
        .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
        .map((f) => ({
          title: typeof f["title"] === "string" ? f["title"].trim() : "",
          desc: typeof f["desc"] === "string" ? f["desc"].trim() : "",
        }))
        .filter((f) => f.title)
        .slice(0, 8)
    : [];

  const str = (k: string, max: number) =>
    typeof raw[k] === "string" ? (raw[k] as string).trim().slice(0, max) : "";

  return {
    title: str("title", 70),
    description: str("description", 180),
    keywords: strList(raw["keywords"], 16),
    ogTitle: str("ogTitle", 70) || str("title", 70),
    ogDescription: str("ogDescription", 180) || str("description", 180),
    features,
    includedItems: strList(raw["includedItems"], 10),
  };
}
