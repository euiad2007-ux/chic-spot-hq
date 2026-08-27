import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gift,
  PartyPopper,
  ShoppingCart,
  Sparkles,
  Users2,
  Wallet,
  X,
} from "lucide-react";

const NEW_STORE_FLAG = "salonflow.newStore";

/** Marks the just-created store so the dashboard greets its owner once. */
export function markNewStore() {
  try {
    window.localStorage.setItem(NEW_STORE_FLAG, "1");
  } catch {
    /* storage may be unavailable in private mode */
  }
}

function clearNewStore() {
  try {
    window.localStorage.removeItem(NEW_STORE_FLAG);
  } catch {
    /* ignore */
  }
}

const BENEFITS: { icon: typeof CalendarDays; title: string; text: string }[] = [
  { icon: CalendarDays, title: "حجوزات وتقويم", text: "حجز ذكي بدون تداخل مواعيد مع أوقات دوام واستراحة" },
  { icon: ShoppingCart, title: "نقطة بيع وفواتير", text: "فواتير ضريبية بكود QR وطباعة حرارية أو A4" },
  { icon: Users2, title: "فريق وعملاء", text: "ملفات الموظفين والرواتب والعمولات ومحافظ العملاء" },
  { icon: Wallet, title: "محاسبة ومخزون", text: "قيود تلقائية، جرد المستودع، مصروفات وتقارير" },
  { icon: Sparkles, title: "موقع إلكتروني", text: "صفحة مشغلك برابط خاص وتصميم قابل للتخصيص" },
];

interface Step {
  selector?: string;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    title: "لوحة التحكم",
    text: "هنا تشاهد حجوزات اليوم، المبيعات، حالة الوردية وأداء الفريق لحظة بلحظة.",
    selector: '[data-tour="page-title"]',
  },
  {
    title: "قائمة الأقسام",
    text: "كل أقسام المشغل من هنا: الحجوزات، الخدمات، الفريق، المخزون، المحاسبة والتقارير.",
    selector: '[data-tour="sidebar"]',
  },
  {
    title: "حجز جديد",
    text: "أنشئ حجزًا في ثوانٍ: اختر العميلة، الخدمة، الموظفة والوقت المتاح.",
    selector: '[data-tour="/bookings"]',
  },
  {
    title: "الخدمات والأسعار",
    text: "أضف خدماتك ومدتها وسعرها والمواد المستهلكة لتعمل الحجوزات والفواتير تلقائيًا.",
    selector: '[data-tour="/services"]',
  },
  {
    title: "نقطة البيع",
    text: "أصدر الفواتير واستلم الدفع نقدًا أو شبكة أو من محفظة العميلة.",
    selector: '[data-tour="/pos"]',
  },
  {
    title: "إعدادات الموقع",
    text: "خصّص اسم مشغلك وشعاره وألوان موقعه العام ورابط الحجز الخاص به.",
    selector: '[data-tour="/settings"]',
  },
];

