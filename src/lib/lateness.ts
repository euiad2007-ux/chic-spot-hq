import { useEffect } from "react";
import { toast } from "sonner";
import { actions, getState, type Booking } from "@/lib/salon-store";
import { getBookingSettings } from "@/lib/booking-settings";

/**
 * Late-start tracking.
 *
 * Delay evidence is persisted inside the booking's own `notes` field as a
 * marker so it survives sync without a schema change:
 *   [late:<minutes>@<ISO>]
 * A matching human-readable note is also written into the staff file.
 */

const MARKER = /\[late:(\d+)@([^\]]+)\]/g;

export interface DelayRecord {
  bookingId: string;
  code: string;
  staffId: string;
  customerId: string;
  startsAt: string;
  detectedAt: string;
  lateMin: number;
}

export function parseDelay(b: Booking): DelayRecord | null {
  MARKER.lastIndex = 0;
  const m = MARKER.exec(b.notes ?? "");
  if (!m) return null;
  return {
    bookingId: b.id,
    code: b.code,
    staffId: b.staffId,
    customerId: b.customerId,
    startsAt: b.startsAt,
    detectedAt: m[2],
    lateMin: Number(m[1]),
  };
}

export function hasDelayMarker(b: Booking) {
  MARKER.lastIndex = 0;
  return MARKER.test(b.notes ?? "");
}

/** All recorded delays, newest first. Optionally filtered by staff. */
export function listDelays(bookings: Booking[], staffId?: string): DelayRecord[] {
  return bookings
    .map(parseDelay)
    .filter((d): d is DelayRecord => !!d && (!staffId || d.staffId === staffId))
    .sort((a, b) => +new Date(b.startsAt) - +new Date(a.startsAt));
}

export function delayStats(records: DelayRecord[]) {
  const total = records.reduce((a, r) => a + r.lateMin, 0);
  return {
    count: records.length,
    totalMin: total,
    avgMin: records.length ? Math.round(total / records.length) : 0,
  };
}

/** Statuses that mean work has not started yet. */
const NOT_STARTED = new Set(["new", "confirmed", "checked_in"]);

/** Minutes past the appointment start, or 0 when not late. */
export function lateMinutes(b: Booking, now = Date.now()) {
  const start = new Date(b.startsAt).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((now - start) / 60000));
}

/** Bookings whose service time arrived but work never started. */
export function pendingLateBookings(bookings: Booking[], graceMin: number, now = Date.now()) {
  return bookings.filter(
    (b) => NOT_STARTED.has(b.status) && lateMinutes(b, now) > graceMin,
  );
}

function record(b: Booking, lateMin: number) {
  const detectedAt = new Date().toISOString();
  const marker = `[late:${lateMin}@${detectedAt}]`;
  actions.updateBooking(b.id, {
    notes: `${(b.notes ?? "").trim()}\n${marker}`.trim(),
  });
  const st = getState().staff.find((s) => s.id === b.staffId);
  if (st) {
    actions.addStaffNote(
      b.staffId,
      `تأخير عن الحجز ${b.code} — تجاوز موعد البدء بـ ${lateMin} دقيقة (الموعد ${new Date(b.startsAt).toLocaleString("ar-SA")})`,
    );
  }
  return st?.name ?? "الأخصائية";
}

/**
 * Watches upcoming bookings and raises an alert (plus a permanent record in the
 * staff file) when the service time passed without the work starting.
 * Mounted for both the reception/admin shell and the specialist dashboard.
 */
export function useLatenessWatcher(opts: { staffId?: string; enabled?: boolean } = {}) {
  const { staffId, enabled = true } = opts;
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      const grace = getBookingSettings().holdGraceMin || 5;
      const bookings = getState().bookings.filter((b) => (staffId ? b.staffId === staffId : true));
      for (const b of pendingLateBookings(bookings, grace)) {
        const late = lateMinutes(b);
        if (hasDelayMarker(b)) continue;
        const name = record(b, late);
        toast.warning(`تأخير في بدء الخدمة — ${name}`, {
          description: `الحجز ${b.code} تجاوز موعده بـ ${late} دقيقة ولم يبدأ العمل. تم تسجيل التأخير في ملف الموظف.`,
          duration: 12000,
        });
      }
    };
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, [staffId, enabled]);
}
