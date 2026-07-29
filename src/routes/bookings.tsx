import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { SlotPicker } from "@/components/salon/slot-picker";
import { useSalon, actions, formatSAR, formatTime, formatDateShort, serviceTotalMin, eligibleStaffFor, STATUS_LABEL, STATUS_TONE, PAY_LABEL, type BookingStatus } from "@/lib/salon-store";
import { checkBookingConflict, getDaySlots, useBookingSettings } from "@/lib/booking-settings";
import { evalCoupon, couponActions } from "@/lib/coupon-store";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, Search, Trash2, CheckCircle2, X, AlertTriangle, Ticket, Wallet } from "lucide-react";
import { toast } from "sonner";


export const Route = createFileRoute("/bookings")({
  head: () => ({
    meta: [
      { title: "الحجوزات — لمسة" },
      { name: "description", content: "إدارة الحجوزات والمواعيد." },
      { property: "og:title", content: "الحجوزات" },
      { property: "og:description", content: "إدارة الحجوزات والمواعيد." },
    ],
  }),
  component: BookingsPage,
});

const STATUS_FILTERS: { id: BookingStatus | "all"; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "new", label: "جديدة" },
  { id: "confirmed", label: "مؤكدة" },
  { id: "checked_in", label: "حاضر" },
  { id: "completed", label: "مكتملة" },
  { id: "cancelled", label: "ملغية" },
];

