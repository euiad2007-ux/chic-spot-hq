import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import {
  useSalon, actions, formatSAR, formatDate, LOYALTY_REDEEM_RATE, REFERRAL_COMMISSION_PCT, isValidWalletId,
  type Customer,
} from "@/lib/salon-store";
import { useMemo, useState } from "react";
import {
  Plus, Search, Phone, Trash2, X, MessageCircle, Pencil, Wallet, Star, Gift, Users2, Copy, Eye,
  CreditCard, Send,
} from "lucide-react";
import { toast } from "sonner";
import { useSiteSettings, waLink, fillTemplate } from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import { TopupRequestsPanel } from "@/components/salon/topup-requests";
import { redeemLoyaltyOnServer } from "@/lib/db/checkout-repo";



export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "العملاء — لمسة" },
      { name: "description", content: "قاعدة بيانات العملاء ومحفظتهم ونقاط الولاء والإحالات." },
      { property: "og:title", content: "العملاء" },
      { property: "og:description", content: "محفظة، نقاط ولاء، وتسويق بالإحالة." },
    ],
  }),
  component: CustomersPage,
});

type FormShape = {
  name: string;
  phone: string;
  email: string;
  gender: "female" | "male";
  birthDate: string;
  address: string;
  notes: string;
  referredBy: string;
};
const emptyForm: FormShape = {
  name: "", phone: "", email: "", gender: "female",
  birthDate: "", address: "", notes: "", referredBy: "",
};

