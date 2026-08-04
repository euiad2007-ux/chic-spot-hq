import { useMemo } from "react";
import { AlarmClock, Clock } from "lucide-react";
import { useSalon } from "@/lib/salon-store";
import { listDelays, delayStats } from "@/lib/lateness";
import { cn } from "@/lib/utils";

/** Delay file: every late start recorded against a staff member. */
export function DelayLog({ staffId, className }: { staffId: string; className?: string }) {
  const { bookings, customers } = useSalon((s) => s);
  const records = useMemo(() => listDelays(bookings, staffId), [bookings, staffId]);
  const stats = delayStats(records);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="عدد التأخيرات" value={String(stats.count)} />
        <Stat label="إجمالي دقائق التأخير" value={`${stats.totalMin} د`} />
        <Stat label="متوسط التأخير" value={`${stats.avgMin} د`} />
      </div>

      {records.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">لا توجد حالات تأخير مسجلة</div>
      ) : (
        <div className="space-y-2">
          {records.map((r) => {
            const cust = customers.find((c) => c.id === r.customerId);
            return (
              <div key={r.bookingId} className="rounded-lg border border-warning/40 bg-warning/10 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-warning">
                    <AlarmClock className="size-4" /> تأخير {r.lateMin} دقيقة
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground">{r.code}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" /> الموعد: {new Date(r.startsAt).toLocaleString("ar-SA")}
                  </span>
                  <span>الرصد: {new Date(r.detectedAt).toLocaleString("ar-SA")}</span>
                  {cust && <span>العميل: {cust.name}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
