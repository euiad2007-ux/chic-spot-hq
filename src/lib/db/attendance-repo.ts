import { supabase } from "@/integrations/supabase/client";
import { getDataContext } from "@/lib/db/context";
import { diffSync, enqueue, debounce, num, str } from "@/lib/db/sync";
import type { AttendanceRecord } from "@/lib/attendance-store";

type Row = Record<string, unknown> & { id: string };

let snap: Row[] = [];
let ready = false;

const dayKey = (iso: string) => (iso || new Date().toISOString()).slice(0, 10);

const toRow = (r: AttendanceRecord, salon_id: string): Row => ({
  id: r.id,
  salon_id,
  staff_id: r.staffId,
  work_date: dayKey(r.checkInAt),
  check_in: r.checkInAt,
  check_out: r.checkOutAt ?? null,
  in_lat: r.checkInLat,
  in_lng: r.checkInLng,
  out_lat: r.checkOutLat ?? null,
  out_lng: r.checkOutLng ?? null,
  minutes: r.checkOutAt
    ? Math.max(0, Math.round((new Date(r.checkOutAt).getTime() - new Date(r.checkInAt).getTime()) / 60000))
    : 0,
  via: r.via ?? "geo",
  note: r.note ?? null,
});

export async function loadAttendanceRecords(salonId: string): Promise<AttendanceRecord[]> {
  const { data } = await supabase
    .from("attendance")
    .select("*")
    .eq("salon_id", salonId)
    .order("check_in", { ascending: false });
  const records: AttendanceRecord[] = (data ?? []).map((r) => ({
    id: r.id,
    staffId: str(r.staff_id),
    checkInAt: str(r.check_in, str(r.work_date)),
    checkInLat: num(r.in_lat),
    checkInLng: num(r.in_lng),
    checkOutAt: r.check_out ?? undefined,
    checkOutLat: r.out_lat === null ? undefined : num(r.out_lat),
    checkOutLng: r.out_lng === null ? undefined : num(r.out_lng),
    via: (r.via ?? "geo") as AttendanceRecord["via"],
    note: r.note ?? undefined,
  }));
  snap = records.map((r) => toRow(r, salonId));
  ready = true;
  return records;
}

let pendingRecords: AttendanceRecord[] | null = null;

const flush = debounce(() => {
  const records = pendingRecords;
  pendingRecords = null;
  const ctx = getDataContext();
  if (!records || !ctx?.salonId || !ready) return;
  const salonId = ctx.salonId;
  void enqueue(async () => {
    const next = records.map((r) => toRow(r, salonId));
    const prev = snap;
    snap = next;
    await diffSync("attendance", next, prev);
  });
}, 300);

export function scheduleAttendanceSave(records: AttendanceRecord[]) {
  pendingRecords = records;
  flush();
}