function BookingsPage() {
  const state = useSalon((s) => s);
  const { bookings, customers, staff, services } = state;
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);

  const rows = useMemo(() => {
    return bookings
      .filter((b) => filter === "all" || b.status === filter)
      .filter((b) => {
        if (!search) return true;
        const c = customers.find((x) => x.id === b.customerId);
        return b.code.toLowerCase().includes(search.toLowerCase()) ||
          c?.name.includes(search) ||
          c?.phone.includes(search);
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [bookings, customers, filter, search]);

  return (
    <AppShell
      title="الحجوزات"
      subtitle={`${rows.length} حجز`}
      action={
        <button
          onClick={() => setOpenNew(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-90"
        >
          <Plus className="size-4" /> حجز جديد
        </button>
      }
    >
      <div className="glass-card rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الحجز، اسم أو جوال العميل..."
            className="w-full h-10 rounded-lg bg-muted/40 border border-border pr-10 pl-3 text-sm outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition",
                filter === f.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3 font-medium">أولوية</th>
                <th className="text-right p-3 font-medium">رقم الحجز</th>
                <th className="text-right p-3 font-medium">العميل</th>
                <th className="text-right p-3 font-medium">الخدمات (رقم الدور)</th>
                <th className="text-right p-3 font-medium">الموظف</th>
                <th className="text-right p-3 font-medium">التاريخ</th>
                <th className="text-right p-3 font-medium">المبلغ</th>
                <th className="text-right p-3 font-medium">الحالة</th>
                <th className="text-right p-3 font-medium">الدفع</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={10} className="p-12 text-center text-muted-foreground">لا توجد حجوزات مطابقة</td></tr>
              )}
              {rows.map((b, idx) => {
                const c = customers.find((x) => x.id === b.customerId);
                const st = staff.find((x) => x.id === b.staffId);
                const parts = b.code.split("-");
                return (
                  <tr key={b.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3">
                      <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-xs border border-primary/30">
                        {idx + 1}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px]">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-muted-foreground" title="رقم عام">{parts[0]}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-accent" title="رقم الفرع">{parts[1]}</span>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-primary font-bold" title="رقم اليوم">{parts[2]}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="font-semibold">{c?.name}</div>
                      <div className="text-xs text-muted-foreground">{c?.phone}</div>
                    </td>
                    <td className="p-3 max-w-[260px]">
                      <div className="flex flex-wrap gap-1">
                        {b.serviceIds.map((sid) => {
                          const svc = services.find((s) => s.id === sid);
                          const q = b.serviceQueue?.[sid];
                          return (
                            <span key={sid} className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px]">
                              <span className="font-bold text-primary">#{String(q ?? 0).padStart(3, "0")}</span>
                              <span>{svc?.name}</span>
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3">{st?.name}</td>
                    <td className="p-3 whitespace-nowrap">
                      <div>{formatDateShort(b.startsAt)}</div>
                      <div className="text-xs text-muted-foreground">{formatTime(b.startsAt)}</div>
                    </td>
                    <td className="p-3 font-bold">{formatSAR(b.price - b.discount)}</td>
                    <td className="p-3">
                      <span className={cn("text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap", STATUS_TONE[b.status])}>
                        {STATUS_LABEL[b.status]}
                      </span>
                    </td>
                    <td className="p-3 text-xs">{PAY_LABEL[b.payStatus]}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-end">
                        {b.status !== "completed" && b.status !== "cancelled" && (
                          <button
                            title="إتمام وإصدار فاتورة"
                            onClick={() => { actions.createInvoice(b.id, "mada"); toast.success("تم إصدار الفاتورة"); }}
                            className="size-8 rounded-lg border border-border hover:border-success/50 hover:text-success grid place-items-center"
                          >
                            <CheckCircle2 className="size-4" />
                          </button>
                        )}
                        {b.status !== "cancelled" && b.status !== "completed" && (
                          <button
                            title="إلغاء"
                            onClick={() => { actions.updateBooking(b.id, { status: "cancelled" }); toast.info("تم إلغاء الحجز"); }}
                            className="size-8 rounded-lg border border-border hover:border-destructive/50 hover:text-destructive grid place-items-center"
                          >
                            <X className="size-4" />
                          </button>
                        )}
                        <button
                          title="حذف"
                          onClick={() => { if (confirm("حذف الحجز؟")) { actions.removeBooking(b.id); toast.success("تم الحذف"); } }}
                          className="size-8 rounded-lg border border-border hover:border-destructive/50 hover:text-destructive grid place-items-center"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {openNew && <NewBookingDialog onClose={() => setOpenNew(false)} />}
    </AppShell>
  );
}

function NewBookingDialog({ onClose }: { onClose: () => void }) {
  const { customers, staff, services, bookings } = useSalon((s) => s);
  const settings = useBookingSettings((s) => s);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [staffId, setStaffId] = useState(staff[0]?.id ?? "");
  const today = new Date();
  const [date, setDate] = useState(today.toISOString().slice(0, 10));
  const [time, setTime] = useState<string>("");
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");

  const totals = useMemo(() => {
    const chosen = services.filter((s) => selectedServices.includes(s.id));
    const price = chosen.reduce((a, s) => a + s.price, 0);
    const serviceMin = chosen.reduce((a, s) => a + s.durationMin, 0);
    const durationMin = chosen.reduce((a, s) => a + serviceTotalMin(s), 0);
    return { price, durationMin, serviceMin };
  }, [selectedServices, services]);

  const toggle = (id: string) => setSelectedServices((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const slots = useMemo(() => {
    if (!staffId || totals.durationMin === 0) return [];
    return getDaySlots({ date, staffId, durationMin: totals.durationMin });
  }, [date, staffId, totals.durationMin]);

  const selectedSlot = slots.find((s) => s.time === time);
  const startsAt = selectedSlot?.startsAt ?? "";
  const conflict = useMemo(() => {
    if (selectedServices.length === 0 || !staffId || !startsAt) return null;
    return checkBookingConflict({ staffId, startsAt, durationMin: totals.durationMin });
  }, [staffId, startsAt, totals.durationMin, selectedServices.length]);

  const dayBookingsCount = useMemo(
    () => bookings.filter((b) => b.bookingDate === date && b.status !== "cancelled").length,
    [bookings, date],
  );
  const dayLimitReached = settings.maxDailyBookings > 0 && dayBookingsCount >= settings.maxDailyBookings;

  const submit = () => {
    if (selectedServices.length === 0) return toast.error("اختر خدمة واحدة على الأقل");
    let cid = customerId;
    if (newCustName && newCustPhone) {
      const c = actions.addCustomer({ name: newCustName, phone: newCustPhone, gender: "female" });
      cid = c.id;
    }
    if (!cid) return toast.error("اختر عميلاً");
    if (!time || !startsAt) return toast.error("اختر وقتاً متاحاً");
    if (conflict) return toast.error(conflict.message);
    if (dayLimitReached) return toast.error(`تم بلوغ الحد الأقصى للحجوزات اليومية (${settings.maxDailyBookings})`);
    const nb = actions.addBooking({
      customerId: cid,
      staffId,
      serviceIds: selectedServices,
      startsAt,
      durationMin: totals.durationMin,
      price: totals.price,
      discount,
      notes,
    });
    toast.success(`تم إنشاء الحجز ${nb.code}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur">
          <div>
            <h3 className="font-bold text-lg">حجز جديد</h3>
            <p className="text-xs text-muted-foreground mt-1">أدخل تفاصيل الحجز</p>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">العميل</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm">
              <option value="">-- اختر عميلاً --</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <input value={newCustName} onChange={(e) => setNewCustName(e.target.value)} placeholder="أو اسم عميل جديد" className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
              <input value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} placeholder="رقم الجوال" className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">الخدمات</label>
            <div className="grid grid-cols-2 gap-2">
              {services.filter((s) => s.active).map((s) => {
                const sel = selectedServices.includes(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => toggle(s.id)} className={cn(
                    "text-right p-3 rounded-lg border transition text-sm",
                    sel ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:bg-muted/40",
                  )}>
                    <div className="font-semibold">{s.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{formatSAR(s.price)} · {s.durationMin} دقيقة</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">الموظف</label>
              {(() => {
                const eligible = eligibleStaffFor(selectedServices, staff);
                return (
                  <>
                    <select
                      value={eligible.find((s) => s.id === staffId) ? staffId : ""}
                      onChange={(e) => { setStaffId(e.target.value); setTime(""); }}
                      className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm"
                      disabled={eligible.length === 0}
                    >
                      <option value="">-- اختر الموظف --</option>
                      {eligible.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
                    </select>
                    {selectedServices.length > 0 && eligible.length === 0 && (
                      <p className="text-[11px] text-warning mt-1">لا يوجد موظف مؤهل لجميع الخدمات المختارة.</p>
                    )}
                  </>
                );
              })()}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">الخصم</label>
              <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-muted-foreground mb-2 block">التاريخ</label>
              <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setTime(""); }} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">
              الأوقات المتاحة {selectedServices.length > 0 && `(مدة ${totals.durationMin} دقيقة)`}
            </label>
            {selectedServices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                اختر خدمة أولاً لعرض الأوقات المتاحة
              </div>
            ) : slots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                الصالون مغلق في هذا اليوم أو لا تتسع فتحات مناسبة
              </div>
            ) : (
              <SlotPicker slots={slots} selectedTime={time} onSelect={setTime} />
            )}
          </div>


          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">ملاحظات</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm" />
          </div>

          <div className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">المدة المحجوزة</div>
              <div className="font-bold">{totals.durationMin} دقيقة <span className="text-xs font-normal text-muted-foreground">(خدمة {totals.serviceMin} د)</span></div>
            </div>
            <div className="text-left">
              <div className="text-xs text-muted-foreground">الإجمالي</div>
              <div className="text-2xl font-bold gradient-text">{formatSAR(totals.price - discount)}</div>
            </div>
          </div>

          <div className={cn(
            "rounded-xl border p-3 text-xs flex items-center justify-between",
            dayLimitReached ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/5",
          )}>
            <span className="font-semibold">
              حجوزات هذا اليوم: {dayBookingsCount}
              {settings.maxDailyBookings > 0 && ` / ${settings.maxDailyBookings}`}
            </span>
            <span className="text-muted-foreground">الدور التالي: <b className="text-primary">#{String(dayBookingsCount + 1).padStart(4, "0")}</b></span>
          </div>

          {conflict && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 text-destructive p-3 flex items-start gap-2 text-sm">
              <AlertTriangle className="size-4 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">لا يمكن الحجز في هذا الوقت</div>
                <div className="text-xs mt-0.5 opacity-90">{conflict.message}</div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-card/95 backdrop-blur">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">إلغاء</button>
          <button
            onClick={submit}
            disabled={!!conflict || selectedServices.length === 0 || !time || dayLimitReached}
            className="px-6 h-10 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold shadow-[var(--shadow-glow)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            تأكيد الحجز
          </button>
        </div>
      </div>
    </div>
  );
}
