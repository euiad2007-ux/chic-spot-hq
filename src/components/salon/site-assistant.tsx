import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, Loader2, Sparkles } from "lucide-react";

import { askSiteAssistant } from "@/lib/site-assistant.functions";
import type { SiteSettings } from "@/lib/site-settings";
import type { Service, Staff } from "@/lib/salon-store";

type Msg = { role: "user" | "assistant"; content: string };

/** Floating public-site assistant that answers from the salon's public data. */
export function SiteAssistant({
  site,
  services,
  staff,
}: {
  site: SiteSettings;
  services: Service[];
  staff: Staff[];
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      content: `مرحبًا بك في ${site.salonName} 👋 اسأليني عن الخدمات وأسعارها، أوقات العمل، الفريق، أو طريقة الحجز.`,
    },
  ]);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, open]);

  const suggestions = [
    "ما هي الخدمات وأسعارها؟",
    "ما أوقات العمل والعنوان؟",
    "من الأخصائيات المتوفرات؟",
  ];

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs(next);
    setInput("");
    setBusy(true);
    try {
      const { reply } = await askSiteAssistant({
        data: {
          messages: next.filter((m) => m.role === "user" || msgs.indexOf(m) > 0),
          context: {
            salonName: site.salonName,
            tagline: site.tagline || undefined,
            about: site.aboutText || site.heroSubtitle || undefined,
            phone: site.phone || undefined,
            waNumber: site.waNumber || undefined,
            email: site.email || undefined,
            address: site.address || undefined,
            hours: site.hours || undefined,
            mapsUrl: site.mapsUrl || undefined,
            instagram: site.instagram || undefined,
            services: services
              .filter((s) => s.active !== false)
              .slice(0, 120)
              .map((s) => ({
                name: s.name,
                category: s.category || undefined,
                price: s.price,
                durationMin: s.durationMin,
              })),
            team: staff
              .filter((s) => s.active !== false)
              .slice(0, 80)
              .map((s) => ({ name: s.name, role: s.role || undefined })),
          },
        },
      });
      setMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch (err) {
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: err instanceof Error ? err.message : "تعذّر الحصول على الرد الآن",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="المساعد الذكي"
          className="fixed bottom-24 left-5 z-50 h-14 px-4 rounded-full inline-flex items-center gap-2 text-white shadow-2xl transition hover:scale-105"
          style={{ background: `linear-gradient(90deg, ${site.primary}, ${site.accent})` }}
        >
          <Bot className="size-6" aria-hidden />
          <span className="text-sm font-bold">مساعد ذكي</span>
        </button>
      )}

      {open && (
        <div
          dir="rtl"
          className="fixed bottom-5 left-4 right-4 sm:right-auto sm:w-[380px] z-50 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col max-h-[76vh]"
        >
          <div
            className="flex items-center justify-between gap-2 px-4 py-3 text-white"
            style={{ background: `linear-gradient(90deg, ${site.primary}, ${site.accent})` }}
          >
            <span className="inline-flex items-center gap-2 text-sm font-bold">
              <Sparkles className="size-4" aria-hidden /> مساعد {site.salonName}
            </span>
            <button type="button" onClick={() => setOpen(false)} aria-label="إغلاق">
              <X className="size-5" />
            </button>
          </div>

          <div ref={boxRef} className="flex-1 overflow-y-auto p-3 space-y-3">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line " +
                  (m.role === "user"
                    ? "ml-auto bg-muted text-foreground"
                    : "mr-auto border border-border bg-background")
                }
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="mr-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" /> جاري الكتابة…
              </div>
            )}
          </div>

          {msgs.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="text-[11px] font-semibold rounded-full border border-border px-2.5 py-1 hover:bg-muted"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-border p-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتبي سؤالك…"
              className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="size-10 rounded-xl grid place-items-center text-white disabled:opacity-50"
              style={{ background: `linear-gradient(90deg, ${site.primary}, ${site.accent})` }}
              aria-label="إرسال"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
