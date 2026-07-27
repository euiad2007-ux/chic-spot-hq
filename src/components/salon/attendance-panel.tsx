import { useState } from "react";
import {
  useAttendance, attendanceActions, getCurrentPosition, distanceMeters,
  openAttendanceRecord, todayRecordsFor, workedMinutes,
  type AttendanceRecord,
} from "@/lib/attendance-store";
import { useSalon, formatTime } from "@/lib/salon-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  MapPin, Crosshair, ShieldCheck, ShieldAlert, CheckCircle2, Clock,
  LogIn, LogOut, Users2, AlertTriangle, Timer, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";

export function AttendancePanel() {
  const { settings, records } = useAttendance((s) => s);
  const { staff } = useSalon((s) => s);
  const activeStaff = staff.filter((s) => s.active);
  const [expanded, setExpanded] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const locConfigured = settings.shopLat !== null && settings.shopLng !== null;

  const presentCount = activeStaff.filter((s) => openAttendanceRecord(records, s.id)).length;
  const totalMinutesToday = activeStaff.reduce((acc, s) => {
    return acc + todayRecordsFor(records, s.id).reduce((a, r) => a + workedMinutes(r), 0);
  }, 0);

  const captureHere = async () => {
    setCapturing(true);
    try {
      const pos = await getCurrentPosition();
      attendanceActions.setSettings({
        shopLat: pos.coords.latitude,
        shopLng: pos.coords.longitude,
      });
      toast.success("تم حفظ موقع الصالون");
    } catch (e: any) {
      toast.error(e?.message || "تعذّر تحديد الموقع");
    } finally { setCapturing(false); }
  };

  const doStaffAction = async (staffId: string, mode: "in" | "out") => {
    setBusyId(staffId + mode);
    try {
      const openRec = openAttendanceRecord(records, staffId);
      if (mode === "in" && openRec) { toast.info("لديه حضور مفتوح"); return; }
      if (mode === "out" && !openRec) { toast.info("لا يوجد حضور مفتوح"); return; }

      let lat = settings.shopLat ?? 0;
      let lng = settings.shopLng ?? 0;
      let via: "geo" | "manual" = "manual";
      try {
        const pos = await getCurrentPosition();
        lat = pos.coords.latitude; lng = pos.coords.longitude; via = "geo";
      } catch {}

      if (mode === "in") {
        attendanceActions.checkIn(staffId, lat, lng, via);
        toast.success("تم تسجيل حضور الموظف (إداري)");
      } else if (openRec) {
        attendanceActions.checkOut(openRec.id, lat, lng);
        toast.success("تم تسجيل الانصراف");
      }
    } finally { setBusyId(null); }
  };

  return (
    <div className="glass-card rounded-2xl p-5 mt-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-gradient-to-br from-primary/25 to-accent/25 text-primary grid place-items-center border border-primary/30">
            <Users2 className="size-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg">حضور وانصراف الموظفين</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              متابعة مباشرة لحضور اليوم مع التحقق من الموقع الجغرافي
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-full bg-success/15 text-success border border-success/35 px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" /> {presentCount} حاضر
          </span>
          <span className="rounded-full bg-muted/50 border border-border px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5">
            <Timer className="size-3.5" /> {Math.floor(totalMinutesToday / 60)}س {totalMinutesToday % 60}د
          </span>
        </div>
      </div>

      {/* Location controls */}
      <div className={cn(
        "rounded-xl border p-4 mb-4",
        locConfigured ? "border-success/30 bg-success/5" : "border-warning/40 bg-warning/5",
      )}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div className="flex items-center gap-2">
            <MapPin className={cn("size-4", locConfigured ? "text-success" : "text-warning")} />
            <div className="font-bold text-sm">موقع الصالون</div>
            {locConfigured ? (
              <span className="text-[11px] text-success inline-flex items-center gap-1">
                <ShieldCheck className="size-3.5" /> محفوظ
              </span>
            ) : (
              <span className="text-[11px] text-warning inline-flex items-center gap-1">
                <ShieldAlert className="size-3.5" /> غير محدد
              </span>
            )}
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enforceLocation}
              onChange={(e) => attendanceActions.setSettings({ enforceLocation: e.target.checked })}
              className="size-4 accent-primary"
            />
            إلزام التحقق من الموقع
          </label>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Lat</span>
            <input
              type="number" step="any"
              value={settings.shopLat ?? ""}
              onChange={(e) => attendanceActions.setSettings({ shopLat: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="24.7136"
              className="w-full h-9 rounded-lg bg-background/60 border border-border px-2 text-xs font-semibold"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">Lng</span>
            <input
              type="number" step="any"
              value={settings.shopLng ?? ""}
              onChange={(e) => attendanceActions.setSettings({ shopLng: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="46.6753"
              className="w-full h-9 rounded-lg bg-background/60 border border-border px-2 text-xs font-semibold"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground">النطاق (متر)</span>
            <input
              type="number" min={10}
              value={settings.radiusMeters}
              onChange={(e) => attendanceActions.setSettings({ radiusMeters: Math.max(10, Number(e.target.value) || 0) })}
              className="w-full h-9 rounded-lg bg-background/60 border border-border px-2 text-xs font-semibold"
            />
          </label>
          <button
            onClick={captureHere}
            disabled={capturing}
            className="h-9 mt-[18px] rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            <Crosshair className="size-3.5" />
            {capturing ? "جارٍ التحديد..." : "استخدم موقعي"}
          </button>
        </div>

        {locConfigured && (
          <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
            <span>الإحداثيات: <b>{settings.shopLat!.toFixed(5)}, {settings.shopLng!.toFixed(5)}</b></span>
            <a
              href={`https://www.google.com/maps?q=${settings.shopLat},${settings.shopLng}`}
              target="_blank" rel="noreferrer"
              className="text-primary hover:underline"
            >عرض على الخريطة</a>
          </div>
        )}
        {settings.enforceLocation && !locConfigured && (
          <div className="mt-2 rounded-lg border border-warning/40 bg-warning/10 text-warning text-[11px] p-2 flex items-center gap-2">
            <AlertTriangle className="size-3.5" /> فعّلت التحقق لكن لم تحدد إحداثيات — لن يتمكن الموظفون من تسجيل الحضور.
          </div>
        )}
      </div>

      {/* Staff list */}
      {activeStaff.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          لا يوجد موظفون نشطون
        </div>
      ) : (
        <div className="space-y-2">
          {activeStaff.slice(0, expanded ? undefined : 4).map((s) => (
            <StaffRow
              key={s.id}
              staffId={s.id}
              staffName={s.name}
              records={records}
              busy={busyId?.startsWith(s.id) ?? false}
              onCheckIn={() => doStaffAction(s.id, "in")}
              onCheckOut={() => doStaffAction(s.id, "out")}
              shopLat={settings.shopLat}
              shopLng={settings.shopLng}
            />
          ))}
          {activeStaff.length > 4 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-full h-9 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5"
            >
              {expanded ? <><ChevronUp className="size-3.5" /> إخفاء</> : <><ChevronDown className="size-3.5" /> عرض الكل ({activeStaff.length})</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StaffRow({
  staffId, staffName, records, busy, onCheckIn, onCheckOut, shopLat, shopLng,
}: {
  staffId: string; staffName: string; records: AttendanceRecord[];
  busy: boolean; onCheckIn: () => void; onCheckOut: () => void;
  shopLat: number | null; shopLng: number | null;
}) {
  const openRec = openAttendanceRecord(records, staffId);
  const todayRecs = todayRecordsFor(records, staffId);
  const totalMin = todayRecs.reduce((a, r) => a + workedMinutes(r), 0);
  const lastRec = todayRecs[0];
  const lastDist = lastRec && shopLat !== null && shopLng !== null
    ? distanceMeters(lastRec.checkInLat, lastRec.checkInLng, shopLat, shopLng)
    : null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3 flex-wrap">
      <div className="size-10 rounded-full bg-gradient-to-br from-primary to-accent grid place-items-center text-sm font-bold text-primary-foreground shrink-0">
        {staffName.charAt(0)}
      </div>
      <div className="flex-1 min-w-[140px]">
        <div className="font-semibold text-sm">{staffName}</div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
          {openRec ? (
            <span className="text-success inline-flex items-center gap-1">
              <CheckCircle2 className="size-3" /> حاضر منذ {formatTime(openRec.checkInAt)}
            </span>
          ) : todayRecs.length > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> انصرف — {Math.floor(totalMin / 60)}س {totalMin % 60}د اليوم
            </span>
          ) : (
            <span className="text-muted-foreground inline-flex items-center gap-1">
              <Clock className="size-3" /> لم يحضر بعد
            </span>
          )}
          {lastDist !== null && (
            <span className="text-muted-foreground">• {Math.round(lastDist)}م من الصالون</span>
          )}
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        {!openRec ? (
          <button
            onClick={onCheckIn}
            disabled={busy}
            className="h-9 px-3 rounded-lg bg-success/15 text-success border border-success/30 hover:bg-success/25 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <LogIn className="size-3.5" /> حضور
          </button>
        ) : (
          <button
            onClick={onCheckOut}
            disabled={busy}
            className="h-9 px-3 rounded-lg bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <LogOut className="size-3.5" /> انصراف
          </button>
        )}
      </div>
    </div>
  );
}
