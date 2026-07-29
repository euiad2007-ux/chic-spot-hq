import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import {
  useSalon, actions, formatSAR, formatTime, formatDateShort,
  serviceTotalMin, eligibleStaffFor,
  STATUS_LABEL, STATUS_TONE, PAY_LABEL,
  type BookingStatus, type BookingPaymentMethod, type Customer, type Service,
} from "@/lib/salon-store";
import { findEarliestSlot, useBookingSettings, getBookingSettings } from "@/lib/booking-settings";
import { evalCoupon, couponActions } from "@/lib/coupon-store";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Trash2, CheckCircle2, X, AlertTriangle, Ticket, Wallet,
  UserPlus, Clock, Sparkles, CreditCard, Banknote, Smartphone, Hourglass,
} from "lucide-react";
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

const PAY_METHOD_OPTIONS: { id: BookingPaymentMethod; label: string; icon: any; kind: "cash" | "electronic" | "wallet" }[] = [
  { id: "cash", label: "نقداً", icon: Banknote, kind: "cash" },
  { id: "mada", label: "مدى", icon: CreditCard, kind: "electronic" },
  { id: "card", label: "بطاقة", icon: CreditCard, kind: "electronic" },
  { id: "apple_pay", label: "Apple Pay", icon: Smartphone, kind: "electronic" },
  { id: "google_pay", label: "Google Pay", icon: Smartphone, kind: "electronic" },
  { id: "wallet", label: "من محفظة العميل (يتطلب موافقة)", icon: Wallet, kind: "wallet" },
];

