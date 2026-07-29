import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  useSalon, actions, formatSAR, formatTime, formatDate,
  STATUS_LABEL, STATUS_TONE, isToday,
} from "@/lib/salon-store";
import { useSession, auth } from "@/lib/auth-store";
import { useBookingSettings, WEEKDAYS, dayLabel } from "@/lib/booking-settings";
import {
  useAttendance, attendanceActions, getCurrentPosition, distanceMeters,
  openAttendanceRecord, todayRecordsFor, workedMinutes,
  type AttendanceSettings, type AttendanceRecord,
} from "@/lib/attendance-store";

import {
  CalendarDays, LogOut, Scissors, TrendingUp, Users2, CheckCircle2, Phone,
  MapPin, LogIn, LogOut as LogOutIcon, Clock, User2, History, AlertTriangle,
} from "lucide-react";
import { BookingCalendar } from "@/components/salon/booking-calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { BookingStatus } from "@/lib/salon-store";

export const Route = createFileRoute("/specialist")({
  head: () => ({
    meta: [
      { title: "لوحة الأخصائية — صالون لمسة" },
      { name: "description", content: "لوحة الأخصائية: مواعيدك اليوم، عمولاتك، وأداؤك." },
    ],
  }),
  component: SpecialistPage,
});

type Tab = "today" | "calendar" | "profile" | "schedule" | "history" | "attendance";

function SpecialistPage() {
  const session = useSession();
  const navigate = useNavigate();
  const { bookings, services, customers, staff } = useSalon((s) => s);
  const bookingSettings = useBookingSettings((s) => s);
  const attendance = useAttendance((s) => s);
  const [tab, setTab] = useState<Tab>("today");

  useEffect(() => {
    if (session === null) navigate({ to: "/login" });
    else if (session && session.role !== "staff") navigate({ to: "/login" });
  }, [session, navigate]);

  const me = staff.find((s) => s.id === session?.id);

  const mine = useMemo(
    () => bookings.filter((b) => b.staffId === session?.id).sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [bookings, session],
  );
  const today = mine.filter((b) => isToday(b.startsAt) && b.status !== "cancelled");
  const upcoming = mine.filter((b) => !isToday(b.startsAt) && new Date(b.startsAt) > new Date() && b.status !== "cancelled");
  const past = mine.filter((b) => new Date(b.startsAt) < new Date() && !isToday(b.startsAt)).reverse();
  const completed = mine.filter((b) => b.status === "completed");
  const revenue = completed.reduce((sum, b) => sum + (b.price - b.discount), 0);
  const commission = me ? (revenue * me.commissionPct) / 100 : 0;
  const uniqueClients = new Set(completed.map((b) => b.customerId)).size;

  if (!session || !me) return null;

  const setStatus = (id: string, status: BookingStatus) => {
    actions.updateBooking(id, { status });
    toast.success("تم التحديث");
  };

  const openRec = openAttendanceRecord(attendance.records, me.id);
  const myTodayRecs = todayRecordsFor(attendance.records, me.id);

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "today", label: "اليوم", icon: <CalendarDays className="size-4" /> },
    { key: "calendar", label: "التقويم", icon: <CalendarDays className="size-4" /> },
    { key: "attendance", label: "الحضور", icon: <MapPin className="size-4" /> },
    { key: "profile", label: "بياناتي", icon: <User2 className="size-4" /> },
    { key: "schedule", label: "الدوام", icon: <Clock className="size-4" /> },
    { key: "history", label: "السجل", icon: <History className="size-4" /> },
  ];

  return (
    <div className="min-h-screen" dir="rtl">
      <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link to="/site" className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center shadow-[var(--shadow-glow)]">
              <Scissors className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold text-sm leading-none">صالون لمسة</div>
              <div className="text-[11px] text-muted-foreground mt-1">لوحة الأخصائية</div>
            </div>
          </Link>
          <button
            onClick={() => { auth.signOut(); navigate({ to: "/site" }); }}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-border text-sm hover:bg-muted"
          >
            <LogOut className="size-4" /> خروج
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Profile hero */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -top-16 -left-16 size-56 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex items-center gap-4 flex-wrap">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground text-2xl font-bold shadow-[var(--shadow-glow)]">
              {me.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-muted-foreground">أهلاً بكِ</div>
              <div className="text-2xl font-bold">{me.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{me.role} • عمولة {me.commissionPct}%</div>
            </div>
            <AttendanceBadge openRec={openRec} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<CalendarDays className="size-5" />} label="مواعيد اليوم" value={today.length.toString()} tone="primary" />
          <StatCard icon={<CheckCircle2 className="size-5" />} label="خدمات مكتملة" value={completed.length.toString()} tone="success" />
          <StatCard icon={<Users2 className="size-5" />} label="عملاء" value={uniqueClients.toString()} tone="accent" />
          <StatCard icon={<TrendingUp className="size-5" />} label="عمولتك" value={formatSAR(commission)} tone="gradient" />
        </div>

        {/* Tabs */}
        <div className="glass-card rounded-2xl p-1.5 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "px-3 h-10 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition",
                tab === t.key
                  ? "bg-gradient-to-l from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {tab === "today" && (
          <TodaySection today={today} upcoming={upcoming} services={services} customers={customers} setStatus={setStatus} />
        )}

        {tab === "attendance" && (
          <AttendanceSection
            staffId={me.id}
            openRec={openRec}
            todayRecs={myTodayRecs}
            settings={attendance.settings}
          />
        )}

        {tab === "profile" && <ProfileSection staff={me} />}

        {tab === "schedule" && <ScheduleSection settings={bookingSettings} staffId={me.id} />}

        {tab === "history" && <HistorySection past={past} services={services} customers={customers} />}
      </main>
    </div>
  );
}