function CustomersPage() {
  const customers = useSalon((s) => s.customers);
  const site = useSiteSettings();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState<FormShape>(emptyForm);

  const rows = useMemo(
    () => customers
      .filter((c) => !q || c.name.includes(q) || c.phone.includes(q) || (c.referralCode ?? "").includes(q.toUpperCase()))
      .sort((a, b) => b.totalSpent - a.totalSpent),
    [customers, q],
  );

  const openNew = () => { setEditingId(null); setForm(emptyForm); setOpen(true); };
  const openEdit = (c: Customer) => {
    setEditingId(c.id);
    setForm({
      name: c.name, phone: c.phone, email: c.email ?? "",
      gender: c.gender ?? "female", birthDate: c.birthDate ?? "",
      address: c.address ?? "", notes: c.notes ?? "", referredBy: c.referredBy ?? "",
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name || !form.phone) return toast.error("أكمل البيانات");
    const patch = {
      name: form.name, phone: form.phone,
      email: form.email || undefined,
      gender: form.gender,
      birthDate: form.birthDate || undefined,
      address: form.address || undefined,
      notes: form.notes || undefined,
      referredBy: form.referredBy.trim().toUpperCase() || undefined,
    };
    if (editingId) {
      actions.updateCustomer(editingId, patch);
      toast.success("تم التحديث");
    } else {
      actions.addCustomer(patch);
      toast.success("تمت الإضافة");
    }
    setOpen(false); setEditingId(null); setForm(emptyForm);
  };

  const detail = detailId ? customers.find((c) => c.id === detailId) ?? null : null;

  return (
    <AppShell
      title="العملاء"
      subtitle={`${customers.length} عميل`}
      action={
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
          <Plus className="size-4" /> عميل جديد
        </button>
      }
    >
      <div className="mb-4 space-y-4">
        <TopupRequestsPanel />
        <div className="glass-card rounded-2xl p-4">
          <div className="relative">
            <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم، الجوال، أو كود الإحالة" className="w-full h-10 rounded-lg bg-muted/40 border border-border pr-10 pl-3 text-sm" />
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((c) => (
          <div key={c.id} className="glass-card rounded-2xl p-4 group relative overflow-hidden">
            <div className="absolute -top-10 -left-10 size-32 rounded-full bg-gradient-to-br from-primary/10 to-accent/5 blur-3xl" />
            <div className="relative flex items-start gap-3">
              <div className="size-12 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 grid place-items-center font-bold text-lg">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{c.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Phone className="size-3" /> {c.phone}</div>
                <div className="text-[10px] text-muted-foreground mt-1 font-mono">{c.referralCode}</div>
              </div>
              <div className="flex flex-col gap-1">
                <a
                  href={waLink(c.phone, fillTemplate(site.waTemplatePromo, { name: c.name, salon: site.salonName }), site.waCountryCode)}
                  target="_blank" rel="noreferrer" title="واتساب"
                  className="size-8 rounded-lg hover:bg-success/10 text-success grid place-items-center"
                >
                  <MessageCircle className="size-4" />
                </a>
                <button onClick={() => openEdit(c)} title="تعديل" className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary grid place-items-center">
                  <Pencil className="size-4" />
                </button>
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/30 border border-border px-2 py-2 text-center">
                <div className="text-[9px] text-muted-foreground">زيارات</div>
                <div className="font-bold text-sm">{c.visits}</div>
              </div>
              <div className="rounded-lg bg-success/10 border border-success/30 px-2 py-2 text-center">
                <div className="text-[9px] text-muted-foreground">محفظة</div>
                <div className="font-bold text-sm text-success">{formatSAR(c.walletBalance ?? 0)}</div>
              </div>
              <div className="rounded-lg bg-warning/10 border border-warning/30 px-2 py-2 text-center">
                <div className="text-[9px] text-muted-foreground">نقاط</div>
                <div className="font-bold text-sm text-warning">{Math.round(c.loyaltyPoints ?? 0)}</div>
              </div>
            </div>

            <button
              onClick={() => setDetailId(c.id)}
              className="relative mt-3 w-full h-9 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Eye className="size-3.5" /> الملف الكامل
            </button>
          </div>
        ))}
        {rows.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">لا يوجد عملاء</div>}
      </div>

      {open && (
        <EditDialog
          editing={!!editingId}
          form={form}
          setForm={setForm}
          onClose={() => { setOpen(false); setEditingId(null); }}
          onSubmit={submit}
        />
      )}

      {detail && <DetailDialog customer={detail} onClose={() => setDetailId(null)} onEdit={() => { openEdit(detail); setDetailId(null); }} />}
    </AppShell>
  );
}

function EditDialog({ editing, form, setForm, onClose, onSubmit }: {
  editing: boolean; form: FormShape; setForm: (f: FormShape) => void;
  onClose: () => void; onSubmit: () => void;
}) {
  const set = <K extends keyof FormShape>(k: K, v: FormShape[K]) => setForm({ ...form, [k]: v });
  const inp = "w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm";
  const lbl = "text-xs font-semibold text-muted-foreground mb-2 block";
  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-lg">{editing ? "تعديل العميل" : "عميل جديد"}</h3>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>الاسم *</label><input value={form.name} onChange={(e) => set("name", e.target.value)} className={inp} /></div>
            <div><label className={lbl}>الجوال *</label><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inp} /></div>
            <div><label className={lbl}>البريد</label><input value={form.email} onChange={(e) => set("email", e.target.value)} className={inp} /></div>
            <div><label className={lbl}>الجنس</label>
              <select value={form.gender} onChange={(e) => set("gender", e.target.value as any)} className={inp}>
                <option value="female">أنثى</option><option value="male">ذكر</option>
              </select>
            </div>
            <div><label className={lbl}>تاريخ الميلاد</label><input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} className={inp} /></div>
            <div><label className={lbl}>كود من أحاله (اختياري)</label><input value={form.referredBy} onChange={(e) => set("referredBy", e.target.value.toUpperCase())} className={inp} placeholder="ABC1234" /></div>
            <div className="col-span-2"><label className={lbl}>العنوان</label><input value={form.address} onChange={(e) => set("address", e.target.value)} className={inp} /></div>
            <div className="col-span-2"><label className={lbl}>ملاحظات</label>
              <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm resize-none" />
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">إلغاء</button>
          <button onClick={onSubmit} className="px-6 h-10 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold">{editing ? "حفظ" : "إضافة"}</button>
        </div>
      </div>
    </div>
  );
}

