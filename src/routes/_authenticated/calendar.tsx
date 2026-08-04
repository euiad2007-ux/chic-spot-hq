import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import {
  useSalon, formatTime, formatSAR, STATUS_LABEL, STATUS_TONE, actions,
  serviceTotalMin, type Booking,
} from "@/lib/salon-store";
import {
  useBookingSettings, getDaySlots, checkBookingConflict, dayLabel,
  type Weekday,
} from "@/lib/booking-settings";
import { SlotPicker } from "@/components/salon/slot-picker";
import { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, X, CalendarClock, Coffee, Timer, Users } from "lucide-react";
import { cn, fmtLongDay } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "التقويم التفصيلي — لمسة" },
      { name: "description", content: "جدول المواعيد التفصيلي لكل أخصائية مع أوقات البدء والانتهاء والاستراحات ووقت التحضير وإمكانية ترحيل الحجز." },
      { property: "og:title", content: "التقويم التفصيلي" },
      { property: "og:description", content: "جدول المواعيد بالتفصيل مع ترحيل الحجوزات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CalendarPage,
});

const PX_PER_MIN = 1.6;

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}
function pad(n: number) { return String(n).padStart(2, "0"); }
function hhmm(min: number) { return `${pad(Math.floor(min / 60))}:${pad(Math.round(min % 60))}`; }
function dateKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function CalendarPage() {
  const { bookings, staff, customers, services } = useSalon((s) => s);
  const settings = useBookingSettings((s) => s);
  const [date, setDate] = useState(() => new Date());
  const [editing, setEditing] = useState<Booking | null>(null);

  const weekday = date.getDay() as Weekday;
  const sched = settings.workDays[weekday];
  const openMin = sched?.open ? toMin(sched.start) : 9 * 60;
  const closeMin = sched?.open ? toMin(sched.end) : 21 * 60;
  const totalMin = Math.max(60, closeMin - openMin);
  const railHeight = totalMin * PX_PER_MIN;

  const dayBookings = useMemo(() => bookings.filter((b) => {
    if (b.status === "cancelled") return false;
    return dateKey(new Date(b.startsAt)) === dateKey(date);
  }), [bookings, date]);

  const activeStaff = staff.filter((s) => s.active);
  const hours = useMemo(() => {
    const out: number[] = [];
    for (let m = Math.floor(openMin / 60) * 60; m <= closeMin; m += 60) out.push(m);
    return out;
  }, [openMin, closeMin]);

  const dayBreaks = settings.breaks.filter((b) => b.days.includes(weekday));
  const dayRevenue = dayBookings.reduce((s, b) => s + (b.price - b.discount), 0);
  const shift = (d: number) => setDate((cur) => new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + d));

  const posTop = (min: number) => (min - openMin) * PX_PER_MIN;

  return (
    <AppShell
      title="التقويم التفصيلي"
      subtitle={`${fmtLongDay(date)} • ${dayBookings.length} حجز • ${formatSAR(dayRevenue)}`}
      action={
        <div className="flex items-center gap-1 glass-card rounded-lg p-1">
          <button onClick={() => shift(-1)} className="size-9 rounded-md hover:bg-muted grid place-items-center"><ChevronRight className="size-4" /></button>
          <button onClick={() => setDate(new Date())} className="px-3 h-9 text-sm font-medium hover:bg-muted rounded-md">اليوم</button>
          <button onClick={() => shift(1)} className="size-9 rounded-md hover:bg-muted grid place-items-center"><ChevronLeft className="size-4" /></button>
        </div>
      }
    >
      {/* Legend + day info */}
      <div className="glass-card rounded-2xl p-3 mb-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/35 bg-primary/15 px-2.5 py-1 text-primary"><CalendarClock className="size-3.5" /> وقت الخدمة</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning/15 px-2.5 py-1 text-warning"><Timer className="size-3.5" /> تحضير / تنظيف</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-accent"><Timer className="size-3.5" /> وقت إضافي ({settings.bufferMin} د)</span>
        <span className="inline-flex items-center gap-1 rounded-full border border-muted-foreground/30 bg-muted px-2.5 py-1 text-muted-foreground"><Coffee className="size-3.5" /> استراحة</span>
        <span className="ms-auto inline-flex items-center gap-1 text-muted-foreground">
          <Users className="size-3.5" />
          {sched?.open ? `دوام ${dayLabel(weekday)}: ${sched.start} - ${sched.end}` : `${dayLabel(weekday)} — مغلق`}
        </span>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${90 + activeStaff.length * 190}px` }}>
            {/* Header */}
            <div className="grid border-b border-border bg-muted/30 sticky top-0 z-20" style={{ gridTemplateColumns: `90px repeat(${activeStaff.length}, minmax(190px, 1fr))` }}>
              <div className="p-3 text-xs font-medium text-muted-foreground">الوقت</div>
              {activeStaff.map((s) => {
                const cnt = dayBookings.filter((b) => b.staffId === s.id);
                const mins = cnt.reduce((a, b) => a + b.durationMin, 0);
                return (
                  <div key={s.id} className="p-3 border-r border-border">
                    <div className="text-sm font-bold truncate">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{cnt.length} حجز • {mins} د</div>
                  </div>
                );
              })}
            </div>

            {/* Timeline */}
            <div className="grid relative" style={{ gridTemplateColumns: `90px repeat(${activeStaff.length}, minmax(190px, 1fr))`, height: `${railHeight}px` }}>
              {/* hour rail */}
              <div className="relative border-l border-border bg-muted/10">
                {hours.map((m) => (
                  <div key={m} className="absolute right-0 left-0 -translate-y-1/2 text-[11px] font-mono text-muted-foreground px-2" style={{ top: `${posTop(m)}px` }}>
                    {hhmm(m)}
                  </div>
                ))}
              </div>

              {activeStaff.map((st) => {
                const col = dayBookings
                  .filter((b) => b.staffId === st.id)
                  .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
                return (
                  <div key={st.id} className="relative border-r border-border">
                    {/* hour lines */}
                    {hours.map((m) => (
                      <div key={m} className="absolute left-0 right-0 border-t border-border/60" style={{ top: `${posTop(m)}px` }} />
                    ))}
                    {/* breaks */}
                    {dayBreaks
                      .filter((br) => !br.staffId || br.staffId === st.id)
                      .map((br) => {
                        const s = toMin(br.start), e = toMin(br.end);
                        return (
                          <div
                            key={br.id}
                            className="absolute left-1 right-1 rounded-md border border-dashed border-muted-foreground/40 bg-[repeating-linear-gradient(45deg,hsl(var(--muted))_0px,hsl(var(--muted))_6px,transparent_6px,transparent_12px)] text-[10px] text-muted-foreground px-2 py-1 overflow-hidden"
                            style={{ top: `${posTop(s)}px`, height: `${(e - s) * PX_PER_MIN}px` }}
                          >
                            <span className="inline-flex items-center gap-1 font-bold"><Coffee className="size-3" /> {br.label}</span>
                            <div className="font-mono">{br.start} - {br.end}</div>
                          </div>
                        );
                      })}
                    {/* now line */}
                    {dateKey(new Date()) === dateKey(date) && (() => {
                      const now = new Date();
                      const nm = now.getHours() * 60 + now.getMinutes();
                      if (nm < openMin || nm > closeMin) return null;
                      return (
                        <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${posTop(nm)}px` }}>
                          <div className="h-[2px] bg-destructive" />
                        </div>
                      );
                    })()}

                    {/* bookings */}
                    {col.map((b) => {
                      const s = new Date(b.startsAt);
                      const startM = s.getHours() * 60 + s.getMinutes();
                      const svcs = b.serviceIds.map((id) => services.find((x) => x.id === id)).filter(Boolean);
                      const prep = svcs.reduce((a, x) => a + (x!.prepMin || 0), 0);
                      const cleanup = svcs.reduce((a, x) => a + (x!.cleanupMin || 0), 0);
                      const core = Math.max(5, b.durationMin - prep - cleanup);
                      const cust = customers.find((c) => c.id === b.customerId);
                      const endM = startM + b.durationMin;
                      return (
                        <div key={b.id} className="absolute left-1 right-1" style={{ top: `${posTop(startM)}px` }}>
                          {prep > 0 && (
                            <div className="rounded-t-md border border-warning/40 bg-warning/15 text-warning text-[9px] font-bold px-2 grid items-center overflow-hidden" style={{ height: `${prep * PX_PER_MIN}px`, minHeight: "14px" }}>
                              تحضير {prep}د
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditing(b)}
                            className={cn(
                              "w-full text-right border rounded-md px-2 py-1 overflow-hidden hover:shadow-[var(--shadow-glow)] transition block",
                              STATUS_TONE[b.status],
                            )}
                            style={{ height: `${core * PX_PER_MIN}px`, minHeight: "44px" }}
                            title="اضغط لترحيل الحجز"
                          >
                            <div className="text-[10px] font-mono opacity-80">{formatTime(b.startsAt)} ← {hhmm(endM)} • {b.durationMin}د</div>
                            <div className="text-xs font-bold truncate">{cust?.name ?? "—"}</div>
                            <div className="text-[10px] opacity-80 truncate">{svcs.map((x) => x!.name).join("، ")}</div>
                            <div className="text-[9px] opacity-70 mt-0.5 truncate">{b.code} • {STATUS_LABEL[b.status]} • {formatSAR(b.price - b.discount)}</div>
                          </button>
                          {cleanup > 0 && (
                            <div className="border border-warning/40 bg-warning/15 text-warning text-[9px] font-bold px-2 grid items-center overflow-hidden" style={{ height: `${cleanup * PX_PER_MIN}px`, minHeight: "14px" }}>
                              تنظيف {cleanup}د
                            </div>
                          )}
                          {settings.bufferMin > 0 && (
                            <div className="rounded-b-md border border-accent/40 bg-accent/15 text-accent text-[9px] font-bold px-2 grid items-center overflow-hidden" style={{ height: `${settings.bufferMin * PX_PER_MIN}px`, minHeight: "14px" }}>
                              وقت إضافي {settings.bufferMin}د
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {activeStaff.length === 0 && (
        <div className="text-center text-sm text-muted-foreground py-10">لا يوجد موظفون نشطون لعرض جدولهم</div>
      )}

      {editing && (
        <RescheduleDialog booking={editing} onClose={() => setEditing(null)} />
      )}
    </AppShell>
  );
}

function RescheduleDialog({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const { staff, services, customers } = useSalon((s) => s);
  const [staffId, setStaffId] = useState(booking.staffId);
  const [day, setDay] = useState(() => {
    const d = new Date(booking.startsAt);
    return dateKey(d);
  });
  const [time, setTime] = useState(() => formatTime(booking.startsAt).slice(0, 5));

  const svcs = booking.serviceIds.map((id) => services.find((x) => x.id === id)).filter(Boolean);
  const duration = booking.durationMin || svcs.reduce((a, x) => a + serviceTotalMin(x!), 0);
  const cust = customers.find((c) => c.id === booking.customerId);
  const eligible = staff.filter((s) => s.active);

  const slots = useMemo(() => getDaySlots({
    date: day,
    staffId,
    durationMin: duration,
    ignoreBookingId: booking.id,
    customerId: booking.customerId,
  }), [day, staffId, duration, booking.id, booking.customerId]);

  const apply = () => {
    const [h, m] = time.split(":").map(Number);
    const [yy, mm, dd] = day.split("-").map(Number);
    const startsAt = new Date(yy, mm - 1, dd, h, m || 0, 0, 0).toISOString();
    const conflict = checkBookingConflict({
      staffId, startsAt, durationMin: duration,
      ignoreBookingId: booking.id, customerId: booking.customerId,
    });
    if (conflict) { toast.error(conflict.message); return; }
    actions.updateBooking(booking.id, { startsAt, staffId });
    toast.success("تم ترحيل الحجز بنجاح");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center p-3" onClick={onClose}>
      <div className="glass-card rounded-2xl w-full max-w-lg p-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-base font-bold">ترحيل الحجز {booking.code}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {cust?.name} • {svcs.map((x) => x!.name).join("، ")} • {duration} دقيقة
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="text-xs font-semibold space-y-1">
            <span>التاريخ</span>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-card px-2 text-sm" />
          </label>
          <label className="text-xs font-semibold space-y-1">
            <span>الأخصائية</span>
            <select value={staffId} onChange={(e) => setStaffId(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-card px-2 text-sm">
              {eligible.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>

        <div className="text-xs font-semibold mb-2">الوقت الجديد</div>
        {slots.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-6">لا أوقات متاحة في هذا اليوم</div>
        ) : (
          <SlotPicker slots={slots} selectedTime={time} onSelect={setTime} />
        )}

        <div className="flex gap-2 mt-4">
          <button onClick={apply} className="flex-1 h-11 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm">
            تأكيد الترحيل ({time} ← {hhmm(toMin(time) + duration)})
          </button>
          <button onClick={onClose} className="h-11 px-4 rounded-lg border border-border font-bold text-sm">إلغاء</button>
        </div>
      </div>
    </div>
  );
}
