import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { useSalon, formatTime, STATUS_LABEL, STATUS_TONE } from "@/lib/salon-store";
import { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "التقويم — لمسة" },
      { name: "description", content: "عرض المواعيد على التقويم اليومي." },
      { property: "og:title", content: "التقويم" },
      { property: "og:description", content: "المواعيد على التقويم." },
    ],
  }),
  component: CalendarPage,
});

const HOURS = Array.from({ length: 13 }, (_, i) => i + 9); // 9 AM - 9 PM

function CalendarPage() {
  const { bookings, staff, customers, services } = useSalon((s) => s);
  const [date, setDate] = useState(() => new Date());

  const dayBookings = useMemo(() => bookings.filter((b) => {
    const d = new Date(b.startsAt);
    return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
  }), [bookings, date]);

  const shift = (d: number) => setDate((cur) => new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + d));

  const activeStaff = staff.filter((s) => s.active);

  return (
    <AppShell
      title="التقويم"
      subtitle={new Intl.DateTimeFormat("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(date)}
      action={
        <div className="flex items-center gap-1 glass-card rounded-lg p-1">
          <button onClick={() => shift(-1)} className="size-9 rounded-md hover:bg-muted grid place-items-center"><ChevronRight className="size-4" /></button>
          <button onClick={() => setDate(new Date())} className="px-3 h-9 text-sm font-medium hover:bg-muted rounded-md">اليوم</button>
          <button onClick={() => shift(1)} className="size-9 rounded-md hover:bg-muted grid place-items-center"><ChevronLeft className="size-4" /></button>
        </div>
      }
    >
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header row */}
            <div className="grid border-b border-border bg-muted/30" style={{ gridTemplateColumns: `80px repeat(${activeStaff.length}, minmax(160px, 1fr))` }}>
              <div className="p-3 text-xs font-medium text-muted-foreground">الوقت</div>
              {activeStaff.map((s) => (
                <div key={s.id} className="p-3 border-r border-border">
                  <div className="text-sm font-bold">{s.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{s.role}</div>
                </div>
              ))}
            </div>
            {/* Hour rows */}
            {HOURS.map((h) => (
              <div key={h} className="grid border-b border-border relative" style={{ gridTemplateColumns: `80px repeat(${activeStaff.length}, minmax(160px, 1fr))`, minHeight: "72px" }}>
                <div className="p-3 text-xs text-muted-foreground border-l border-border">
                  {h}:00
                </div>
                {activeStaff.map((s) => {
                  const cell = dayBookings.filter((b) => new Date(b.startsAt).getHours() === h && b.staffId === s.id);
                  return (
                    <div key={s.id} className="p-1 border-r border-border relative">
                      {cell.map((b) => {
                        const cust = customers.find((c) => c.id === b.customerId);
                        const svc = services.find((sv) => sv.id === b.serviceIds[0]);
                        return (
                          <div key={b.id} className={cn("rounded-lg p-2 text-xs border mb-1", STATUS_TONE[b.status])}>
                            <div className="font-bold">{formatTime(b.startsAt)} · {cust?.name}</div>
                            <div className="opacity-80 mt-0.5 truncate">{svc?.name}</div>
                            <div className="text-[10px] opacity-70 mt-1">{STATUS_LABEL[b.status]}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
