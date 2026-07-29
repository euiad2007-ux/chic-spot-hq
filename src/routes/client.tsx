import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { SlotPicker } from "@/components/salon/slot-picker";
import { useEffect, useMemo, useState } from "react";
import {
  useSalon, actions, formatSAR, formatDate,
  serviceTotalMin, eligibleStaffFor, isValidWalletId,
  LOYALTY_REDEEM_RATE,
} from "@/lib/salon-store";
import { useCoupons } from "@/lib/coupon-store";
import { checkBookingConflict, getDaySlots, findEarliestSlot, getBookingSettings } from "@/lib/booking-settings";
import { useSession, auth } from "@/lib/auth-store";
import {
  CalendarDays, Sparkles, Clock, LogOut, Plus, X, Scissors, Star,
  Receipt, Wallet, Gift, Ticket, Users, User, KeyRound, Copy, Send,
  CreditCard, ArrowUpRight, ArrowDownLeft, Check, ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BookingCalendar } from "@/components/salon/booking-calendar";

export const Route = createFileRoute("/client")({
  head: () => ({
    meta: [
      { title: "حسابي — صالون لمسة" },
      { name: "description", content: "لوحة العميلة: المحفظة، الولاء، الكوبونات، الحجوزات وإعدادات الحساب." },
    ],
  }),
  component: ClientPage,
});

type TabKey = "overview" | "wallet" | "loyalty" | "coupons" | "referral" | "bookings" | "calendar" | "account";

