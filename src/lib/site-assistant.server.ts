/** Server-only helper: answers visitor questions from the salon's public data. */

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SalonPublicContext {
  salonName: string;
  tagline?: string;
  about?: string;
  phone?: string;
  waNumber?: string;
  email?: string;
  address?: string;
  hours?: string;
  mapsUrl?: string;
  instagram?: string;
  branches?: { name: string; address?: string; phone?: string }[];
  services?: { name: string; category?: string; price?: number; durationMin?: number }[];
  team?: { name: string; role?: string }[];
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

function contextBlock(ctx: SalonPublicContext): string {
  const money = (n?: number) => (typeof n === "number" ? `${n} ريال` : "غير محدد");
  const lines: string[] = [];
  lines.push(`اسم المشغل: ${ctx.salonName}`);
  if (ctx.tagline) lines.push(`الشعار التعريفي: ${ctx.tagline}`);
  if (ctx.about) lines.push(`نبذة: ${ctx.about}`);
  if (ctx.phone) lines.push(`الهاتف: ${ctx.phone}`);
  if (ctx.waNumber) lines.push(`واتساب: ${ctx.waNumber}`);
  if (ctx.email) lines.push(`البريد: ${ctx.email}`);
  if (ctx.address) lines.push(`العنوان: ${ctx.address}`);
  if (ctx.hours) lines.push(`أوقات العمل: ${ctx.hours}`);
  if (ctx.mapsUrl) lines.push(`الموقع على الخريطة: ${ctx.mapsUrl}`);
  if (ctx.instagram) lines.push(`إنستقرام: ${ctx.instagram}`);
  if (ctx.branches?.length) {
    lines.push("الفروع:");
    ctx.branches.forEach((b) =>
      lines.push(`- ${b.name}${b.address ? ` — ${b.address}` : ""}${b.phone ? ` — ${b.phone}` : ""}`),
    );
  }
  if (ctx.services?.length) {
    lines.push("الخدمات والأسعار:");
    ctx.services.forEach((s) =>
      lines.push(
        `- ${s.name}${s.category ? ` (${s.category})` : ""} — السعر: ${money(s.price)}${
          s.durationMin ? ` — المدة: ${s.durationMin} دقيقة` : ""
        }`,
      ),
    );
  }
  if (ctx.team?.length) {
    lines.push("فريق العمل وتخصصاتهم:");
    ctx.team.forEach((t) => lines.push(`- ${t.name}${t.role ? ` — ${t.role}` : ""}`));
  }
  return lines.join("\n");
}

export async function answerVisitorQuestion(
  messages: AssistantMessage[],
  ctx: SalonPublicContext,
): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("المساعد الذكي غير مهيأ حاليًا");

  const system = [
    `أنت مساعد ذكي ولطيف على الموقع الإلكتروني للمشغل «${ctx.salonName}».`,
    "أجب بالعربية بإيجاز (٣ أسطر أو أقل غالبًا) وبأسلوب ودود ومهني.",
    "استخدم بيانات المشغل التالية فقط. إذا لم تكن المعلومة موجودة، قل ذلك واقترح التواصل مع المشغل أو الحجز عبر الموقع.",
    "لا تخترع أسعارًا أو أوقاتًا أو أسماء غير مذكورة، ولا تعطِ وعودًا بالمواعيد المتاحة — اطلب من الزائرة إتمام الحجز من الموقع.",
    "",
    "بيانات المشغل العامة:",
    contextBlock(ctx),
  ].join("\n");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })),
      ],
    }),
  });

  if (res.status === 429) throw new Error("الطلبات كثيرة الآن، حاولي بعد قليل");
  if (res.status === 402) throw new Error("انتهى رصيد المساعد الذكي، راجعي الإدارة");
  if (!res.ok) throw new Error("تعذّر الحصول على الرد");

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() || "لم أفهم السؤال، هل يمكنك إعادة صياغته؟";
}
