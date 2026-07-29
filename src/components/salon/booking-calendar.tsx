import { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatTime, formatSAR, STATUS_LABEL, STATUS_TONE,
  type Booking, type Service, type Staff, type Customer,
} from "@/lib/salon-store";
import { getBookingSettings } from "@/lib/booking-settings";

export type CalendarVariant = "staff" | "client";

interface Props {
  bookings: Booking[];
  services: Service[];
  staff: Staff[];
  customers: Customer[];
  variant: CalendarVariant;
  /** When variant="staff", used to compute totals per day */
  meId?: string;
}

const WEEKDAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const MONTHS_AR = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfWeek(d: Date) {
  const day = d.getDay(); // 0=Sunday
  const nd = new Date(d);
  nd.setDate(d.getDate() - day);
  nd.setHours(0, 0, 0, 0);
  return nd;
}
function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function BookingCalendar({ bookings, services, staff, customers, variant }: Props) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => new Date());
  const settings = getBookingSettings();

  // Determine visible time window (union across the week)
  const [openMin, closeMin] = useMemo(() => {
    let mn = 8 * 60, mx = 22 * 60;
    const opens: number[] = [];
    const closes: number[] = [];
    Object.values(settings.workDays).forEach((d) => {
      if (d.open) { opens.push(toMin(d.start)); closes.push(toMin(d.end)); }
    });
    if (opens.length) { mn = Math.min(...opens); mx = Math.max(...closes); }
    // widen to nearest hour
    mn = Math.floor(mn / 60) * 60;
    mx = Math.ceil(mx / 60) * 60;
    return [mn, mx];
  }, [settings]);

  const week = useMemo(() => {
    const s = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(s);
      d.setDate(s.getDate() + i);
      return d;
    });
  }, [anchor]);

  const byDay = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      const k = dateKey(new Date(b.startsAt));
      (map[k] ??= []).push(b);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }
    return map;
  }, [bookings]);

  const selKey = dateKey(selected);
  const dayBookings = byDay[selKey] ?? [];
  const hours = useMemo(() => {
    const out: number[] = [];
    for (let m = openMin; m <= closeMin; m += 60) out.push(m / 60);
    return out;
  }, [openMin, closeMin]);

  const totalMin = closeMin - openMin;
  const dayRevenue = dayBookings.reduce((s, b) => s + (b.price - b.discount), 0);

  const shiftWeek = (dir: number) => {
    const nd = new Date(anchor);
    nd.setDate(anchor.getDate() + dir * 7);
    setAnchor(nd);
  };

  const label = `${selected.getDate()} ${MONTHS_AR[selected.getMonth()]} ${selected.getFullYear()}`;

  return (
    <div className="space-y-4">
      {/* Week nav */}
      <div className="glass-card rounded-2xl p-3">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => shiftWeek(-1)} className="size-9 rounded-lg hover:bg-muted grid place-items-center"><ChevronRight className="size-4" /></button>
          <div className="text-center">
            <div className="text-sm font-bold flex items-center gap-1.5 justify-center"><CalendarDays className="size-4 text-primary" /> {label}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{WEEKDAYS_AR[selected.getDay()]}</div>
          </div>
          <button onClick={() => shiftWeek(1)} className="size-9 rounded-lg hover:bg-muted grid place-items-center"><ChevronLeft className="size-4" /></button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {week.map((d) => {
            const k = dateKey(d);
            const count = (byDay[k] ?? []).length;
            const isSel = k === selKey;
            const isToday = k === dateKey(new Date());
            const sched = settings.workDays[d.getDay() as 0|1|2|3|4|5|6];
            const closed = !sched?.open;
            return (
              <button
                key={k}
                onClick={() => setSelected(d)}
                className={cn(
                  "rounded-xl p-2 border text-center transition relative",
                  isSel ? "border-primary bg-gradient-to-b from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)]"
                        : "border-border bg-card/50 hover:border-primary/40",
                  closed && !isSel && "opacity-60",
                )}
              >
                <div className="text-[10px] opacity-80">{WEEKDAYS_AR[d.getDay()].slice(0,3)}</div>
                <div className="text-lg font-bold leading-tight">{d.getDate()}</div>
                {count > 0 && (
                  <span className={cn(
                    "absolute -top-1 -left-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-bold grid place-items-center px-1",
                    isSel ? "bg-background text-primary" : "bg-primary text-primary-foreground",
                  )}>{count}</span>
                )}
                {isToday && !isSel && <div className="mt-1 h-1 w-1 rounded-full bg-primary mx-auto" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day timeline */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="text-base font-bold">جدول اليوم</div>
            <div className="text-xs text-muted-foreground">{dayBookings.length} حجز • {formatSAR(dayRevenue)}</div>
          </div>
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Clock className="size-3.5" /> ساعات الدوام: {String(Math.floor(openMin/60)).padStart(2,"0")}:00 - {String(Math.floor(closeMin/60)).padStart(2,"0")}:00
          </div>
        </div>

        {dayBookings.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-10">لا مواعيد في هذا اليوم</div>
        ) : (
          <div className="relative flex gap-3" style={{ height: `${Math.max(360, totalMin * 1.4)}px` }}>
            {/* Hour rail */}
            <div className="w-14 shrink-0 relative">
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute right-0 left-0 text-[10px] text-muted-foreground font-mono"
                  style={{ top: `${((h * 60 - openMin) / totalMin) * 100}%` }}
                >
                  <span className="bg-background pl-1">{String(h).padStart(2,"0")}:00</span>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div className="flex-1 relative rounded-xl border border-border bg-muted/20 overflow-hidden">
              {/* Hour grid lines */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-border/50"
                  style={{ top: `${((h * 60 - openMin) / totalMin) * 100}%` }}
                />
              ))}
              {/* Now indicator */}
              {(() => {
                const now = new Date();
                if (dateKey(now) !== selKey) return null;
                const nm = now.getHours() * 60 + now.getMinutes();
                if (nm < openMin || nm > closeMin) return null;
                return (
                  <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: `${((nm - openMin) / totalMin) * 100}%` }}>
                    <div className="h-[2px] bg-destructive shadow-[0_0_8px_hsl(var(--destructive))]" />
                    <div className="absolute -top-1.5 right-0 h-3 w-3 rounded-full bg-destructive" />
                  </div>
                );
              })()}

              {dayBookings.map((b) => {
                const s = new Date(b.startsAt);
                const startM = s.getHours() * 60 + s.getMinutes();
                const dur = b.durationMin + (settings.bufferMin || 0);
                const top = Math.max(0, ((startM - openMin) / totalMin) * 100);
                const height = Math.max(4, (dur / totalMin) * 100);
                const cust = customers.find((c) => c.id === b.customerId);
                const st = staff.find((x) => x.id === b.staffId);
                const svcNames = b.serviceIds.map((sid) => services.find((sv) => sv.id === sid)?.name).filter(Boolean).join("، ");
                const who = variant === "staff" ? cust?.name : st?.name;
                const whoLabel = variant === "staff" ? "العميلة" : "الأخصائية";
                const paid = b.payStatus === "paid";
                return (
                  <div
                    key={b.id}
                    className={cn(
                      "absolute right-2 left-2 rounded-lg border p-2 overflow-hidden shadow-sm",
                      STATUS_TONE[b.status],
                      "hover:z-20 hover:shadow-[var(--shadow-glow)] transition",
                    )}
                    style={{ top: `${top}%`, height: `${height}%`, minHeight: "44px" }}
                    title={`${formatTime(b.startsAt)} · ${b.code}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono opacity-70">{formatTime(b.startsAt)} • {b.durationMin}د</div>
                        <div className="text-xs font-bold truncate">{who}</div>
                        <div className="text-[10px] opacity-80 truncate">{svcNames}</div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-[9px] font-bold">{formatSAR(b.price - b.discount)}</span>
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-bold",
                          paid ? "bg-success/20 text-success" : "bg-warning/20 text-warning",
                        )}>{paid ? "مدفوع" : "غير مدفوع"}</span>
                      </div>
                    </div>
                    <div className="text-[9px] opacity-60 mt-0.5 truncate">{whoLabel}: {who} • {STATUS_LABEL[b.status]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
