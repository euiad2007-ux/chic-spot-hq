import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import {
  useBookingSettings,
  bookingSettingsActions,
  WEEKDAYS,
  dayLabel,
  type Weekday,
  type BreakWindow,
} from "@/lib/booking-settings";
import { useSalon } from "@/lib/salon-store";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Trash2, Clock, Coffee, Timer, CalendarClock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/booking-settings")({
  head: () => ({
    meta: [
      { title: "ضبط الحجز — لمسة" },
      { name: "description", content: "أوقات الدوام، الاستراحات، والزمن الإضافي بين الحجوزات." },
      { property: "og:title", content: "ضبط الحجز" },
      { property: "og:description", content: "أوقات الدوام والاستراحات والفواصل بين الحجوزات." },
    ],
  }),
  component: BookingSettingsPage,
});

function BookingSettingsPage() {
  const settings = useBookingSettings((s) => s);
  const { staff } = useSalon((s) => s);
  const openDays = WEEKDAYS.filter((day) => settings.workDays[day].open).length;
  const invalidDays = WEEKDAYS.filter((day) => {
    const schedule = settings.workDays[day];
    return schedule.open && !isValidTimeRange(schedule.start, schedule.end);
  });

  return (
    <AppShell
      title="ضبط الحجز"
      subtitle="نظّم أوقات الدوام، الاستراحات، والزمن الإضافي بين المواعيد"
    >
      <div className="grid gap-3 md:grid-cols-3 mb-6">
        <SummaryStat label="أيام العمل" value={`${openDays} من 7`} icon={<CalendarClock className="size-5" />} tone="primary" />
        <SummaryStat label="الاستراحات" value={`${settings.breaks.length}`} icon={<Coffee className="size-5" />} tone="warning" />
        <SummaryStat label="الفاصل بعد الحجز" value={`${settings.bufferMin} دقيقة`} icon={<Timer className="size-5" />} tone="success" />
      </div>

      {invalidDays.length > 0 && (
        <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive flex items-start gap-2 text-sm">
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">توجد ساعات دوام غير صحيحة</div>
            <div className="text-xs mt-1 opacity-90">وقت نهاية الدوام يجب أن يكون بعد وقت البداية في: {invalidDays.map(dayLabel).join("، ")}</div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Rules */}
        <section className="glass-card rounded-2xl p-5 lg:col-span-1 space-y-5 h-fit">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-xl bg-primary/15 text-primary grid place-items-center border border-primary/30">
              <Timer className="size-4" />
            </div>
            <h2 className="font-bold">قواعد الحجز</h2>
          </div>

          <Numeric
            icon={<Clock className="size-3.5" />}
            label="الزمن الإضافي بعد كل حجز (تحضير/تنظيف)"
            suffix="دقيقة"
            value={settings.bufferMin}
            onChange={(v) => bookingSettingsActions.setBuffer(v)}
            hint="يمنع النظام حجز موظف مباشرة بعد حجز آخر"
          />
          <Numeric
            icon={<CalendarClock className="size-3.5" />}
            label="فاصل الفتحة الزمنية"
            suffix="دقيقة"
            value={settings.slotStepMin}
            onChange={(v) => bookingSettingsActions.setSlotStep(v)}
            hint="مقدار تقسيم اليوم إلى فتحات (مثلاً 15 أو 30)"
          />
          <Numeric
            icon={<Clock className="size-3.5" />}
            label="أقل وقت مسموح للحجز مسبقاً"
            suffix="دقيقة"
            value={settings.minLeadMin}
            onChange={(v) => bookingSettingsActions.setMinLead(v)}
            hint="0 يعني السماح بالحجز الفوري"
          />

          <button
            onClick={() => { bookingSettingsActions.reset(); toast.success("تمت الاستعادة"); }}
            className="w-full h-10 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-2"
          >
            <RotateCcw className="size-4" />
            استعادة الإعدادات الافتراضية
          </button>
        </section>

        {/* Work hours */}
        <section className="glass-card rounded-2xl p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-accent/15 text-accent grid place-items-center border border-accent/30">
                <CalendarClock className="size-4" />
              </div>
              <h2 className="font-bold">أوقات الدوام الأسبوعية</h2>
            </div>
            <div className="rounded-full bg-success/15 text-success border border-success/35 px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" /> {openDays} أيام مفتوحة
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {WEEKDAYS.map((d) => {
              const s = settings.workDays[d];
              const invalid = s.open && !isValidTimeRange(s.start, s.end);
              return (
                <div key={d} className={cn(
                  "rounded-xl border p-4 space-y-4 transition bg-card/70",
                  s.open ? "border-success/35" : "border-border bg-muted/15 opacity-75",
                  invalid && "border-destructive/50 bg-destructive/5 opacity-100",
                )}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-sm">{dayLabel(d)}</div>
                      <div className={cn(
                        "mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold",
                        s.open ? "border-success/40 bg-success/15 text-success" : "border-border bg-muted/30 text-muted-foreground",
                      )}>
                        {s.open ? <CheckCircle2 className="size-3" /> : <Clock className="size-3" />}
                        {s.open ? "مفتوح" : "مغلق"}
                      </div>
                    </div>
                    <label className="relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full border border-border bg-muted/50 p-1 transition has-[:checked]:border-success/50 has-[:checked]:bg-success/25">
                      <input
                        type="checkbox"
                        checked={s.open}
                        onChange={(e) => bookingSettingsActions.setDay(d, { open: e.target.checked })}
                        className="peer sr-only"
                        aria-label={`تبديل دوام ${dayLabel(d)}`}
                      />
                      <span className="size-5 rounded-full bg-muted-foreground/50 transition peer-checked:-translate-x-5 peer-checked:bg-success" />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">بداية الدوام</span>
                      <input
                        type="time"
                        disabled={!s.open}
                        value={s.start}
                        onChange={(e) => bookingSettingsActions.setDay(d, { start: e.target.value })}
                        className="w-full h-10 rounded-lg bg-muted/40 border border-border px-2 text-sm font-bold disabled:opacity-50"
                      />
                    </label>
                    <label className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-muted-foreground">نهاية الدوام</span>
                      <input
                        type="time"
                        disabled={!s.open}
                        value={s.end}
                        onChange={(e) => bookingSettingsActions.setDay(d, { end: e.target.value })}
                        className="w-full h-10 rounded-lg bg-muted/40 border border-border px-2 text-sm font-bold disabled:opacity-50"
                      />
                    </label>
                  </div>

                  {s.open ? (
                    <div className={cn("rounded-lg px-3 py-2 text-xs font-semibold", invalid ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                      {invalid ? "عدّل وقت النهاية" : `مدة الدوام ${formatDuration(s.start, s.end)}`}
                    </div>
                  ) : (
                    <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground">لا تظهر مواعيد لهذا اليوم</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Breaks */}
        <section className="glass-card rounded-2xl p-5 lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="size-9 rounded-xl bg-warning/15 text-warning grid place-items-center border border-warning/30">
                <Coffee className="size-4" />
              </div>
              <div>
                <h2 className="font-bold">أوقات الاستراحة</h2>
                <p className="text-xs text-muted-foreground mt-0.5">فترات لا يمكن الحجز خلالها (استراحة غداء، صلاة، صيانة…)</p>
              </div>
            </div>
            <AddBreakButton />
          </div>
          {settings.breaks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              لا توجد استراحات مضافة
            </div>
          ) : (
            <div className="grid gap-2">
              {settings.breaks.map((b) => (
                <BreakRow key={b.id} brk={b} staff={staff} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function SummaryStat({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "primary" | "success" | "warning" }) {
  const tones = {
    primary: "bg-primary/15 text-primary border-primary/30",
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
  } as const;
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
      <div className={cn("size-11 rounded-xl border grid place-items-center", tones[tone])}>{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground font-semibold">{label}</div>
        <div className="text-xl font-bold mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function timeMinutes(hhmm: string) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function isValidTimeRange(start: string, end: string) {
  return timeMinutes(end) > timeMinutes(start);
}

function formatDuration(start: string, end: string) {
  const total = Math.max(0, timeMinutes(end) - timeMinutes(start));
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return `${minutes} دقيقة`;
  if (minutes === 0) return `${hours} ساعة`;
  return `${hours} ساعة و${minutes} دقيقة`;
}

/* removed legacy weekly-hours list */

function LegacyRemoved() {
  return null;
}

/* eslint-disable @typescript-eslint/no-unused-vars */
function _OldWorkHoursSnippet() {
  return null;
}

/* eslint-enable @typescript-eslint/no-unused-vars */

function Numeric({ icon, label, suffix, value, onChange, hint }: {
  icon?: React.ReactNode;
  label: string;
  suffix?: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
        {icon} {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm font-semibold"
        />
        {suffix && <span className="text-xs text-muted-foreground shrink-0">{suffix}</span>}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function AddBreakButton() {
  return (
    <button
      onClick={() => {
        bookingSettingsActions.addBreak({
          label: "استراحة",
          days: [0, 1, 2, 3, 4, 6],
          start: "13:00",
          end: "14:00",
        });
        toast.success("تمت الإضافة");
      }}
      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
    >
      <Plus className="size-4" /> استراحة جديدة
    </button>
  );
}

function BreakRow({ brk, staff }: { brk: BreakWindow; staff: { id: string; name: string }[] }) {
  const [label, setLabel] = useState(brk.label);
  const invalid = timeMinutes(brk.end) <= timeMinutes(brk.start);
  return (
    <div className={cn("rounded-xl border bg-muted/20 p-3 grid gap-3 md:grid-cols-[1.2fr_auto_auto_1.2fr_auto] items-center", invalid ? "border-destructive/50" : "border-border")}>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => bookingSettingsActions.updateBreak(brk.id, { label: label || "استراحة" })}
        className="h-9 rounded-lg bg-background/60 border border-border px-2 text-sm font-semibold"
      />
      <input
        type="time"
        value={brk.start}
        onChange={(e) => bookingSettingsActions.updateBreak(brk.id, { start: e.target.value })}
        className="h-9 rounded-lg bg-background/60 border border-border px-2 text-sm"
      />
      <input
        type="time"
        value={brk.end}
        onChange={(e) => bookingSettingsActions.updateBreak(brk.id, { end: e.target.value })}
        className="h-9 rounded-lg bg-background/60 border border-border px-2 text-sm"
      />
      <div className="flex flex-wrap gap-1">
        {WEEKDAYS.map((d) => {
          const on = brk.days.includes(d);
          return (
            <button
              key={d}
              onClick={() => {
                const days = on ? brk.days.filter((x) => x !== d) : [...brk.days, d].sort() as Weekday[];
                bookingSettingsActions.updateBreak(brk.id, { days });
              }}
              className={cn(
                "px-2 h-7 rounded-md text-[10px] font-semibold border transition",
                on ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {dayLabel(d).slice(-3)}
            </button>
          );
        })}
        <select
          value={brk.staffId ?? ""}
          onChange={(e) => bookingSettingsActions.updateBreak(brk.id, { staffId: e.target.value || undefined })}
          className="h-7 rounded-md bg-background/60 border border-border px-2 text-[11px] mr-1"
        >
          <option value="">كل الموظفين</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {invalid && <span className="text-[10px] font-bold text-destructive px-2 py-1">وقت غير صحيح</span>}
      </div>
      <button
        onClick={() => { bookingSettingsActions.removeBreak(brk.id); toast.success("تم الحذف"); }}
        className="size-9 rounded-lg border border-border hover:border-destructive/50 hover:text-destructive grid place-items-center"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

/*
Legacy code below intentionally removed by replacement above.
*/

/*
*/

function Numeric({ icon, label, suffix, value, onChange, hint }: {
  icon?: React.ReactNode;
  label: string;
  suffix?: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
        {icon} {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm font-semibold"
        />
        {suffix && <span className="text-xs text-muted-foreground shrink-0">{suffix}</span>}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

function AddBreakButton() {
  return (
    <button
      onClick={() => {
        bookingSettingsActions.addBreak({
          label: "استراحة",
          days: [0, 1, 2, 3, 4, 6],
          start: "13:00",
          end: "14:00",
        });
        toast.success("تمت الإضافة");
      }}
      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
    >
      <Plus className="size-4" /> استراحة جديدة
    </button>
  );
}

function BreakRow({ brk, staff }: { brk: BreakWindow; staff: { id: string; name: string }[] }) {
  const [label, setLabel] = useState(brk.label);
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 grid gap-3 md:grid-cols-[1.2fr_auto_auto_1.2fr_auto] items-center">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={() => bookingSettingsActions.updateBreak(brk.id, { label: label || "استراحة" })}
        className="h-9 rounded-lg bg-background/60 border border-border px-2 text-sm font-semibold"
      />
      <input
        type="time"
        value={brk.start}
        onChange={(e) => bookingSettingsActions.updateBreak(brk.id, { start: e.target.value })}
        className="h-9 rounded-lg bg-background/60 border border-border px-2 text-sm"
      />
      <input
        type="time"
        value={brk.end}
        onChange={(e) => bookingSettingsActions.updateBreak(brk.id, { end: e.target.value })}
        className="h-9 rounded-lg bg-background/60 border border-border px-2 text-sm"
      />
      <div className="flex flex-wrap gap-1">
        {WEEKDAYS.map((d) => {
          const on = brk.days.includes(d);
          return (
            <button
              key={d}
              onClick={() => {
                const days = on ? brk.days.filter((x) => x !== d) : [...brk.days, d].sort() as Weekday[];
                bookingSettingsActions.updateBreak(brk.id, { days });
              }}
              className={cn(
                "px-2 h-7 rounded-md text-[10px] font-semibold border transition",
                on ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {dayLabel(d).slice(-3)}
            </button>
          );
        })}
        <select
          value={brk.staffId ?? ""}
          onChange={(e) => bookingSettingsActions.updateBreak(brk.id, { staffId: e.target.value || undefined })}
          className="h-7 rounded-md bg-background/60 border border-border px-2 text-[11px] mr-1"
        >
          <option value="">كل الموظفين</option>
          {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <button
        onClick={() => { bookingSettingsActions.removeBreak(brk.id); toast.success("تم الحذف"); }}
        className="size-9 rounded-lg border border-border hover:border-destructive/50 hover:text-destructive grid place-items-center"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