function AttendanceBadge({ openRec }: { openRec?: { checkInAt: string } }) {
  if (!openRec) {
    return (
      <div className="rounded-full bg-muted/40 border border-border px-3 py-1 text-xs font-semibold text-muted-foreground inline-flex items-center gap-1.5">
        <Clock className="size-3.5" /> خارج الدوام
      </div>
    );
  }
  return (
    <div className="rounded-full bg-success/15 text-success border border-success/35 px-3 py-1 text-xs font-bold inline-flex items-center gap-1.5">
      <CheckCircle2 className="size-3.5" /> حاضر منذ {formatTime(openRec.checkInAt)}
    </div>
  );
}

function TodaySection({
  today, upcoming, services, customers, setStatus,
}: {
  today: any[]; upcoming: any[]; services: any[]; customers: any[];
  setStatus: (id: string, s: BookingStatus) => void;
}) {
  return (
    <>
      <section>
        <h2 className="text-xl font-bold mb-4">مواعيد اليوم</h2>
        {today.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">لا مواعيد اليوم</div>
        ) : (
          <div className="space-y-3">
            {today.map((b) => {
              const c = customers.find((x) => x.id === b.customerId);
              const svcs = b.serviceIds.map((id: string) => services.find((s) => s.id === id)?.name).filter(Boolean).join("، ");
              return (
                <div key={b.id} className="glass-card rounded-2xl p-4 flex items-center gap-4 flex-wrap">
                  <div className="text-center min-w-[70px]">
                    <div className="text-lg font-bold gradient-text">{formatTime(b.startsAt)}</div>
                    <div className="text-[10px] text-muted-foreground">{b.durationMin} د</div>
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-bold">{c?.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{svcs}</div>
                    <a href={`tel:${c?.phone}`} className="text-[11px] text-primary mt-1 inline-flex items-center gap-1"><Phone className="size-3" /> {c?.phone}</a>
                  </div>
                  <div className="text-sm font-bold">{formatSAR(b.price - b.discount)}</div>
                  <span className={cn("text-[10px] px-2 py-1 rounded-md border font-semibold", STATUS_TONE[b.status as BookingStatus])}>
                    {STATUS_LABEL[b.status as BookingStatus]}
                  </span>
                  <div className="flex gap-2">
                    {b.status !== "in_progress" && b.status !== "completed" && (
                      <button onClick={() => setStatus(b.id, "in_progress")} className="text-xs px-3 h-8 rounded-lg bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25">
                        بدء
                      </button>
                    )}
                    {b.status !== "completed" && (
                      <button onClick={() => setStatus(b.id, "completed")} className="text-xs px-3 h-8 rounded-lg bg-success/15 text-success border border-success/30 hover:bg-success/25">
                        إتمام
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4">قادمة</h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-right py-3 px-4 font-semibold">التاريخ</th>
                  <th className="text-right py-3 px-4 font-semibold">الوقت</th>
                  <th className="text-right py-3 px-4 font-semibold">العميلة</th>
                  <th className="text-right py-3 px-4 font-semibold">الخدمة</th>
                  <th className="text-right py-3 px-4 font-semibold">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((b) => {
                  const c = customers.find((x) => x.id === b.customerId);
                  const svcs = b.serviceIds.map((id: string) => services.find((s) => s.id === id)?.name).filter(Boolean).join("، ");
                  return (
                    <tr key={b.id} className="border-t border-border">
                      <td className="py-3 px-4 text-xs">{formatDate(b.startsAt)}</td>
                      <td className="py-3 px-4 font-mono text-xs">{formatTime(b.startsAt)}</td>
                      <td className="py-3 px-4 font-semibold">{c?.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{svcs}</td>
                      <td className="py-3 px-4 font-bold">{formatSAR(b.price - b.discount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function AttendanceSection({
  staffId, openRec, todayRecs, settings,
}: {
  staffId: string;
  openRec?: AttendanceRecord;
  todayRecs: AttendanceRecord[];
  settings: AttendanceSettings;
}) {

  const [busy, setBusy] = useState(false);
  const [lastDist, setLastDist] = useState<number | null>(null);
  const locConfigured = settings.shopLat !== null && settings.shopLng !== null;
  const totalToday = todayRecs.reduce((a, r) => a + workedMinutes(r), 0);

  const doAction = async (mode: "in" | "out") => {
    setBusy(true);
    try {
      const pos = await getCurrentPosition();
      const lat = pos.coords.latitude, lng = pos.coords.longitude;

      // Verify range whenever the shop location is configured
      if (locConfigured) {
        const d = distanceMeters(lat, lng, settings.shopLat!, settings.shopLng!);
        setLastDist(d);
        if (d > settings.radiusMeters) {
          toast.error(
            mode === "in"
              ? `❌ أنت خارج نطاق الصالون — لا يمكن تسجيل الحضور (تبعد ${Math.round(d)}م / الحد المسموح ${settings.radiusMeters}م)`
              : `❌ أنت خارج نطاق الصالون — لا يمكن تسجيل الانصراف (تبعد ${Math.round(d)}م / الحد المسموح ${settings.radiusMeters}م)`,
            { duration: 5000 }
          );
          return;
        }
      } else if (settings.enforceLocation) {
        toast.error("لم يحدد المدير موقع الصالون بعد");
        return;
      }

      if (mode === "in") {
        if (openRec) { toast.info("لديك حضور مفتوح مسبقاً"); return; }
        attendanceActions.checkIn(staffId, lat, lng);
        toast.success("✅ تم تسجيل الحضور بنجاح — أنت داخل نطاق الصالون", { duration: 4000 });
      } else {
        if (!openRec) { toast.info("لا يوجد حضور مفتوح"); return; }
        attendanceActions.checkOut(openRec.id, lat, lng);
        toast.success("✅ تم تسجيل الانصراف بنجاح", { duration: 4000 });
      }
    } catch (e: any) {
      toast.error(e?.message || "تعذّر تحديد موقعك — فعّل خدمة الموقع GPS");
    } finally { setBusy(false); }
  };

  return (
    <section className="space-y-4">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div className="size-11 rounded-xl bg-primary/15 border border-primary/30 text-primary grid place-items-center">
            <MapPin className="size-5" />
          </div>
          <div className="flex-1 min-w-[180px]">
            <div className="font-bold">تسجيل الحضور والانصراف</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {settings.enforceLocation
                ? locConfigured
                  ? `يجب أن تكوني داخل نطاق ${settings.radiusMeters}م من موقع الصالون`
                  : "التحقق مفعّل لكن المدير لم يحدد موقع الصالون بعد"
                : "التحقق من الموقع غير مفعّل"}
            </div>
          </div>
        </div>

        {settings.enforceLocation && !locConfigured && (
          <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 text-warning text-xs p-3 flex items-center gap-2">
            <AlertTriangle className="size-4" /> يرجى مراجعة المدير لتحديد موقع الصالون.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => doAction("in")}
            disabled={busy || !!openRec || (settings.enforceLocation && !locConfigured)}
            className={cn(
              "h-14 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 border transition",
              openRec
                ? "bg-muted/40 text-muted-foreground border-border cursor-not-allowed"
                : "bg-gradient-to-l from-success to-emerald-500 text-white border-success shadow-[var(--shadow-glow)] hover:opacity-95",
              "disabled:opacity-60",
            )}
          >
            <LogIn className="size-5" /> {busy ? "..." : "حضور"}
          </button>
          <button
            onClick={() => doAction("out")}
            disabled={busy || !openRec}
            className={cn(
              "h-14 rounded-xl font-bold text-sm inline-flex items-center justify-center gap-2 border transition",
              !openRec
                ? "bg-muted/40 text-muted-foreground border-border cursor-not-allowed"
                : "bg-gradient-to-l from-destructive to-rose-500 text-white border-destructive hover:opacity-95",
              "disabled:opacity-60",
            )}
          >
            <LogOutIcon className="size-5" /> {busy ? "..." : "انصراف"}
          </button>
        </div>

        {lastDist !== null && (
          <div className="mt-3 text-[11px] text-muted-foreground">
            آخر مسافة تم قياسها من الصالون: <b>{Math.round(lastDist)}م</b>
          </div>
        )}
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">سجل حضور اليوم</h3>
          <span className="text-xs text-muted-foreground">
            إجمالي: <b>{Math.floor(totalToday / 60)}س {totalToday % 60}د</b>
          </span>
        </div>
        {todayRecs.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-6">لم يتم تسجيل حضور اليوم</div>
        ) : (
          <div className="space-y-2">
            {todayRecs.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-muted/20 p-3 flex items-center gap-3 flex-wrap text-xs">
                <span className="rounded-md bg-success/15 text-success border border-success/30 px-2 py-1 font-bold">
                  حضور {formatTime(r.checkInAt)}
                </span>
                {r.checkOutAt ? (
                  <span className="rounded-md bg-destructive/15 text-destructive border border-destructive/30 px-2 py-1 font-bold">
                    انصراف {formatTime(r.checkOutAt)}
                  </span>
                ) : (
                  <span className="rounded-md bg-warning/15 text-warning border border-warning/30 px-2 py-1 font-bold">
                    مفتوح
                  </span>
                )}
                <span className="text-muted-foreground">
                  {Math.floor(workedMinutes(r) / 60)}س {workedMinutes(r) % 60}د
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <MyAttendanceHistory staffId={staffId} />
    </section>
  );
}

function MyAttendanceHistory({ staffId }: { staffId: string }) {
  const { records } = useAttendance((s) => s);
  const mine = useMemo(() => records.filter((r) => r.staffId === staffId), [records, staffId]);

  // Group by YYYY-MM-DD
  const byDay = useMemo(() => {
    const m = new Map<string, AttendanceRecord[]>();
    for (const r of mine) {
      const k = new Date(r.checkInAt).toISOString().slice(0, 10);
      const arr = m.get(k) ?? [];
      arr.push(r);
      m.set(k, arr);
    }
    return Array.from(m.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [mine]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const past = byDay.filter(([k]) => k !== todayKey);
  const monthMinutes = useMemo(() => {
    const now = new Date();
    return mine.reduce((a, r) => {
      const d = new Date(r.checkInAt);
      if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) return a + workedMinutes(r);
      return a;
    }, 0);
  }, [mine]);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="font-bold text-sm">سجلي الشخصي</h3>
        <span className="text-xs text-muted-foreground">
          هذا الشهر: <b className="text-foreground">{Math.floor(monthMinutes / 60)}س {monthMinutes % 60}د</b>
        </span>
      </div>
      {past.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">لا يوجد سجل سابق</div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {past.slice(0, 30).map(([k, recs]) => {
            const total = recs.reduce((a, r) => a + workedMinutes(r), 0);
            return (
              <div key={k} className="rounded-xl border border-border bg-muted/10 p-3">
                <div className="flex items-center justify-between text-xs font-bold mb-2">
                  <span>{formatDate(k)}</span>
                  <span className="text-muted-foreground">{Math.floor(total / 60)}س {total % 60}د</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recs.map((r) => (
                    <span key={r.id} className="text-[10px] rounded-md border border-border bg-background/40 px-2 py-1 font-mono">
                      {formatTime(r.checkInAt)}{r.checkOutAt ? ` → ${formatTime(r.checkOutAt)}` : " (مفتوح)"}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProfileSection({ staff }: { staff: any }) {
  const totalAllowances = (staff.allowances ?? []).reduce((a: number, x: any) => a + x.amount, 0);
  const leavesUsed = (staff.leaves ?? []).reduce((a: number, l: any) => a + l.days, 0);
  const leaveTotal = staff.annualLeaveDays ?? 0;
  const leaveRemaining = Math.max(0, leaveTotal - leavesUsed);
  const contractLabel = staff.contractType === "part_time" ? "دوام جزئي" : staff.contractType === "contract" ? "عقد مؤقت" : "دوام كامل";
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-sm mb-1">البيانات الشخصية</h3>
        <Field label="الاسم" value={staff.name} />
        {staff.gender && <Field label="الجنس" value={staff.gender === "female" ? "أنثى" : "ذكر"} />}
        <Field label="الجوال" value={staff.phone} />
        {staff.email && <Field label="البريد" value={staff.email} />}
        {staff.nationalId && <Field label="رقم الهوية" value={staff.nationalId} />}
        {staff.birthDate && <Field label="تاريخ الميلاد" value={staff.birthDate} />}
        {staff.nationality && <Field label="الجنسية" value={staff.nationality} />}
        {staff.address && <Field label="العنوان" value={staff.address} />}
        {staff.emergencyName && <Field label="جهة الطوارئ" value={`${staff.emergencyName} — ${staff.emergencyPhone ?? ""}`} />}
      </div>
      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-sm mb-1">التعاقد والراتب</h3>
        <Field label="المسمى" value={staff.role} />
        {staff.jobTitle && <Field label="المسمى التفصيلي" value={staff.jobTitle} />}
        <Field label="نوع العقد" value={contractLabel} />
        {staff.hireDate && <Field label="تاريخ التعيين" value={formatDate(staff.hireDate)} />}
        <Field label="الراتب الأساسي" value={formatSAR(staff.salary ?? 0)} />
        <Field label="نسبة العمولة" value={`${staff.commissionPct}%`} />
        <Field label="إجمالي البدلات" value={formatSAR(totalAllowances)} />
        <Field label="النقاط" value={String(staff.points ?? 0)} />
        {staff.allowances && staff.allowances.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-[11px] font-semibold text-muted-foreground">تفاصيل البدلات</div>
            {staff.allowances.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between text-xs rounded-md bg-muted/30 px-2 py-1.5">
                <span>{a.label}</span>
                <b>{formatSAR(a.amount)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="glass-card rounded-2xl p-5 md:col-span-2">
        <h3 className="font-bold text-sm mb-3">رصيد الإجازات</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border p-3 text-center">
            <div className="text-[11px] text-muted-foreground">الرصيد السنوي</div>
            <div className="text-2xl font-bold mt-1">{leaveTotal}</div>
          </div>
          <div className="rounded-xl border border-border p-3 text-center">
            <div className="text-[11px] text-muted-foreground">مستخدم</div>
            <div className="text-2xl font-bold mt-1">{leavesUsed}</div>
          </div>
          <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10 p-3 text-center">
            <div className="text-[11px] text-muted-foreground">متبقٍ</div>
            <div className="text-2xl font-bold mt-1 gradient-text">{leaveRemaining}</div>
          </div>
        </div>
        {(staff.leaves ?? []).length > 0 && (
          <div className="mt-3 space-y-1.5">
            {(staff.leaves ?? []).map((l: any) => (
              <div key={l.id} className="text-xs rounded-md bg-muted/30 px-3 py-2 flex justify-between">
                <span>{l.from} → {l.to} ({l.days} يوم)</span>
                {l.reason && <span className="text-muted-foreground">{l.reason}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {staff.notes && staff.notes.length > 0 && (
        <div className="glass-card rounded-2xl p-5 md:col-span-2">
          <h3 className="font-bold text-sm mb-3">ملاحظات الإدارة</h3>
          <div className="space-y-2">
            {staff.notes.map((n: any) => (
              <div key={n.id} className="text-xs rounded-lg bg-muted/30 border border-border p-3">
                <div>{n.text}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{formatDate(n.at)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}


function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-border/50 pb-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <b className="font-semibold">{value}</b>
    </div>
  );
}

function ScheduleSection({ settings, staffId }: { settings: any; staffId: string }) {
  const staffBreaks = settings.breaks.filter((b: any) => !b.staffId || b.staffId === staffId);
  return (
    <section className="space-y-4">
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-bold text-sm mb-3">ساعات الدوام الأسبوعية</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {WEEKDAYS.map((d) => {
            const s = settings.workDays[d];
            return (
              <div key={d} className={cn(
                "rounded-xl border p-3 flex items-center justify-between text-sm",
                s.open ? "border-success/35 bg-success/5" : "border-border bg-muted/20 opacity-70",
              )}>
                <span className="font-bold">{dayLabel(d)}</span>
                {s.open ? (
                  <span className="font-mono text-xs">{s.start} — {s.end}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">مغلق</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {staffBreaks.length > 0 && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-bold text-sm mb-3">الاستراحات</h3>
          <div className="space-y-2">
            {staffBreaks.map((b: any) => (
              <div key={b.id} className="rounded-xl border border-border bg-muted/20 p-3 flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="font-bold">{b.label}</span>
                <span className="font-mono">{b.start} — {b.end}</span>
                <span className="text-muted-foreground">{b.days.map((x: any) => dayLabel(x)).join("، ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function HistorySection({ past, services, customers }: { past: any[]; services: any[]; customers: any[] }) {
  if (past.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">لا توجد حجوزات سابقة</div>
    );
  }
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th className="text-right py-3 px-4 font-semibold">التاريخ</th>
            <th className="text-right py-3 px-4 font-semibold">الوقت</th>
            <th className="text-right py-3 px-4 font-semibold">العميلة</th>
            <th className="text-right py-3 px-4 font-semibold">الخدمة</th>
            <th className="text-right py-3 px-4 font-semibold">الحالة</th>
            <th className="text-right py-3 px-4 font-semibold">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          {past.map((b) => {
            const c = customers.find((x) => x.id === b.customerId);
            const svcs = b.serviceIds.map((id: string) => services.find((s) => s.id === id)?.name).filter(Boolean).join("، ");
            return (
              <tr key={b.id} className="border-t border-border">
                <td className="py-3 px-4 text-xs">{formatDate(b.startsAt)}</td>
                <td className="py-3 px-4 font-mono text-xs">{formatTime(b.startsAt)}</td>
                <td className="py-3 px-4 font-semibold">{c?.name}</td>
                <td className="py-3 px-4 text-muted-foreground">{svcs}</td>
                <td className="py-3 px-4">
                  <span className={cn("text-[10px] px-2 py-1 rounded-md border font-semibold", STATUS_TONE[b.status as BookingStatus])}>
                    {STATUS_LABEL[b.status as BookingStatus]}
                  </span>
                </td>
                <td className="py-3 px-4 font-bold">{formatSAR(b.price - b.discount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "primary" | "success" | "accent" | "gradient" }) {
  const toneCls = {
    primary: "text-primary bg-primary/10 border-primary/20",
    success: "text-success bg-success/10 border-success/20",
    accent: "text-accent bg-accent/10 border-accent/20",
    gradient: "text-transparent bg-clip-text bg-gradient-to-l from-primary to-accent",
  }[tone];
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className={cn("size-10 rounded-xl grid place-items-center border", tone === "gradient" ? "border-primary/20 bg-gradient-to-br from-primary/20 to-accent/20 text-primary-foreground" : toneCls)}>
        {icon}
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-xl font-bold", tone === "gradient" && "gradient-text")}>{value}</div>
    </div>
  );
}
