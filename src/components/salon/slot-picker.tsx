import { CheckCircle2, XCircle } from "lucide-react";
import type { Slot } from "@/lib/booking-settings";
import { cn } from "@/lib/utils";

const REASON_LABEL: Record<NonNullable<Slot["reason"]>, string> = {
  closed: "اليوم مغلق",
  past: "وقت مضى",
  lead: "قبل الحد الأدنى للحجز",
  outside_hours: "خارج ساعات الدوام",
  break: "وقت استراحة",
  overlap: "محجوز مسبقاً",
};

function reasonLabel(reason?: Slot["reason"]) {
  return reason ? REASON_LABEL[reason] : "غير متاح";
}

export function SlotPicker({
  slots,
  selectedTime,
  onSelect,
  className,
}: {
  slots: Slot[];
  selectedTime: string;
  onSelect: (time: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/15 px-2.5 py-1 text-success">
          <CheckCircle2 className="size-3.5" /> متاح
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/35 bg-destructive/10 px-2.5 py-1 text-destructive">
          <XCircle className="size-3.5" /> غير متاح
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 max-h-64 overflow-y-auto p-1">
        {slots.map((slot) => {
          const selected = selectedTime === slot.time && slot.available;
          return (
            <button
              key={slot.time}
              type="button"
              disabled={!slot.available}
              onClick={() => onSelect(slot.time)}
              className={cn(
                "h-11 rounded-lg border text-xs font-bold transition inline-flex items-center justify-center gap-1.5",
                selected && "border-success bg-success text-success-foreground shadow-[var(--shadow-glow)]",
                !selected && slot.available && "border-success/45 bg-success/15 text-success hover:border-success hover:bg-success/25",
                !slot.available && "border-destructive/30 bg-destructive/10 text-destructive/65 line-through cursor-not-allowed opacity-80",
              )}
              title={slot.available ? "متاح" : reasonLabel(slot.reason)}
            >
              {slot.available ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
              <span>{slot.time}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}