/** Congratulation dialog + guided dashboard tour, shown once for a new store. */
export function NewStoreWelcome({ salonName }: { salonName?: string | null }) {
  const [phase, setPhase] = useState<"hidden" | "welcome" | "tour">("hidden");
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(NEW_STORE_FLAG) === "1") setPhase("welcome");
    } catch {
      /* ignore */
    }
  }, []);

  function finish() {
    clearNewStore();
    setPhase("hidden");
  }

  if (phase === "hidden") return null;

  if (phase === "welcome") {
    return (
      <div
        dir="rtl"
        className="fixed inset-0 z-[100] grid place-items-center bg-background/70 backdrop-blur-sm px-4 py-6 overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div className="w-full max-w-lg rounded-3xl border border-primary/30 bg-card shadow-2xl overflow-hidden">
          <div className="relative bg-gradient-to-l from-primary/20 to-accent/15 px-6 pt-7 pb-6 text-center">
            <button
              type="button"
              onClick={finish}
              aria-label="إغلاق"
              className="absolute top-3 left-3 size-8 rounded-lg grid place-items-center text-muted-foreground hover:bg-muted/60"
            >
              <X className="size-4" />
            </button>
            <span className="mx-auto size-14 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center shadow-[var(--shadow-glow)]">
              <PartyPopper className="size-7 text-primary-foreground" />
            </span>
            <h2 className="mt-4 text-xl font-extrabold">مبروك! متجرك جاهز الآن 🎉</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {salonName ? `تم إنشاء «${salonName}» ` : "تم إنشاء مشغلك "}
              وتفعيل <span className="font-bold text-primary">الاشتراك المجاني</span> تلقائيًا بكل
              المزايا — بدون بطاقة بنكية.
            </p>
          </div>

          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs font-bold text-primary">
              <Gift className="size-4 shrink-0" />
              الخطة التجريبية مفعّلة: جميع الأقسام مفتوحة أمامك من اللحظة الأولى.
            </div>
            <ul className="space-y-2.5">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex items-start gap-3">
                  <span className="mt-0.5 size-8 shrink-0 rounded-xl bg-muted/60 grid place-items-center">
                    <b.icon className="size-4 text-primary" />
                  </span>
                  <span className="text-sm">
                    <span className="font-bold">{b.title}</span>
                    <span className="block text-xs text-muted-foreground">{b.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => {
                setStep(0);
                setPhase("tour");
              }}
              className="flex-1 h-11 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2"
            >
              <BadgeCheck className="size-4" /> ابدأ الجولة التعريفية
            </button>
            <button
              type="button"
              onClick={finish}
              className="flex-1 h-11 rounded-xl border border-input text-sm font-semibold hover:bg-muted/50"
            >
              تخطّي والبدء بالعمل
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <TourOverlay step={step} onStep={setStep} onClose={finish} />;
}

function TourOverlay({
  step,
  onStep,
  onClose,
}: {
  step: number;
  onStep: (n: number) => void;
  onClose: () => void;
}) {
  const current = STEPS[step]!;
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const target = current.selector
      ? document.querySelector<HTMLElement>(current.selector)
      : null;
    if (!target) {
      setRect(null);
      return;
    }
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    const measure = () => setRect(target.getBoundingClientRect());
    measure();
    const t = window.setTimeout(measure, 320);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [current.selector, step]);

  const cardStyle = useMemo<React.CSSProperties>(() => {
    if (!rect) return {};
    const below = rect.bottom + 16;
    const fitsBelow = below + 190 < window.innerHeight;
    return {
      position: "fixed",
      top: fitsBelow ? below : Math.max(16, rect.top - 200),
      right: 16,
      left: 16,
      maxWidth: 380,
      marginInline: "auto",
    };
  }, [rect]);

  const last = step === STEPS.length - 1;

  return (
    <div dir="rtl" className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px]" onClick={onClose} />
      {rect && (
        <div
          className="absolute rounded-xl border-2 border-primary pointer-events-none shadow-[0_0_0_9999px_hsl(var(--background)/0.7)]"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}
      <div
        className={
          "rounded-2xl border border-border bg-card p-5 shadow-2xl " +
          (rect ? "" : "absolute inset-x-4 top-1/2 -translate-y-1/2 mx-auto max-w-sm")
        }
        style={rect ? cardStyle : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-primary">
            خطوة {step + 1} من {STEPS.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="إنهاء الجولة"
            className="size-7 rounded-lg grid place-items-center text-muted-foreground hover:bg-muted/60"
          >
            <X className="size-4" />
          </button>
        </div>
        <h3 className="mt-2 text-base font-extrabold">{current.title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{current.text}</p>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => onStep(step - 1)}
            className="h-10 px-3 rounded-xl border border-input text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-40"
          >
            <ChevronRight className="size-4" /> السابق
          </button>
          <button
            type="button"
            onClick={() => (last ? onClose() : onStep(step + 1))}
            className="flex-1 h-10 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-1"
          >
            {last ? "إنهاء الجولة والبدء" : "التالي"}
            {!last && <ChevronLeft className="size-4" />}
          </button>
        </div>
        <div className="mt-3 flex justify-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s.title}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === step ? "w-5 bg-primary" : "w-1.5 bg-muted")
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