function DetailDialog({ customer, onClose, onEdit }: { customer: Customer; onClose: () => void; onEdit: () => void }) {
  const { bookings, services, staff, invoices, customers } = useSalon((s) => s);
  const [tab, setTab] = useState<"overview" | "wallet" | "loyalty" | "referral" | "history">("overview");
  const [walletAmt, setWalletAmt] = useState(0);
  const [walletReason, setWalletReason] = useState("");
  const [redeemPts, setRedeemPts] = useState(0);
  // Card top-up (mock)
  const [cardAmt, setCardAmt] = useState(0);
  const [cardNum, setCardNum] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardName, setCardName] = useState("");
  // Peer transfer
  const [xferTo, setXferTo] = useState("");
  const [xferAmt, setXferAmt] = useState(0);
  const [xferNote, setXferNote] = useState("");


  const myBookings = bookings.filter((b) => b.customerId === customer.id).sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1));
  const myInvoices = invoices.filter((i) => i.customerId === customer.id).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const referred = customers.filter((c) => c.referredBy && customer.referralCode && c.referredBy === customer.referralCode);
  const referrer = customer.referredBy ? customers.find((c) => c.referralCode === customer.referredBy) : null;

  const doWallet = (sign: 1 | -1) => {
    if (!walletAmt || walletAmt <= 0) return toast.error("أدخل المبلغ");
    if (sign < 0 && walletAmt > (customer.walletBalance ?? 0)) return toast.error("الرصيد غير كافٍ");
    actions.walletAdjust(customer.id, sign * walletAmt, walletReason.trim() || (sign > 0 ? "شحن يدوي" : "خصم يدوي"));
    setWalletAmt(0); setWalletReason("");
    toast.success(sign > 0 ? "تم شحن المحفظة" : "تم الخصم");
  };
  const doRedeem = () => {
    if (!redeemPts || redeemPts <= 0) return toast.error("أدخل النقاط");
    if (redeemPts > Math.floor(customer.loyaltyPoints ?? 0)) return toast.error("النقاط غير كافية");
    void redeemLoyaltyOnServer(customer.id, redeemPts)
      .then((v) => {
        setRedeemPts(0);
        toast.success(`تم استبدال النقاط بـ ${formatSAR(v)} في المحفظة`);
      })
      .catch((e: Error) => toast.error(e.message));
  };

  const copyCode = () => {
    if (!customer.referralCode) return;
    navigator.clipboard.writeText(customer.referralCode);
    toast.success("تم النسخ");
  };
  const copyWalletId = () => {
    if (!customer.walletId) return;
    navigator.clipboard.writeText(customer.walletId);
    toast.success("تم نسخ رقم المحفظة");
  };
  const doTopupCard = () => {
    if (!cardAmt || cardAmt <= 0) return toast.error("أدخل المبلغ");
    const digits = cardNum.replace(/\s/g, "");
    if (!/^\d{12,19}$/.test(digits)) return toast.error("رقم البطاقة غير صحيح");
    if (!/^\d{2}\s*\/\s*\d{2}$/.test(cardExp)) return toast.error("تاريخ الانتهاء MM/YY");
    if (!/^\d{3,4}$/.test(cardCvv)) return toast.error("CVV غير صحيح");
    if (!cardName.trim()) return toast.error("أدخل اسم حامل البطاقة");
    const last4 = digits.slice(-4);
    actions.walletAdjust(customer.id, cardAmt, `شحن ببطاقة ****${last4}`);
    setCardAmt(0); setCardNum(""); setCardExp(""); setCardCvv(""); setCardName("");
    toast.success(`تم شحن ${formatSAR(cardAmt)} إلى المحفظة`);
  };
  const doTransfer = () => {
    if (!xferAmt || xferAmt <= 0) return toast.error("أدخل المبلغ");
    const target = xferTo.trim().toUpperCase();
    if (!isValidWalletId(target)) return toast.error("رقم المحفظة: حرفان + 10 أرقام");
    const r = actions.walletTransfer(customer.id, target, xferAmt, xferNote || undefined);
    if (!r.ok) return toast.error(r.error ?? "تعذر التحويل");
    setXferAmt(0); setXferTo(""); setXferNote("");
    toast.success("تم تحويل الرصيد بنجاح");
  };

  const del = () => {
    if (confirm(`حذف العميل ${customer.name}؟`)) {
      actions.removeCustomer(customer.id);
      toast.success("تم الحذف");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-bold">
              {customer.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-lg truncate">{customer.name}</h3>
              <p className="text-xs text-muted-foreground">{customer.phone} • مسجّل منذ {formatDate(customer.createdAt)}</p>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={onEdit} title="تعديل" className="size-9 rounded-lg hover:bg-primary/10 hover:text-primary grid place-items-center"><Pencil className="size-4" /></button>
            <button onClick={del} title="حذف" className="size-9 rounded-lg hover:bg-destructive/10 hover:text-destructive grid place-items-center"><Trash2 className="size-4" /></button>
            <button onClick={onClose} className="size-9 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
          </div>
        </div>

        <div className="px-5 pt-4 flex gap-1 border-b border-border overflow-x-auto">
          {([
            ["overview", "نظرة عامة", Eye],
            ["wallet", "المحفظة", Wallet],
            ["loyalty", "الولاء", Star],
            ["referral", "الإحالة", Gift],
            ["history", "الحجوزات", Users2],
          ] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)}
              className={cn(
                "px-3 h-9 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 border-b-2 -mb-px whitespace-nowrap",
                tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            ><Icon className="size-3.5" /> {label}</button>
          ))}
        </div>

        <div className="p-5 max-h-[65vh] overflow-y-auto space-y-4">
          {tab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniStat label="الزيارات" value={String(customer.visits)} />
                <MiniStat label="الإجمالي" value={formatSAR(customer.totalSpent)} />
                <MiniStat label="المحفظة" value={formatSAR(customer.walletBalance ?? 0)} tone="success" />
                <MiniStat label="نقاط الولاء" value={String(Math.round(customer.loyaltyPoints ?? 0))} tone="warning" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <Field2 label="الجوال" value={customer.phone} />
                {customer.email && <Field2 label="البريد" value={customer.email} />}
                {customer.gender && <Field2 label="الجنس" value={customer.gender === "female" ? "أنثى" : "ذكر"} />}
                {customer.birthDate && <Field2 label="تاريخ الميلاد" value={customer.birthDate} />}
                {customer.address && <Field2 label="العنوان" value={customer.address} />}
                <Field2 label="رقم المحفظة" value={customer.walletId ?? "—"} />
                <Field2 label="كود الإحالة" value={customer.referralCode ?? "—"} />

                {referrer && <Field2 label="أُحيل عبر" value={`${referrer.name} (${referrer.referralCode})`} />}
              </div>
              {customer.notes && (
                <div className="rounded-lg bg-muted/30 border border-border p-3 text-sm">
                  <div className="text-[11px] font-semibold text-muted-foreground mb-1">ملاحظات</div>
                  {customer.notes}
                </div>
              )}
            </div>
          )}

          {tab === "wallet" && (
            <div className="space-y-4">
              {/* Wallet ID card */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border border-primary/30 p-4 relative overflow-hidden">
                <div className="absolute -top-10 -left-10 size-32 rounded-full bg-primary/20 blur-3xl" />
                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">رقم المحفظة</div>
                    <div className="font-mono font-black text-2xl mt-1 tracking-wider">{customer.walletId ?? "—"}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">شاركيه لاستقبال تحويلات من الأصدقاء</div>
                  </div>
                  <button onClick={copyWalletId} className="size-10 rounded-xl border border-border bg-background/60 hover:bg-muted grid place-items-center" title="نسخ">
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-br from-success/10 to-emerald-500/10 border border-success/30 p-5 text-center">
                <div className="text-xs text-muted-foreground">الرصيد المتاح</div>
                <div className="text-4xl font-bold text-success mt-1">{formatSAR(customer.walletBalance ?? 0)}</div>
                <div className="text-[11px] text-muted-foreground mt-1">يمكن استخدامه في الحجوزات وشراء المنتجات</div>
              </div>

              {/* Top-up by credit card (mock) */}
              <div className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <CreditCard className="size-4 text-primary" /> شحن ببطاقة ائتمانية
                </div>
                <input
                  placeholder="اسم حامل البطاقة"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm"
                />
                <input
                  placeholder="رقم البطاقة (16 رقم)"
                  inputMode="numeric"
                  value={cardNum}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 19);
                    setCardNum(v.replace(/(\d{4})(?=\d)/g, "$1 ").trim());
                  }}
                  className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm font-mono tracking-wider"
                />
                <div className="grid grid-cols-3 gap-2">
                  <input
                    placeholder="MM/YY"
                    value={cardExp}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setCardExp(v.length > 2 ? `${v.slice(0, 2)}/${v.slice(2)}` : v);
                    }}
                    className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm font-mono"
                  />
                  <input
                    placeholder="CVV"
                    inputMode="numeric"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm font-mono"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="المبلغ"
                    value={cardAmt || ""}
                    onChange={(e) => setCardAmt(Number(e.target.value))}
                    className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm"
                  />
                </div>
                <button onClick={doTopupCard} className="w-full h-10 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2">
                  <CreditCard className="size-4" /> شحن الرصيد
                </button>
                <div className="text-[10px] text-muted-foreground text-center">
                  المدفوعات معالجة عبر بوابة الدفع الآمنة · لن تُخزَّن بيانات البطاقة.
                </div>
              </div>

              {/* Transfer to friend by wallet ID */}
              <div className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Send className="size-4 text-accent" /> تحويل إلى محفظة صديق
                </div>
                <input
                  placeholder="رقم المحفظة (حرفان + 10 أرقام)"
                  value={xferTo}
                  onChange={(e) => setXferTo(e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 12))}
                  className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm font-mono tracking-wider uppercase"
                />
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <input
                    type="number" min={1} placeholder="المبلغ"
                    value={xferAmt || ""}
                    onChange={(e) => setXferAmt(Number(e.target.value))}
                    className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm"
                  />
                  <input
                    placeholder="ملاحظة (اختياري)"
                    value={xferNote}
                    onChange={(e) => setXferNote(e.target.value)}
                    className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm"
                  />
                </div>
                <button onClick={doTransfer} className="w-full h-10 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 text-sm font-semibold flex items-center justify-center gap-2">
                  <Send className="size-4" /> تحويل
                </button>
              </div>

              {/* Manual adjust (admin) */}
              <div className="rounded-xl border border-border p-3 space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">تعديل يدوي (إداري)</div>
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <input type="number" placeholder="المبلغ" value={walletAmt || ""} onChange={(e) => setWalletAmt(Number(e.target.value))} className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                  <input placeholder="السبب" value={walletReason} onChange={(e) => setWalletReason(e.target.value)} className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => doWallet(1)} className="flex-1 h-10 rounded-lg bg-success/20 text-success hover:bg-success/30 text-sm font-semibold">+ شحن</button>
                  <button onClick={() => doWallet(-1)} className="flex-1 h-10 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 text-sm font-semibold">− خصم</button>
                </div>
              </div>

              <LogList items={customer.walletLog ?? []} format={(d) => formatSAR(Math.abs(d))} />
            </div>
          )}



          {tab === "loyalty" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-warning/10 to-amber-500/10 border border-warning/30 p-5 text-center">
                <div className="text-xs text-muted-foreground">نقاط الولاء</div>
                <div className="text-4xl font-bold text-warning mt-1">{Math.round(customer.loyaltyPoints ?? 0)}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  قابلة للاستبدال بـ {formatSAR(Math.floor(customer.loyaltyPoints ?? 0) * LOYALTY_REDEEM_RATE)}
                </div>
              </div>
              <div className="rounded-xl border border-border p-3 space-y-2">
                <div className="text-[11px] text-muted-foreground">استبدال النقاط برصيد محفظة</div>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input type="number" placeholder="عدد النقاط" value={redeemPts || ""} onChange={(e) => setRedeemPts(Number(e.target.value))} className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                  <button onClick={doRedeem} className="px-4 h-10 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold">استبدال</button>
                </div>
              </div>
              <LogList items={customer.loyaltyLog ?? []} format={(d) => `${d > 0 ? "+" : ""}${Math.round(d)} نقطة`} />
            </div>
          )}

          {tab === "referral" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/30 p-5">
                <div className="text-xs text-muted-foreground text-center">كود الإحالة الخاص بالعميلة</div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="text-3xl font-black font-mono gradient-text">{customer.referralCode}</div>
                  <button onClick={copyCode} className="size-9 rounded-lg border border-border hover:bg-muted grid place-items-center"><Copy className="size-4" /></button>
                </div>
                <div className="text-[11px] text-muted-foreground text-center mt-2">
                  تحصل على {REFERRAL_COMMISSION_PCT}% من كل فاتورة يدفعها من أحالتِهم
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MiniStat label="عدد المُحالين" value={String(referred.length)} />
                <MiniStat label="إجمالي أرباح الإحالة" value={formatSAR(customer.referralEarnings ?? 0)} tone="success" />
              </div>
              {referred.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">قائمة المُحالين</div>
                  {referred.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border bg-muted/20 p-3 flex justify-between text-sm">
                      <div>
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-[10px] text-muted-foreground">{r.phone} • {r.visits} زيارة</div>
                      </div>
                      <div className="text-sm font-bold">{formatSAR(r.totalSpent)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground">الحجوزات ({myBookings.length})</div>
              {myBookings.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">لا توجد حجوزات</div>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {myBookings.map((b) => {
                    const svc = b.serviceIds.map((id) => services.find((s) => s.id === id)?.name).filter(Boolean).join("، ");
                    const st = staff.find((s) => s.id === b.staffId);
                    return (
                      <div key={b.id} className="rounded-lg border border-border bg-muted/20 p-3 flex flex-wrap items-center gap-2 text-xs">
                        <div className="font-mono">{formatDate(b.startsAt)}</div>
                        <div className="flex-1 min-w-[140px] truncate">{svc}</div>
                        <div className="text-muted-foreground">{st?.name}</div>
                        <div className="font-bold">{formatSAR(b.price - b.discount)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              {myInvoices.length > 0 && (
                <>
                  <div className="text-xs font-semibold text-muted-foreground mt-4">الفواتير ({myInvoices.length})</div>
                  <div className="space-y-1.5">
                    {myInvoices.map((i) => (
                      <div key={i.id} className="rounded-lg border border-border bg-muted/20 p-3 flex justify-between text-xs">
                        <span className="font-mono">{i.number}</span>
                        <span className="text-muted-foreground">{formatDate(i.createdAt)}</span>
                        <span className="font-bold">{formatSAR(i.total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "success" | "warning" }) {
  const toneCls = tone === "success" ? "border-success/30 bg-success/5 text-success"
    : tone === "warning" ? "border-warning/30 bg-warning/5 text-warning"
    : "border-border bg-muted/20";
  return (
    <div className={cn("rounded-xl border p-3", toneCls)}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-bold text-base mt-1">{value}</div>
    </div>
  );
}
function Field2({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border/50 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-right truncate mr-2">{value}</span>
    </div>
  );
}
function LogList({ items, format }: { items: { id: string; delta: number; reason: string; at: string }[]; format: (d: number) => string }) {
  if (items.length === 0) return <div className="text-center text-sm text-muted-foreground py-6">لا يوجد سجل</div>;
  return (
    <div className="space-y-1.5 max-h-64 overflow-y-auto">
      {items.map((l) => (
        <div key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-2.5 text-xs">
          <div>
            <div className="font-semibold">{l.reason}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(l.at).toLocaleString("ar-SA")}</div>
          </div>
          <div className={cn("font-bold text-sm", l.delta > 0 ? "text-success" : "text-destructive")}>
            {l.delta > 0 ? "+" : "−"}{format(l.delta)}
          </div>
        </div>
      ))}
    </div>
  );
}