function BookingsPage() {
  const state = useSalon((s) => s);
  const { bookings, customers, staff, services } = state;
  const [filter, setFilter] = useState<BookingStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);

  // Auto-cancel expired hold bookings on mount + every minute
  useEffect(() => {
    actions.cancelExpiredHolds();
    const t = setInterval(() => actions.cancelExpiredHolds(), 60_000);
    return () => clearInterval(t);
  }, []);

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

      {rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center text-muted-foreground">لا توجد حجوزات مطابقة</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((b, idx) => {
            const c = customers.find((x) => x.id === b.customerId);
            const st = staff.find((x) => x.id === b.staffId);
            const parts = b.code.split("-");
            const needsApproval = b.paymentMethod === "wallet" && !b.walletApproved && b.status !== "cancelled" && b.status !== "completed";
            const isHold = b.paymentMethod === "hold" && b.status !== "cancelled" && b.status !== "completed";
            const total = b.price - b.discount;
            const canComplete = b.status !== "completed" && b.status !== "cancelled";

            return (
              <div key={b.id} className="glass-card rounded-2xl p-4 relative overflow-hidden group hover:shadow-[var(--shadow-glow)] transition">
                <div className="absolute -top-14 -left-14 size-40 rounded-full bg-primary/10 blur-3xl opacity-60" />
                <div className="relative">
                  {/* Header row: priority + status + code */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-primary-foreground font-bold text-xs shadow-[var(--shadow-glow)]">
                        {idx + 1}
                      </span>
                      <div className="font-mono text-[11px] leading-tight">
                        <span className="text-muted-foreground">{parts[0]}·{parts[1]}·</span>
                        <span className="text-primary font-black">{parts[2]}</span>
                      </div>
                    </div>
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full border whitespace-nowrap", STATUS_TONE[b.status])}>
                      {STATUS_LABEL[b.status]}
                    </span>
                  </div>

                  {/* Customer */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="size-9 rounded-full bg-primary/15 grid place-items-center text-primary font-bold text-sm flex-shrink-0">
                      {c?.name?.charAt(0) ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{c?.name ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground" dir="ltr">{c?.phone ?? ""}</div>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="mt-3 flex flex-wrap gap-1">
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

                  {/* Details */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="rounded-lg bg-muted/40 border border-border px-2.5 py-1.5">
                      <div className="text-muted-foreground text-[10px]">الموظف</div>
                      <div className="font-semibold truncate">{st?.name ?? "—"}</div>
                    </div>
                    <div className="rounded-lg bg-muted/40 border border-border px-2.5 py-1.5">
                      <div className="text-muted-foreground text-[10px] flex items-center gap-1"><Clock className="size-3" /> الوقت</div>
                      <div className="font-semibold whitespace-nowrap">{formatDateShort(b.startsAt)} · {formatTime(b.startsAt)}</div>
                    </div>
                  </div>

                  {/* Flags */}
                  {(needsApproval || isHold) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {needsApproval && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-warning/40 bg-warning/10 text-warning inline-flex items-center gap-1">
                          <Wallet className="size-3" /> بانتظار موافقة العميل
                        </span>
                      )}
                      {isHold && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-accent/40 bg-accent/10 text-accent inline-flex items-center gap-1">
                          <Hourglass className="size-3" /> حجز مؤقت
                        </span>
                      )}
                    </div>
                  )}

                  {/* Footer: total + actions */}
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
                    <div>
                      <div className="text-[10px] text-muted-foreground">{PAY_LABEL[b.payStatus]}</div>
                      <div className="text-lg font-bold gradient-text leading-tight">{formatSAR(total)}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {canComplete && (
                        <button
                          title="إتمام وإصدار فاتورة"
                          onClick={() => {
                            const method = (b.paymentMethod === "wallet" && b.walletApproved)
                              ? "cash"
                              : (b.paymentMethod && b.paymentMethod !== "hold" && b.paymentMethod !== "wallet")
                                ? b.paymentMethod as any
                                : "cash";
                            if (b.paymentMethod === "wallet" && !b.walletApproved) {
                              toast.error("لم يوافق العميل على الخصم من المحفظة بعد");
                              return;
                            }
                            const inv = actions.createInvoice(b.id, method);
                            if (inv && b.couponCode) couponActions.markUsed(b.couponCode);
                            toast.success("تم إصدار الفاتورة");
                          }}
                          className="size-9 rounded-lg border border-border hover:border-success/50 hover:text-success grid place-items-center transition"
                        >
                          <CheckCircle2 className="size-4" />
                        </button>
                      )}
                      {canComplete && (
                        <button
                          title="إلغاء"
                          onClick={() => { actions.updateBooking(b.id, { status: "cancelled" }); toast.info("تم إلغاء الحجز"); }}
                          className="size-9 rounded-lg border border-border hover:border-destructive/50 hover:text-destructive grid place-items-center transition"
                        >
                          <X className="size-4" />
                        </button>
                      )}
                      <button
                        title="حذف"
                        onClick={() => { if (confirm("حذف الحجز؟")) { actions.removeBooking(b.id); toast.success("تم الحذف"); } }}
                        className="size-9 rounded-lg border border-border hover:border-destructive/50 hover:text-destructive grid place-items-center transition"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {openNew && <NewBookingDialog onClose={() => setOpenNew(false)} />}
    </AppShell>
  );
}

/* ============================================================
 *  NEW BOOKING DIALOG (rewritten)
 *  - Customer search (booking#/name/phone/walletId) or new customer
 *  - Service picker: shows eligible staff, price, duration, earliest slot
 *  - Sequential scheduling per customer (next service starts after previous)
 *  - Payment: cash / electronic / wallet (approval) — single invoice
 * ============================================================ */
function NewBookingDialog({ onClose }: { onClose: () => void }) {
  const { customers, staff, services } = useSalon((s) => s);
  const settings = useBookingSettings((s) => s);

  // ==== Customer step ====
  const [custQuery, setCustQuery] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [newCust, setNewCust] = useState({ name: "", phone: "" });
  const [showNew, setShowNew] = useState(false);

  const custMatches = useMemo(() => {
    const q = custQuery.trim().toLowerCase();
    if (!q) return [] as Customer[];
    return customers.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.walletId ?? "").toLowerCase().includes(q) ||
      (c.email ?? "").toLowerCase().includes(q),
    ).slice(0, 6);
  }, [custQuery, customers]);

  const currentCustomer = customers.find((c) => c.id === customerId) ?? null;
  const walletAvailable = currentCustomer?.walletBalance ?? 0;

  // ==== Services picking ====
  // Selection order matters — sequential scheduling
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);
  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState<BookingPaymentMethod>("cash");
  const [notes, setNotes] = useState("");

  // ==== Compute earliest slot for each active service (over all eligible staff) ====
  const earliestByService = useMemo(() => {
    const map = new Map<string, ReturnType<typeof findEarliestSlot>>();
    for (const s of services) {
      if (!s.active) continue;
      const e = findEarliestSlot({
        serviceIds: [s.id],
        staffPool: staff,
        durationMin: serviceTotalMin(s),
        customerId: customerId || undefined,
      });
      map.set(s.id, e);
    }
    return map;
  }, [services, staff, customerId]);

  // ==== Compute a single combined staff + startsAt (all selected must share one staff — earliest common) ====
  const combined = useMemo(() => {
    if (selectedServices.length === 0) return null;
    const chosen = services.filter((s) => selectedServices.includes(s.id));
    const durationMin = chosen.reduce((a, s) => a + serviceTotalMin(s), 0);
    const price = chosen.reduce((a, s) => a + s.price, 0);
    const earliest = findEarliestSlot({
      serviceIds: selectedServices,
      staffPool: staff,
      durationMin,
      customerId: customerId || undefined,
    });
    return { durationMin, price, earliest, chosen };
  }, [selectedServices, services, staff, customerId]);

  const toggleService = (id: string) => {
    setSelectedServices((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const subtotalAfterManual = Math.max(0, (combined?.price ?? 0) - discount);
  const couponDiscount = useMemo(() => {
    if (!couponApplied) return 0;
    const r = evalCoupon(couponApplied.code, subtotalAfterManual);
    return r.ok ? r.discount : 0;
  }, [couponApplied, subtotalAfterManual]);
  const afterDiscounts = Math.max(0, subtotalAfterManual - couponDiscount);

  const applyCoupon = () => {
    const r = evalCoupon(couponInput, subtotalAfterManual);
    if (!r.ok || !r.coupon) return toast.error(r.error ?? "كود غير صالح");
    setCouponApplied({ code: r.coupon.code, discount: r.discount });
    toast.success(`تم تطبيق ${r.coupon.code} — خصم ${formatSAR(r.discount)}`);
  };
  const clearCoupon = () => { setCouponApplied(null); setCouponInput(""); };

  const eligibleStaffNames = (svc: Service) => staff.filter((st) => st.active && st.services.includes(svc.id)).map((s) => s.name);

  const submit = () => {
    let cid = customerId;
    if (showNew && newCust.name && newCust.phone) {
      const c = actions.addCustomer({ name: newCust.name.trim(), phone: newCust.phone.trim(), gender: "female" });
      cid = c.id;
    }
    if (!cid) return toast.error("اختر عميلاً أو أضف جديداً");
    if (selectedServices.length === 0) return toast.error("اختر خدمة واحدة على الأقل");
    if (!combined?.earliest) return toast.error("لا يوجد موظف/وقت متاح لهذه الخدمات");

    // Re-validate coupon at submit
    let finalCouponDiscount = 0;
    let finalCouponCode: string | undefined;
    if (couponApplied) {
      const r = evalCoupon(couponApplied.code, subtotalAfterManual);
      if (!r.ok || !r.coupon) return toast.error(r.error ?? "الكوبون لم يعد صالحاً");
      finalCouponDiscount = r.discount;
      finalCouponCode = r.coupon.code;
    }

    // Wallet payment via admin requires customer approval afterwards
    const needsApproval = payMethod === "wallet";

    const nb = actions.addBooking({
      customerId: cid,
      staffId: combined.earliest.staffId,
      serviceIds: selectedServices,
      startsAt: combined.earliest.startsAt,
      durationMin: combined.durationMin,
      price: combined.price,
      discount: discount + finalCouponDiscount,
      couponCode: finalCouponCode,
      couponDiscount: finalCouponDiscount || undefined,
      notes,
      paymentMethod: payMethod,
      walletApproved: false,
      walletApprovalRequestedAt: needsApproval ? new Date().toISOString() : undefined,
    });

    // If cash/electronic → issue invoice immediately (one invoice for all services)
    if (payMethod !== "wallet" && payMethod !== "hold") {
      const inv = actions.createInvoice(nb.id, payMethod as any);
      if (inv && finalCouponCode) couponActions.markUsed(finalCouponCode);
      toast.success(`تم إنشاء الحجز ${nb.code} وإصدار الفاتورة`);
    } else if (payMethod === "wallet") {
      toast.success(`تم إنشاء الحجز ${nb.code} — بانتظار موافقة العميل على الخصم من المحفظة`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col" onClick={onClose}>
      <div className="glass-card flex-1 w-full flex flex-col overflow-hidden rounded-none sm:m-3 sm:rounded-2xl sm:flex-none sm:h-[calc(100vh-1.5rem)]" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card/95 backdrop-blur shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center shrink-0">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-lg truncate">حجز جديد</h3>
              <p className="text-xs text-muted-foreground truncate">ابحث عن العميل، اختر الخدمات، وحدد طريقة الدفع</p>
            </div>
          </div>
          <button onClick={onClose} className="size-9 rounded-lg hover:bg-muted grid place-items-center shrink-0"><X className="size-4" /></button>
        </div>

        {/* Body: 2-column on desktop */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_380px] overflow-hidden">
          {/* LEFT — customer + services */}
          <div className="overflow-y-auto p-5 space-y-5 min-w-0">
            {/* CUSTOMER */}
            <section className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold flex items-center gap-2"><Search className="size-4 text-primary" /> بيانات العميل</div>
                <button onClick={() => { setShowNew((v) => !v); setCustomerId(""); }} className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1">
                  <UserPlus className="size-3.5" /> {showNew ? "بحث بعميل موجود" : "عميل جديد"}
                </button>
              </div>

              {!showNew ? (
                <>
                  <input
                    value={custQuery}
                    onChange={(e) => setCustQuery(e.target.value)}
                    placeholder="ابحث برقم الحجز، الاسم، الجوال، أو رقم المحفظة"
                    className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm"
                  />
                  {custQuery && (
                    <div className="rounded-lg border border-border divide-y divide-border max-h-56 overflow-y-auto">
                      {custMatches.length === 0 ? (
                        <div className="p-3 text-xs text-muted-foreground text-center">لا نتائج — <button className="text-primary hover:underline" onClick={() => { setShowNew(true); setNewCust({ name: custQuery, phone: "" }); }}>إضافة عميل جديد</button></div>
                      ) : custMatches.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setCustomerId(c.id); setCustQuery(""); }}
                          className={cn("w-full text-right p-2.5 hover:bg-muted/40 text-sm transition", customerId === c.id && "bg-primary/10")}
                        >
                          <div className="font-semibold">{c.name}</div>
                          <div className="text-[11px] text-muted-foreground flex gap-2 items-center">
                            <span dir="ltr">{c.phone}</span>
                            {c.walletId && <span className="font-mono">· {c.walletId}</span>}
                            <span>· رصيد {formatSAR(c.walletBalance ?? 0)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {currentCustomer && (
                    <div className="rounded-lg bg-primary/5 border border-primary/30 p-3 flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{currentCustomer.name}</div>
                        <div className="text-xs text-muted-foreground truncate" dir="ltr">{currentCustomer.phone}</div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-[10px] text-muted-foreground">رصيد المحفظة</div>
                        <div className="font-bold text-sm text-success">{formatSAR(walletAvailable)}</div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input value={newCust.name} onChange={(e) => setNewCust({ ...newCust, name: e.target.value })} placeholder="اسم العميل" className="h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                  <input value={newCust.phone} onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })} placeholder="رقم الجوال" dir="ltr" className="h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                  <p className="sm:col-span-2 text-[11px] text-muted-foreground">سيتم حفظ العميل تلقائياً في قائمة العملاء.</p>
                </div>
              )}
            </section>

            {/* SERVICES */}
            <section className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold flex items-center gap-2"><Sparkles className="size-4 text-primary" /> الخدمات المتاحة</div>
                <div className="text-[11px] text-muted-foreground">{selectedServices.length} مختارة</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {services.filter((s) => s.active).map((s) => {
                  const sel = selectedServices.includes(s.id);
                  const eligNames = eligibleStaffNames(s);
                  const earliest = earliestByService.get(s.id);
                  const total = serviceTotalMin(s);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      disabled={eligNames.length === 0}
                      className={cn(
                        "text-right p-3 rounded-xl border transition text-sm",
                        sel ? "border-primary bg-primary/10 shadow-[var(--shadow-glow)]" : "border-border bg-muted/20 hover:bg-muted/40",
                        eligNames.length === 0 && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold">{s.name}</div>
                        <div className="text-primary font-bold whitespace-nowrap">{formatSAR(s.price)}</div>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                        <Clock className="size-3" /> {total} دقيقة
                        <span className="text-muted-foreground/50">·</span>
                        <span>{s.category}</span>
                      </div>
                      <div className="mt-1.5 text-[11px]">
                        <span className="text-muted-foreground">المؤهلون: </span>
                        {eligNames.length === 0 ? <span className="text-destructive">لا يوجد</span> : <span className="text-foreground">{eligNames.join("، ")}</span>}
                      </div>
                      {earliest ? (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/10 text-success border border-success/30 px-2 py-0.5 text-[11px] font-semibold">
                          <CheckCircle2 className="size-3" /> {formatDateShort(earliest.startsAt)} — {formatTime(earliest.startsAt)} · {earliest.staffName}
                        </div>
                      ) : (
                        <div className="mt-2 text-[11px] text-warning">لا يوجد وقت متاح قريب</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* NOTES */}
            <section className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
              <label className="text-sm font-bold block">ملاحظات</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm" placeholder="أي ملاحظات إضافية..." />
            </section>
          </div>

          {/* RIGHT — summary sidebar */}
          <aside className="border-t lg:border-t-0 lg:border-r border-border bg-muted/20 overflow-y-auto p-5 space-y-4">
            {/* SCHEDULE */}
            {selectedServices.length > 0 && (
              <section className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="text-sm font-bold flex items-center gap-2"><Clock className="size-4 text-primary" /> جدولة الحجز</div>
                {combined?.earliest ? (
                  <>
                    <div className="text-sm">الأخصائية: <span className="font-bold">{combined.earliest.staffName}</span></div>
                    <div className="text-sm">
                      <div>الوقت: <span className="font-bold">{formatDateShort(combined.earliest.startsAt)} — {formatTime(combined.earliest.startsAt)}</span></div>
                      <div className="text-muted-foreground text-xs mt-0.5">مدة إجمالية {combined.durationMin} دقيقة</div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">يتم حجز هذا الوقت تلقائياً للطرفين.</p>
                  </>
                ) : (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 text-destructive p-2 text-xs flex items-start gap-2">
                    <AlertTriangle className="size-4 mt-0.5" />
                    لا يوجد موظف مشترك مؤهل لكل هذه الخدمات، أو لا يوجد وقت متاح.
                  </div>
                )}
              </section>
            )}

            {/* DISCOUNTS */}
            <section className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
              <div className="text-sm font-bold flex items-center gap-2"><Ticket className="size-4 text-primary" /> الخصومات</div>
              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">خصم يدوي</label>
                  <input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">كود كوبون</label>
                  {couponApplied ? (
                    <div className="flex items-center justify-between h-10 rounded-lg bg-primary/10 border border-primary/30 px-3 text-sm">
                      <span className="font-mono font-bold">{couponApplied.code}</span>
                      <button onClick={clearCoupon} className="text-xs text-destructive hover:underline">إزالة</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm font-mono uppercase" />
                      <button onClick={applyCoupon} className="px-3 h-10 rounded-lg border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/10">تطبيق</button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* PAYMENT */}
            <section className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
              <div className="text-sm font-bold flex items-center gap-2"><CreditCard className="size-4 text-primary" /> طريقة الدفع</div>
              <div className="grid grid-cols-2 gap-2">
                {PAY_METHOD_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const disabled = opt.id === "wallet" && (!currentCustomer || walletAvailable < afterDiscounts);
                  const active = payMethod === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setPayMethod(opt.id)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-2.5 text-xs font-semibold transition text-right",
                        active ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:bg-muted/40",
                        disabled && "opacity-40 cursor-not-allowed",
                      )}
                    >
                      <Icon className="size-4 text-primary shrink-0" />
                      <span className="flex-1 truncate">{opt.label}</span>
                      {active && <CheckCircle2 className="size-4 text-success shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {payMethod === "wallet" && (
                <div className="rounded-lg border border-warning/40 bg-warning/10 text-warning-foreground p-3 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="size-4 mt-0.5 text-warning shrink-0" />
                  <div>سيتم إنشاء الحجز بحالة "بانتظار موافقة العميل" لخصم المحفظة.</div>
                </div>
              )}
            </section>

            {/* TOTALS */}
            <section className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-accent/5 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">المجموع الفرعي</span>
                <span className="font-mono">{formatSAR(combined?.price ?? 0)}</span>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">خصم يدوي</span>
                  <span className="font-mono text-emerald-500">− {formatSAR(discount)}</span>
                </div>
              )}
              {couponDiscount > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">كوبون {couponApplied?.code}</span>
                  <span className="font-mono text-emerald-500">− {formatSAR(couponDiscount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">الإجمالي</span>
                <span className="text-2xl font-bold gradient-text">{formatSAR(afterDiscounts)}</span>
              </div>
            </section>
          </aside>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2 bg-card/95 backdrop-blur shrink-0">
          <div className="text-xs text-muted-foreground hidden sm:block">
            {selectedServices.length > 0 ? `${selectedServices.length} خدمة · ${combined?.durationMin ?? 0} دقيقة` : "اختر خدمة واحدة على الأقل"}
          </div>
          <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
            <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">إلغاء</button>
            <button
              onClick={submit}
              disabled={selectedServices.length === 0 || !combined?.earliest}
              className="px-6 h-10 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold shadow-[var(--shadow-glow)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              تأكيد الحجز
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Silence unused-import warnings in some code paths
void useBookingSettings;
void eligibleStaffFor;