function ClientPage() {
  const session = useSession();
  const navigate = useNavigate();
  const { bookings, services, staff, customers, invoices } = useSalon((s) => s);
  const coupons = useCoupons();
  const [tab, setTab] = useState<TabKey>("overview");
  const [openBooking, setOpenBooking] = useState(false);

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
  const referredCount = customers.filter((c) => c.referredBy === me?.referralCode).length;
  const activeCoupons = coupons.filter((c) => {
    const now = Date.now();
    return c.active
      && new Date(c.activeFrom).getTime() <= now
      && new Date(c.expiresAt).getTime() >= now
      && (!c.usageLimit || c.usedCount < c.usageLimit);
  });

  if (!session || !me) return null;

  const tabs: { key: TabKey; label: string; icon: typeof Wallet }[] = [
    { key: "overview", label: "نظرة عامة", icon: Sparkles },
    { key: "calendar", label: "التقويم", icon: CalendarDays },
    { key: "wallet", label: "المحفظة", icon: Wallet },
    { key: "loyalty", label: "نقاط الولاء", icon: Gift },
    { key: "coupons", label: "الكوبونات", icon: Ticket },
    { key: "referral", label: "الإحالة", icon: Users },
    { key: "bookings", label: "حجوزاتي", icon: CalendarDays },
    { key: "account", label: "الحساب", icon: User },
  ];

  return (
    <div className="min-h-screen" dir="rtl">
      <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
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

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Hero */}
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute -top-16 -left-16 size-56 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute -bottom-16 -right-10 size-56 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative flex items-center gap-4 flex-wrap">
            <div className="size-16 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground text-2xl font-bold shadow-[var(--shadow-glow)]">
              {me.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-muted-foreground">مرحباً بعودتك</div>
              <div className="text-2xl font-bold">{me.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{me.phone}{me.email ? ` · ${me.email}` : ""}</div>
            </div>
            <button onClick={() => setOpenBooking(true)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
              <Plus className="size-4" /> حجز جديد
            </button>
          </div>
          <div className="relative mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStat label="رصيد المحفظة" value={formatSAR(me.walletBalance ?? 0)} icon={<Wallet className="size-4" />} />
            <MiniStat label="نقاط الولاء" value={String(me.loyaltyPoints ?? 0)} icon={<Gift className="size-4" />} />
            <MiniStat label="الزيارات" value={String(me.visits)} icon={<CalendarDays className="size-4" />} />
            <MiniStat label="أرباح الإحالة" value={formatSAR(me.referralEarnings ?? 0)} icon={<Users className="size-4" />} />
          </div>
        </div>

        {/* Tabs */}
        <div className="glass-card rounded-2xl p-1.5 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap",
                    active
                      ? "bg-gradient-to-l from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                  )}
                >
                  <Icon className="size-3.5" /> {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {tab === "overview" && <OverviewTab me={me} upcoming={upcoming} services={services} staff={staff} bookings={bookings} onNew={() => setOpenBooking(true)} />}
        {tab === "wallet" && <WalletTab me={me} />}
        {tab === "loyalty" && <LoyaltyTab me={me} />}
        {tab === "coupons" && <CouponsTab coupons={activeCoupons} />}
        {tab === "referral" && <ReferralTab me={me} referredCount={referredCount} />}
        {tab === "bookings" && <BookingsTab upcoming={upcoming} past={past} services={services} staff={staff} invoices={myInvoices} />}
        {tab === "calendar" && <BookingCalendar bookings={myBookings} services={services} staff={staff} customers={customers} variant="client" />}
        {tab === "account" && <AccountTab me={me} />}
      </main>

      {openBooking && <NewBookingModal onClose={() => setOpenBooking(false)} customerId={me.id} />}
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-background/60 border border-border px-4 py-3">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">{icon}<span>{label}</span></div>
      <div className="text-lg font-bold mt-1 gradient-text">{value}</div>
    </div>
  );
}

/* ==================== OVERVIEW ==================== */
function OverviewTab({ me, upcoming, services, staff, bookings, onNew }: any) {
  const pendingApprovals = (bookings ?? []).filter(
    (b: any) =>
      b.customerId === me.id &&
      b.paymentMethod === "wallet" &&
      !b.walletApproved &&
      b.status !== "cancelled" &&
      b.status !== "completed",
  );

  const approve = (b: any) => {
    const res = actions.approveWalletPayment(b.id);
    if (!res.ok) return toast.error(res.error ?? "تعذّر الاعتماد");
    // After approval, issue invoice from wallet immediately
    const inv = actions.createInvoice(b.id, "cash");
    if (inv) toast.success(`تم اعتماد الدفع وإصدار الفاتورة ${inv.number}`);
    else toast.success("تمت الموافقة على الخصم");
  };
  const reject = (b: any) => {
    actions.rejectWalletPayment(b.id);
    toast.info("تم رفض الخصم من المحفظة");
  };

  return (
    <div className="space-y-4">
      {pendingApprovals.length > 0 && (
        <section className="glass-card rounded-2xl p-5 border-2 border-warning/40 bg-warning/5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldCheck className="size-5 text-warning" /> طلبات اعتماد دفع من المحفظة
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            الصالون طلب خصم قيمة حجوزات التالية من محفظتك. يمكنك الموافقة أو الرفض.
          </p>
          <div className="mt-4 space-y-2">
            {pendingApprovals.map((b: any) => {
              const total = b.price - (b.discount ?? 0);
              const canAfford = (me.walletBalance ?? 0) >= total;
              return (
                <div key={b.id} className="rounded-xl border border-border bg-background/50 p-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono text-muted-foreground">{b.code}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {b.serviceIds.map((sid: string) => {
                        const svc = services.find((s: any) => s.id === sid);
                        return <span key={sid} className="text-[11px] rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5">{svc?.name}</span>;
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{formatDate(b.startsAt)}</div>
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-bold gradient-text">{formatSAR(total)}</div>
                    {!canAfford && <div className="text-[10px] text-destructive">الرصيد لا يكفي</div>}
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => approve(b)}
                      disabled={!canAfford}
                      className="flex-1 sm:flex-none h-9 px-4 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-xs font-bold inline-flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      <Check className="size-3.5" /> اعتماد
                    </button>
                    <button
                      onClick={() => reject(b)}
                      className="flex-1 sm:flex-none h-9 px-4 rounded-lg border border-destructive/40 text-destructive text-xs font-bold hover:bg-destructive/10"
                    >
                      رفض
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">حجوزاتك القادمة</h2>
              <button onClick={onNew} className="text-xs font-semibold text-primary hover:underline">+ حجز جديد</button>
            </div>
            {upcoming.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground text-sm">لا توجد حجوزات قادمة</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upcoming.slice(0, 4).map((b: any) => {
                  const st = staff.find((s: any) => s.id === b.staffId);
                  return (
                    <div key={b.id} className="glass-card rounded-2xl p-4">
                      <div className="text-[10px] font-mono text-muted-foreground tracking-wider">{b.code}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {b.serviceIds.map((sid: string) => {
                          const svc = services.find((s: any) => s.id === sid);
                          return <span key={sid} className="text-xs rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5">{svc?.name}</span>;
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">مع {st?.name} — {formatDate(b.startsAt)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
        <aside className="space-y-3">
          <div className="glass-card rounded-2xl p-5">
            <div className="text-xs text-muted-foreground">رقم محفظتك</div>
            <div className="mt-2 text-lg font-mono font-bold tracking-wider">{me.walletId}</div>
            <button
              onClick={() => { navigator.clipboard?.writeText(me.walletId ?? ""); toast.success("تم نسخ الرقم"); }}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-border text-xs hover:bg-muted"
            >
              <Copy className="size-3.5" /> نسخ
            </button>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <div className="text-xs text-muted-foreground">كود الإحالة</div>
            <div className="mt-2 text-lg font-mono font-bold tracking-wider gradient-text">{me.referralCode}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">شاركيه لتحصلي على عمولة من كل فاتورة</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ==================== WALLET ==================== */
function WalletTab({ me }: any) {
  const [topup, setTopup] = useState("");
  const [card, setCard] = useState({ num: "", exp: "", cvv: "" });
  const [xferTo, setXferTo] = useState("");
  const [xferAmt, setXferAmt] = useState("");
  const [xferNote, setXferNote] = useState("");

  const doTopUp = () => {
    const amt = Number(topup);
    if (!Number.isFinite(amt) || amt <= 0) return toast.error("أدخلي مبلغاً صحيحاً");
    const num = card.num.replace(/\s/g, "");
    if (!/^\d{15,19}$/.test(num)) return toast.error("رقم البطاقة غير صحيح");
    if (!/^\d{2}\/\d{2}$/.test(card.exp)) return toast.error("تاريخ الانتهاء MM/YY");
    if (!/^\d{3,4}$/.test(card.cvv)) return toast.error("CVV غير صحيح");
    actions.walletAdjust(me.id, amt, `شحن ببطاقة تنتهي بـ ${num.slice(-4)}`);
    setTopup(""); setCard({ num: "", exp: "", cvv: "" });
    toast.success(`تم شحن ${formatSAR(amt)}`);
  };

  const doTransfer = () => {
    const amt = Number(xferAmt);
    const res = actions.walletTransfer(me.id, xferTo, amt, xferNote);
    if (!res.ok) return toast.error(res.error ?? "فشل التحويل");
    setXferTo(""); setXferAmt(""); setXferNote("");
    toast.success("تم التحويل بنجاح");
  };

  const logs = me.walletLog ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">الرصيد الحالي</div>
            <div className="text-4xl font-bold gradient-text mt-1">{formatSAR(me.walletBalance ?? 0)}</div>
          </div>
          <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center">
            <Wallet className="size-7 text-primary-foreground" />
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-border">
          <div className="text-xs text-muted-foreground">رقم المحفظة</div>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 text-lg font-mono font-bold tracking-wider p-3 rounded-lg bg-muted/40 border border-border">{me.walletId}</div>
            <button onClick={() => { navigator.clipboard?.writeText(me.walletId ?? ""); toast.success("تم النسخ"); }} className="h-11 px-3 rounded-lg border border-border hover:bg-muted"><Copy className="size-4" /></button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-bold flex items-center gap-2"><CreditCard className="size-4 text-primary" /> شحن الرصيد ببطاقة</h3>
        <div className="mt-4 space-y-3">
          <input value={topup} onChange={(e) => setTopup(e.target.value)} type="number" placeholder="المبلغ (ريال)" className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
          <input value={card.num} onChange={(e) => setCard({ ...card, num: e.target.value.replace(/\D/g, "").slice(0, 19) })} placeholder="رقم البطاقة" className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm font-mono" />
          <div className="grid grid-cols-2 gap-3">
            <input value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value })} placeholder="MM/YY" className="h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm font-mono" />
            <input value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })} placeholder="CVV" className="h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm font-mono" />
          </div>
          <button onClick={doTopUp} className="w-full h-11 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2">
            <ShieldCheck className="size-4" /> شحن آمن
          </button>
          <p className="text-[10px] text-muted-foreground text-center">نموذج تجريبي. لا تُرسل بيانات فعلية.</p>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 lg:col-span-2">
        <h3 className="font-bold flex items-center gap-2"><Send className="size-4 text-primary" /> تحويل لصديقة</h3>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <input value={xferTo} onChange={(e) => setXferTo(e.target.value.toUpperCase())} placeholder="رقم المحفظة (AB1234567890)" className="md:col-span-2 h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm font-mono" />
          <input value={xferAmt} onChange={(e) => setXferAmt(e.target.value)} type="number" placeholder="المبلغ" className="h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
          <button onClick={doTransfer} className="h-11 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm">تحويل</button>
        </div>
        <input value={xferNote} onChange={(e) => setXferNote(e.target.value)} placeholder="ملاحظة (اختياري)" className="mt-3 w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
        {xferTo && !isValidWalletId(xferTo) && <p className="text-xs text-destructive mt-2">صيغة الرقم غير صحيحة (حرفان + 10 أرقام)</p>}
      </div>

      <div className="glass-card rounded-2xl p-6 lg:col-span-2">
        <h3 className="font-bold mb-3">سجل المحفظة</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد حركات بعد</p>
        ) : (
          <div className="divide-y divide-border">
            {logs.slice(0, 30).map((l: any) => (
              <div key={l.id} className="flex items-center justify-between py-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("size-9 rounded-lg grid place-items-center flex-shrink-0", l.delta >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive")}>
                    {l.delta >= 0 ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm truncate">{l.reason}</div>
                    <div className="text-[10px] text-muted-foreground">{formatDate(l.at)}</div>
                  </div>
                </div>
                <div className={cn("font-bold text-sm whitespace-nowrap", l.delta >= 0 ? "text-emerald-600" : "text-destructive")}>
                  {l.delta >= 0 ? "+" : ""}{formatSAR(l.delta)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== LOYALTY ==================== */
function LoyaltyTab({ me }: any) {
  const [pts, setPts] = useState("");
  const points = me.loyaltyPoints ?? 0;
  const redeem = () => {
    const n = Math.floor(Number(pts));
    if (!n || n <= 0) return toast.error("أدخلي عدد النقاط");
    if (n > points) return toast.error("النقاط المتاحة أقل");
    const val = actions.redeemLoyalty(me.id, n);
    setPts("");
    toast.success(`تم استبدال ${n} نقطة (${formatSAR(val)})`);
  };
  const logs = me.loyaltyLog ?? [];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">رصيدك من النقاط</div>
            <div className="text-4xl font-bold gradient-text mt-1">{points}</div>
            <div className="text-xs text-muted-foreground mt-1">تعادل {formatSAR(points * LOYALTY_REDEEM_RATE)}</div>
          </div>
          <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center">
            <Gift className="size-7 text-primary-foreground" />
          </div>
        </div>
        <div className="mt-5 pt-5 border-t border-border">
          <div className="text-xs font-semibold text-muted-foreground mb-2">استبدال نقاط برصيد محفظة</div>
          <div className="flex gap-2">
            <input value={pts} onChange={(e) => setPts(e.target.value)} type="number" placeholder="عدد النقاط" className="flex-1 h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
            <button onClick={redeem} className="h-11 px-5 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm">استبدال</button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">1 نقطة = {formatSAR(LOYALTY_REDEEM_RATE)} — تُضاف للمحفظة مباشرة</p>
        </div>
      </div>
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-bold mb-3">سجل النقاط</h3>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">لا توجد حركات</p>
        ) : (
          <div className="divide-y divide-border max-h-[380px] overflow-y-auto">
            {logs.slice(0, 40).map((l: any) => (
              <div key={l.id} className="flex items-center justify-between py-2.5 gap-3">
                <div className="min-w-0">
                  <div className="text-sm truncate">{l.reason}</div>
                  <div className="text-[10px] text-muted-foreground">{formatDate(l.at)}</div>
                </div>
                <div className={cn("font-bold text-sm", l.delta >= 0 ? "text-emerald-600" : "text-destructive")}>
                  {l.delta >= 0 ? "+" : ""}{l.delta}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================== COUPONS ==================== */
function CouponsTab({ coupons }: any) {
  if (coupons.length === 0) return <div className="glass-card rounded-2xl p-8 text-center text-muted-foreground">لا توجد كوبونات متاحة حالياً</div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {coupons.map((c: any) => (
        <div key={c.id} className="glass-card rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute -top-8 -left-8 size-24 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2">
              <Ticket className="size-4 text-primary" />
              <span className="text-[10px] text-muted-foreground">كوبون</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold gradient-text">{c.type === "percent" ? `${c.value}%` : formatSAR(c.value)}</span>
              <span className="text-xs text-muted-foreground">خصم</span>
            </div>
            {c.note && <div className="text-xs text-muted-foreground mt-1">{c.note}</div>}
            <div className="mt-3 p-2 rounded-lg bg-muted/40 border border-dashed border-primary/30 flex items-center justify-between">
              <span className="font-mono font-bold text-sm">{c.code}</span>
              <button onClick={() => { navigator.clipboard?.writeText(c.code); toast.success("تم النسخ"); }} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Copy className="size-3" /> نسخ</button>
            </div>
            <div className="mt-3 text-[10px] text-muted-foreground space-y-0.5">
              {c.minTotal ? <div>حد أدنى: {formatSAR(c.minTotal)}</div> : null}
              <div>ينتهي: {formatDate(c.expiresAt)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==================== REFERRAL ==================== */
function ReferralTab({ me, referredCount }: any) {
  const shareText = `انضمي إلى صالون لمسة! استخدمي كود الإحالة ${me.referralCode} للاستفادة من عروض حصرية.`;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="glass-card rounded-2xl p-6">
        <div className="text-xs text-muted-foreground">كود الإحالة الخاص بك</div>
        <div className="mt-2 text-3xl font-mono font-bold gradient-text tracking-widest">{me.referralCode}</div>
        <div className="mt-4 flex gap-2">
          <button onClick={() => { navigator.clipboard?.writeText(me.referralCode); toast.success("تم النسخ"); }} className="flex-1 h-10 rounded-lg border border-border text-sm hover:bg-muted inline-flex items-center justify-center gap-2"><Copy className="size-3.5" /> نسخ الكود</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer" className="flex-1 h-10 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2"><Send className="size-3.5" /> مشاركة</a>
        </div>
        <div className="mt-5 pt-5 border-t border-border grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/40 border border-border p-3 text-center">
            <div className="text-[10px] text-muted-foreground">مُحالات</div>
            <div className="text-2xl font-bold mt-1">{referredCount}</div>
          </div>
          <div className="rounded-xl bg-muted/40 border border-border p-3 text-center">
            <div className="text-[10px] text-muted-foreground">إجمالي الأرباح</div>
            <div className="text-2xl font-bold gradient-text mt-1">{formatSAR(me.referralEarnings ?? 0)}</div>
          </div>
        </div>
      </div>
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-bold flex items-center gap-2"><Star className="size-4 text-primary" /> كيف تعمل الإحالة؟</h3>
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex gap-3"><span className="size-6 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold flex-shrink-0">1</span> شاركي كود الإحالة مع صديقاتك.</li>
          <li className="flex gap-3"><span className="size-6 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold flex-shrink-0">2</span> تُدخله عند التسجيل في الصالون.</li>
          <li className="flex gap-3"><span className="size-6 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold flex-shrink-0">3</span> يُضاف لك رصيد تلقائياً عن كل فاتورة تدفعها.</li>
        </ol>
      </div>
    </div>
  );
}

/* ==================== BOOKINGS ==================== */
function BookingsTab({ upcoming, past, services, staff, invoices }: any) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-lg font-bold mb-3">القادمة</h3>
        {upcoming.length === 0 ? <div className="glass-card rounded-2xl p-6 text-center text-muted-foreground text-sm">لا حجوزات قادمة</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {upcoming.map((b: any) => {
              const st = staff.find((s: any) => s.id === b.staffId);
              return (
                <div key={b.id} className="glass-card rounded-2xl p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-muted-foreground">{b.code}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {b.serviceIds.map((sid: string) => {
                          const svc = services.find((s: any) => s.id === sid);
                          return <span key={sid} className="text-xs rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5">{svc?.name}</span>;
                        })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">مع {st?.name}</div>
                    </div>
                    <div className="inline-flex items-center rounded-lg bg-primary text-primary-foreground px-2 py-1 text-xs font-bold">#{String(b.dailyNo ?? 0).padStart(4, "0")}</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <div className="text-sm font-bold">{formatSAR(b.price - b.discount)}</div>
                    <button onClick={() => { if (confirm("إلغاء الحجز؟")) { actions.updateBooking(b.id, { status: "cancelled" }); toast.success("تم الإلغاء"); } }} className="text-xs text-destructive hover:underline">إلغاء</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {past.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3">سجل الزيارات</h3>
          <div className="glass-card rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="text-right py-3 px-4">التاريخ</th>
                  <th className="text-right py-3 px-4">الخدمة</th>
                  <th className="text-right py-3 px-4">الأخصائية</th>
                  <th className="text-right py-3 px-4">المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {past.map((b: any) => {
                  const svcs = b.serviceIds.map((id: string) => services.find((s: any) => s.id === id)?.name).filter(Boolean).join("، ");
                  const st = staff.find((s: any) => s.id === b.staffId);
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
      {invoices.length > 0 && (
        <section>
          <h3 className="text-lg font-bold mb-3 flex items-center gap-2"><Receipt className="size-4" /> فواتيرك</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {invoices.map((i: any) => (
              <div key={i.id} className="glass-card rounded-2xl p-4">
                <div className="text-xs font-mono text-muted-foreground">{i.number}</div>
                <div className="mt-2 text-2xl font-bold gradient-text">{formatSAR(i.total)}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{formatDate(i.createdAt)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ==================== ACCOUNT ==================== */
function AccountTab({ me }: any) {
  const [form, setForm] = useState({
    name: me.name ?? "",
    phone: me.phone ?? "",
    email: me.email ?? "",
    birthDate: me.birthDate ?? "",
    address: me.address ?? "",
  });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

  const saveProfile = () => {
    if (!form.name.trim()) return toast.error("الاسم مطلوب");
    if (!/^\d{9,15}$/.test(form.phone.replace(/\D/g, ""))) return toast.error("رقم الجوال غير صحيح");
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return toast.error("البريد غير صحيح");
    actions.updateCustomer(me.id, {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      birthDate: form.birthDate || undefined,
      address: form.address.trim() || undefined,
    });
    toast.success("تم حفظ البيانات");
  };

  const savePassword = () => {
    if (me.password && pw.current !== me.password) return toast.error("كلمة المرور الحالية غير صحيحة");
    if (pw.next.length < 6) return toast.error("6 أحرف على الأقل");
    if (pw.next !== pw.confirm) return toast.error("التأكيد لا يطابق");
    actions.updateCustomer(me.id, { password: pw.next });
    setPw({ current: "", next: "", confirm: "" });
    toast.success("تم تحديث كلمة المرور");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-bold flex items-center gap-2"><User className="size-4 text-primary" /> البيانات الشخصية</h3>
        <div className="mt-4 space-y-3">
          <Labeled label="الاسم"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" /></Labeled>
          <Labeled label="رقم الجوال"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" dir="ltr" /></Labeled>
          <Labeled label="البريد الإلكتروني"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" dir="ltr" /></Labeled>
          <Labeled label="تاريخ الميلاد"><input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" /></Labeled>
          <Labeled label="العنوان"><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" /></Labeled>
          <button onClick={saveProfile} className="w-full h-11 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2"><Check className="size-4" /> حفظ التغييرات</button>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="font-bold flex items-center gap-2"><KeyRound className="size-4 text-primary" /> كلمة المرور</h3>
        <div className="mt-4 space-y-3">
          {me.password && (
            <Labeled label="كلمة المرور الحالية"><input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" /></Labeled>
          )}
          <Labeled label={me.password ? "كلمة المرور الجديدة" : "كلمة المرور"}><input type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" /></Labeled>
          <Labeled label="تأكيد كلمة المرور"><input type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-sm" /></Labeled>
          <button onClick={savePassword} className="w-full h-11 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm">تحديث كلمة المرور</button>
          {!me.password && <p className="text-[11px] text-muted-foreground">لم يتم تعيين كلمة مرور بعد. الدخول حالياً يتم عبر رقم الجوال.</p>}
        </div>
      </div>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

/* ==================== NEW BOOKING MODAL ==================== */
function NewBookingModal({ onClose, customerId }: { onClose: () => void; customerId: string }) {
  const { services, staff, customers } = useSalon((s) => s);
  const me = customers.find((c) => c.id === customerId);
  const wallet = me?.walletBalance ?? 0;

  const [selected, setSelected] = useState<string[]>([]);
  const [pay, setPay] = useState<"cash" | "mada" | "card" | "apple_pay" | "google_pay" | "wallet" | "hold">("hold");

  const activeServices = services.filter((s) => s.active);

  const earliestByService = useMemo(() => {
    const m = new Map<string, ReturnType<typeof findEarliestSlot>>();
    for (const s of activeServices) {
      m.set(s.id, findEarliestSlot({
        serviceIds: [s.id], staffPool: staff, durationMin: serviceTotalMin(s), customerId,
      }));
    }
    return m;
  }, [activeServices, staff, customerId]);

  const combined = useMemo(() => {
    if (!selected.length) return null;
    const chosen = services.filter((s) => selected.includes(s.id));
    const durationMin = chosen.reduce((a, s) => a + serviceTotalMin(s), 0);
    const price = chosen.reduce((a, s) => a + s.price, 0);
    const earliest = findEarliestSlot({ serviceIds: selected, staffPool: staff, durationMin, customerId });
    return { durationMin, price, earliest, chosen };
  }, [selected, services, staff, customerId]);

  const toggle = (id: string) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const submit = () => {
    if (!combined?.earliest) return toast.error("لا يوجد وقت متاح");
    if (pay === "wallet" && wallet < combined.price) return toast.error("رصيد المحفظة لا يكفي");

    const settings = getBookingSettings();
    const graceMs = (settings.holdGraceMin ?? 5) * 60_000;
    const holdExpiresAt = pay === "hold"
      ? new Date(new Date(combined.earliest.startsAt).getTime() + graceMs).toISOString()
      : undefined;

    const nb = actions.addBooking({
      customerId,
      staffId: combined.earliest.staffId,
      serviceIds: selected,
      startsAt: combined.earliest.startsAt,
      durationMin: combined.durationMin,
      price: combined.price,
      discount: 0,
      paymentMethod: pay,
      walletApproved: pay === "wallet",
      walletUsed: pay === "wallet" ? combined.price : undefined,
      holdExpiresAt,
    });

    if (pay !== "hold") {
      const inv = actions.createInvoice(nb.id, (pay === "wallet" ? "cash" : pay) as any);
      if (inv) toast.success(`تم الحجز وإصدار الفاتورة ${nb.code}`);
    } else {
      toast.success(`تم حفظ الحجز ${nb.code} — سيُلغى تلقائياً بعد ${settings.holdGraceMin} دقيقة من موعده إن لم يُدفع`);
    }
    onClose();
  };

  const payOptions: { id: typeof pay; label: string; icon: any; disabled?: boolean }[] = [
    { id: "hold", label: "حفظ كحجز (بدون دفع)", icon: Clock },
    { id: "wallet", label: `المحفظة (${formatSAR(wallet)})`, icon: Wallet, disabled: !combined || wallet < (combined?.price ?? 0) },
    { id: "cash", label: "نقداً في الصالون", icon: Wallet },
    { id: "mada", label: "مدى", icon: CreditCard },
    { id: "card", label: "بطاقة", icon: CreditCard },
    { id: "apple_pay", label: "Apple Pay", icon: CreditCard },
    { id: "google_pay", label: "Google Pay", icon: CreditCard },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur z-10">
          <h3 className="font-bold text-lg flex items-center gap-2"><Sparkles className="size-5 text-primary" /> حجز جديد</h3>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="text-sm font-bold">اختاري الخدمات</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
            {activeServices.map((s) => {
              const eligibleNames = staff.filter((st) => st.active && st.services.includes(s.id)).map((x) => x.name);
              const earliest = earliestByService.get(s.id);
              const sel = selected.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={eligibleNames.length === 0}
                  onClick={() => toggle(s.id)}
                  className={cn(
                    "text-right p-3 rounded-xl border transition text-sm",
                    sel ? "border-primary bg-primary/10 shadow-[var(--shadow-glow)]" : "border-border bg-muted/20 hover:bg-muted/40",
                    eligibleNames.length === 0 && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold">{s.name}</div>
                    <div className="text-primary font-bold whitespace-nowrap">{formatSAR(s.price)}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                    <Clock className="size-3" /> {serviceTotalMin(s)} دقيقة
                  </div>
                  <div className="mt-1 text-[11px]">
                    <span className="text-muted-foreground">المؤهلون: </span>
                    {eligibleNames.length ? eligibleNames.join("، ") : <span className="text-destructive">لا يوجد</span>}
                  </div>
                  {earliest ? (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/10 text-success border border-success/30 px-2 py-0.5 text-[11px] font-semibold">
                      <Check className="size-3" /> أقرب وقت: {formatDate(earliest.startsAt)} · {earliest.staffName}
                    </div>
                  ) : (
                    <div className="mt-2 text-[11px] text-warning">لا يوجد وقت قريب</div>
                  )}
                </button>
              );
            })}
          </div>

          {combined?.earliest && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm space-y-1">
              <div>الأخصائية: <span className="font-bold">{combined.earliest.staffName}</span></div>
              <div>الوقت: <span className="font-bold">{formatDate(combined.earliest.startsAt)}</span></div>
              <div className="text-xs text-muted-foreground">المدة الإجمالية {combined.durationMin} دقيقة</div>
            </div>
          )}

          <div>
            <div className="text-sm font-bold mb-2">طريقة الدفع</div>
            <div className="grid grid-cols-2 gap-2">
              {payOptions.map((opt) => {
                const Icon = opt.icon;
                const active = pay === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={opt.disabled}
                    onClick={() => setPay(opt.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-3 text-xs font-semibold transition text-right",
                      active ? "border-primary bg-primary/10" : "border-border bg-muted/20 hover:bg-muted/40",
                      opt.disabled && "opacity-40 cursor-not-allowed",
                    )}
                  >
                    <Icon className="size-4 text-primary" />
                    <span className="flex-1">{opt.label}</span>
                    {active && <Check className="size-4 text-success" />}
                  </button>
                );
              })}
            </div>
            {pay === "hold" && (
              <p className="text-[11px] text-muted-foreground mt-2">سيُلغى الحجز تلقائياً بعد فترة السماح بعد موعده إن لم يتم الدفع.</p>
            )}
          </div>

          <div className="glass-card rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">الإجمالي</span>
            <span className="text-xl font-bold gradient-text">{formatSAR(combined?.price ?? 0)}</span>
          </div>
        </div>

        <div className="p-5 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-card/95 backdrop-blur">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">إلغاء</button>
          <button
            onClick={submit}
            disabled={!combined?.earliest}
            className="px-6 h-10 rounded-lg text-sm font-semibold text-primary-foreground bg-gradient-to-l from-primary to-accent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            تأكيد الحجز
          </button>
        </div>
      </div>
    </div>
  );
}
