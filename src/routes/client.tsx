import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { SlotPicker } from "@/components/salon/slot-picker";
import { useEffect, useMemo, useState } from "react";
import { useSalon, actions, formatSAR, formatTime, formatDate, serviceTotalMin } from "@/lib/salon-store";
import { checkBookingConflict, getDaySlots } from "@/lib/booking-settings";
import { useSession, auth } from "@/lib/auth-store";
import { CalendarDays, Sparkles, Clock, LogOut, Plus, X, Scissors, Star, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/client")({
  head: () => ({
    meta: [
      { title: "حسابي — صالون لمسة" },
      { name: "description", content: "لوحة العميلة: حجوزاتك القادمة وسجل زياراتك." },
    ],
  }),
  component: ClientPage,
});

function ClientPage() {
  const session = useSession();
  const navigate = useNavigate();
  const { bookings, services, staff, customers, invoices } = useSalon((s) => s);

  useEffect(() => {
    if (session === null) navigate({ to: "/login" });
    else if (session && session.role !== "client") navigate({ to: "/login" });
  }, [session, navigate]);

  const me = customers.find((c) => c.id === session?.id);
  const myBookings = useMemo(
    () => bookings.filter((b) => b.customerId === session?.id).sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()),
    [bookings, session],
  );
  const upcoming = myBookings.filter((b) => new Date(b.startsAt) >= new Date() && b.status !== "cancelled" && b.status !== "completed");
  const past = myBookings.filter((b) => !upcoming.includes(b));
  const myInvoices = invoices.filter((i) => i.customerId === session?.id);

  const [open, setOpen] = useState(false);

  if (!session || !me) return null;

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
              <div className="text-[11px] text-muted-foreground mt-1">لوحة العميلة</div>
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
        {/* Greeting */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -top-16 -left-16 size-56 rounded-full bg-primary/30 blur-3xl" />
          <div className="relative flex items-center gap-4 flex-wrap">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground text-2xl font-bold shadow-[var(--shadow-glow)]">
              {me.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-muted-foreground">مرحباً بعودتك</div>
              <div className="text-2xl font-bold">{me.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{me.phone}</div>
            </div>
            <div className="flex gap-3">
              <Stat label="زيارة" value={me.visits.toString()} icon={<CalendarDays className="size-4" />} />
              <Stat label="إجمالي الإنفاق" value={formatSAR(me.totalSpent)} icon={<Star className="size-4" />} />
            </div>
          </div>
        </div>

        {/* Upcoming */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">حجوزاتك القادمة</h2>
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
              <Plus className="size-4" /> حجز جديد
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">
              لا توجد حجوزات قادمة
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {upcoming.map((b) => {
                const svcs = b.serviceIds.map((id) => services.find((s) => s.id === id)?.name).filter(Boolean).join("، ");
                const st = staff.find((s) => s.id === b.staffId);
                return (
                  <div key={b.id} className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-mono text-muted-foreground">{b.code}</div>
                        <div className="mt-1 font-bold">{svcs}</div>
                        <div className="text-xs text-muted-foreground mt-1">مع {st?.name}</div>
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold gradient-text">{formatTime(b.startsAt)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{formatDate(b.startsAt)}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <div className="text-sm font-bold">{formatSAR(b.price - b.discount)}</div>
                      <button
                        onClick={() => { if (confirm("إلغاء الحجز؟")) { actions.updateBooking(b.id, { status: "cancelled" }); toast.success("تم الإلغاء"); } }}
                        className="text-xs text-destructive hover:underline"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Past */}
        {past.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4">سجل الزيارات</h2>
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-right py-3 px-4 font-semibold">التاريخ</th>
                    <th className="text-right py-3 px-4 font-semibold">الخدمة</th>
                    <th className="text-right py-3 px-4 font-semibold">الأخصائية</th>
                    <th className="text-right py-3 px-4 font-semibold">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {past.map((b) => {
                    const svcs = b.serviceIds.map((id) => services.find((s) => s.id === id)?.name).filter(Boolean).join("، ");
                    const st = staff.find((s) => s.id === b.staffId);
                    return (
                      <tr key={b.id} className="border-t border-border">
                        <td className="py-3 px-4 text-xs">{formatDate(b.startsAt)}</td>
                        <td className="py-3 px-4">{svcs}</td>
                        <td className="py-3 px-4 text-muted-foreground">{st?.name}</td>
                        <td className="py-3 px-4 font-semibold">{formatSAR(b.price - b.discount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Invoices */}
        {myInvoices.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Receipt className="size-5" /> فواتيرك</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {myInvoices.map((i) => (
                <div key={i.id} className="glass-card rounded-2xl p-4">
                  <div className="text-xs font-mono text-muted-foreground">{i.number}</div>
                  <div className="mt-2 text-2xl font-bold gradient-text">{formatSAR(i.total)}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">{formatDate(i.createdAt)}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {open && <NewBookingModal onClose={() => setOpen(false)} customerId={me.id} />}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border px-4 py-2.5 text-center min-w-[100px]">
      <div className="flex items-center justify-center gap-1 text-muted-foreground">{icon}<span className="text-[10px]">{label}</span></div>
      <div className="text-sm font-bold mt-1">{value}</div>
    </div>
  );
}

function NewBookingModal({ onClose, customerId }: { onClose: () => void; customerId: string }) {
  const { services, staff } = useSalon((s) => s);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>("");

  const svc = services.find((s) => s.id === serviceId);
  const svcTotal = svc ? serviceTotalMin(svc) : 0;

  const slots = useMemo(() => {
    if (!svc || !staffId) return [];
    return getDaySlots({ date, staffId, durationMin: svcTotal });
  }, [date, staffId, svcTotal, svc]);

  const selectedSlot = slots.find((s) => s.time === time);
  const startsAt = selectedSlot?.startsAt ?? "";
  const conflict = svc && startsAt ? checkBookingConflict({ staffId, startsAt, durationMin: svcTotal }) : null;

  const submit = () => {
    if (!svc) return;
    if (!time || !startsAt) return toast.error("اختر وقتاً متاحاً");
    if (conflict) return toast.error(conflict.message);
    actions.addBooking({
      customerId,
      staffId,
      serviceIds: [serviceId],
      startsAt,
      durationMin: svcTotal,
      price: svc.price,
      discount: 0,
    });
    toast.success("تم إنشاء الحجز");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur">
          <h3 className="font-bold text-lg flex items-center gap-2"><Sparkles className="size-5 text-primary" /> حجز جديد</h3>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="الخدمة">
            <select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setTime(""); }} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm">
              {services.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name} — {formatSAR(s.price)}</option>)}
            </select>
          </Field>
          <Field label="الأخصائية">
            <select value={staffId} onChange={(e) => { setStaffId(e.target.value); setTime(""); }} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm">
              {staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
            </select>
          </Field>
          <Field label="التاريخ">
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
          </Field>
          <Field label={`الأوقات المتاحة${svc ? ` (مدة ${svc.durationMin} دقيقة)` : ""}`}>
            {slots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                لا توجد أوقات متاحة في هذا اليوم
              </div>
            ) : (
              <SlotPicker slots={slots} selectedTime={time} onSelect={setTime} />
            )}
          </Field>
          {svc && (
            <div className="rounded-xl bg-muted/40 border border-border p-3 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground"><Clock className="size-3.5" /> {svc.durationMin} دقيقة</span>
              <span className="font-bold gradient-text">{formatSAR(svc.price)}</span>
            </div>
          )}
          {conflict && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive p-3 text-xs">
              {conflict.message}
            </div>
          )}
        </div>
        <div className="p-5 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-card/95 backdrop-blur">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">إلغاء</button>
          <button
            onClick={submit}
            disabled={!!conflict || !time}
            className={cn("px-6 h-10 rounded-lg text-sm font-semibold text-primary-foreground bg-gradient-to-l from-primary to-accent disabled:opacity-50 disabled:cursor-not-allowed")}
          >
            تأكيد الحجز
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-2 block">{label}</label>
      {children}
    </div>
  );
}
