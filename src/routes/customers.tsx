import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import {
  useCustomers,
  customerActions,
  customerStats,
  STATUS_LABELS,
  STATUS_STYLES,
  type Customer,
  type CustomerStatus,
  type CustomerGender,
} from "@/lib/customer-store";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Search,
  Trash2,
  X,
  Upload,
  UserCircle2,
  Wallet,
  BarChart3,
  IdCard,
  Save,
  ArrowUpCircle,
  ArrowDownCircle,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "إدارة العملاء — لمسة" },
      {
        name: "description",
        content: "قسم متكامل لإدارة العملاء: البيانات الشخصية، الإحصائيات، المحفظة، وحساب العميل.",
      },
      { property: "og:title", content: "إدارة العملاء" },
      {
        property: "og:description",
        content: "بيانات العميل، سجل الزيارات والمصروفات، محفظة إلكترونية ونقاط ولاء.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomersPage,
});

function fmtSAR(n: number) {
  try {
    return new Intl.NumberFormat("ar-SA", {
      style: "currency",
      currency: "SAR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n} ر.س`;
  }
}

function fmtDate(d: string | number) {
  if (!d) return "—";
  try {
    const dt = typeof d === "number" ? new Date(d) : new Date(d);
    return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(dt);
  } catch {
    return String(d);
  }
}

/* ============================================================
 * Root Page
 * ============================================================ */
function CustomersPage() {
  const customers = useCustomers();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CustomerStatus>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
      );
    });
  }, [customers, query, statusFilter]);

  const totals = useMemo(() => {
    let wallet = 0;
    let spent = 0;
    let visits = 0;
    let points = 0;
    for (const c of customers) {
      wallet += c.walletBalance;
      points += c.points;
      const st = customerStats(c);
      spent += st.totalSpent;
      visits += st.visitsCount;
    }
    return { wallet, spent, visits, points, count: customers.length };
  }, [customers]);

  const handleCreate = () => {
    try {
      const rec = customerActions.create({ name: "عميلة جديدة" });
      setEditingId(rec.id);
      toast.success("تمت إضافة عميلة جديدة");
    } catch (err) {
      console.error(err);
      toast.error("تعذّر إضافة العميلة");
    }
  };

  const editing = customers.find((c) => c.id === editingId) || null;

  return (
    <AppShell
      title="إدارة العملاء"
      subtitle="بيانات العميل، الإحصائيات، المحفظة، وحساب العميل"
      action={
        <button
          onClick={handleCreate}
          className="h-10 px-4 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-medium text-sm inline-flex items-center gap-2 shadow-[var(--shadow-glow)]"
        >
          <Plus className="size-4" />
          عميلة جديدة
        </button>
      }
    >
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <StatCard label="إجمالي العملاء" value={String(totals.count)} icon={Users} tone="primary" />
        <StatCard label="إجمالي الزيارات" value={String(totals.visits)} icon={BarChart3} tone="sky" />
        <StatCard label="مجموع المصروفات" value={fmtSAR(totals.spent)} icon={Sparkles} tone="emerald" />
        <StatCard label="أرصدة المحافظ" value={fmtSAR(totals.wallet)} icon={Wallet} tone="amber" />
        <StatCard label="نقاط الولاء" value={String(totals.points)} icon={IdCard} tone="rose" />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم أو الجوال أو رقم العميل…"
            className="w-full h-11 rounded-xl bg-card border border-border px-3 pr-10 text-sm outline-none focus:border-primary/60"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {(["all", "active", "vip", "inactive", "blocked"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={cn(
                "h-11 px-4 rounded-xl border text-xs font-medium whitespace-nowrap transition",
                statusFilter === k
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {k === "all" ? "الكل" : STATUS_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState onAdd={handleCreate} hasAny={customers.length > 0} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <CustomerCard key={c.id} c={c} onOpen={() => setEditingId(c.id)} />
          ))}
        </div>
      )}

      {/* Drawer */}
      {editing && (
        <CustomerDrawer
          key={editing.id}
          customer={editing}
          onClose={() => setEditingId(null)}
        />
      )}
    </AppShell>
  );
}

/* ============================================================
 * Stat Card
 * ============================================================ */
const TONE_STYLES: Record<string, string> = {
  primary: "from-primary/20 to-accent/10 text-primary",
  sky: "from-sky-500/20 to-sky-500/5 text-sky-600",
  emerald: "from-emerald-500/20 to-emerald-500/5 text-emerald-600",
  amber: "from-amber-500/20 to-amber-500/5 text-amber-600",
  rose: "from-rose-500/20 to-rose-500/5 text-rose-600",
};

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-border p-4 bg-gradient-to-bl", TONE_STYLES[tone])}>
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
        <Icon className="size-4 opacity-70" />
      </div>
      <div className="mt-2 text-xl font-bold text-foreground">{value}</div>
    </div>
  );
}

/* ============================================================
 * Empty state
 * ============================================================ */
function EmptyState({ onAdd, hasAny }: { onAdd: () => void; hasAny: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-10 text-center bg-card/40">
      <div className="mx-auto size-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
        <Users className="size-7 text-primary" />
      </div>
      <div className="font-bold text-lg mb-1">
        {hasAny ? "لا توجد نتائج مطابقة" : "لا يوجد عملاء بعد"}
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        {hasAny
          ? "جرّب تعديل البحث أو الفلاتر."
          : "ابدأ بإضافة أول عميلة لبناء قاعدة عملائك."}
      </p>
      {!hasAny && (
        <button
          onClick={onAdd}
          className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-medium text-sm inline-flex items-center gap-2"
        >
          <Plus className="size-4" />
          إضافة عميلة
        </button>
      )}
    </div>
  );
}

/* ============================================================
 * Customer Card
 * ============================================================ */
function CustomerCard({ c, onOpen }: { c: Customer; onOpen: () => void }) {
  const st = customerStats(c);
  return (
    <button
      onClick={onOpen}
      className="text-right rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-[var(--shadow-glow)] transition p-4 flex flex-col gap-3"
    >
      <div className="flex items-start gap-3">
        <div className="size-14 rounded-2xl bg-gradient-to-br from-primary/25 to-accent/15 overflow-hidden flex items-center justify-center shrink-0 border border-border">
          {c.photoUrl ? (
            <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserCircle2 className="size-8 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-bold truncate">{c.name || "بدون اسم"}</div>
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border font-medium",
                STATUS_STYLES[c.status],
              )}
            >
              {STATUS_LABELS[c.status]}
            </span>
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {c.code} • {c.phone || "بدون جوال"}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <MiniStat label="زيارات" value={String(st.visitsCount)} />
        <MiniStat label="مصروفات" value={fmtSAR(st.totalSpent)} />
        <MiniStat label="محفظة" value={fmtSAR(c.walletBalance)} />
      </div>
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-xs font-bold mt-0.5">{value}</div>
    </div>
  );
}

/* ============================================================
 * Drawer with tabs
 * ============================================================ */
type Tab = "personal" | "stats" | "wallet" | "account";

function CustomerDrawer({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("personal");

  const remove = () => {
    if (!confirm("هل أنت متأكد من حذف بيانات هذه العميلة؟")) return;
    try {
      customerActions.remove(customer.id);
      toast.success("تم حذف العميلة");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("تعذّر الحذف");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <button
        aria-label="إغلاق"
        onClick={onClose}
        className="flex-1 bg-black/40 backdrop-blur-sm"
      />
      <div className="w-full max-w-2xl bg-background border-l border-border flex flex-col shadow-2xl">
        {/* Header */}
        <div className="h-16 border-b border-border flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary/25 to-accent/15 overflow-hidden flex items-center justify-center border border-border">
              {customer.photoUrl ? (
                <img src={customer.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="size-6 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold truncate">{customer.name || "بدون اسم"}</div>
              <div className="text-[11px] text-muted-foreground truncate">
                {customer.code}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={remove}
              className="h-9 w-9 rounded-lg text-rose-500 hover:bg-rose-500/10 flex items-center justify-center"
              title="حذف"
            >
              <Trash2 className="size-4" />
            </button>
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center"
              title="إغلاق"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-2 flex gap-1 overflow-x-auto shrink-0">
          {(
            [
              { id: "personal", label: "البيانات", icon: UserCircle2 },
              { id: "stats", label: "الإحصائيات", icon: BarChart3 },
              { id: "wallet", label: "المحفظة", icon: Wallet },
              { id: "account", label: "الحساب", icon: IdCard },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 h-11 text-xs font-medium inline-flex items-center gap-1.5 border-b-2 transition whitespace-nowrap",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {tab === "personal" && <PersonalTab c={customer} />}
          {tab === "stats" && <StatsTab c={customer} />}
          {tab === "wallet" && <WalletTab c={customer} />}
          {tab === "account" && <AccountTab c={customer} />}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Personal Tab
 * ============================================================ */
function PersonalTab({ c }: { c: Customer }) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onPickPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      customerActions.update(c.id, { photoUrl: String(reader.result || "") });
    };
    reader.onerror = () => toast.error("تعذّر قراءة الصورة");
    reader.readAsDataURL(f);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="size-20 rounded-2xl bg-gradient-to-br from-primary/25 to-accent/15 overflow-hidden flex items-center justify-center border border-border">
          {c.photoUrl ? (
            <img src={c.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserCircle2 className="size-10 text-primary" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="h-9 px-3 rounded-lg bg-primary/10 text-primary text-xs font-medium inline-flex items-center gap-2 hover:bg-primary/20"
          >
            <Upload className="size-3.5" />
            رفع صورة
          </button>
          {c.photoUrl && (
            <button
              onClick={() => customerActions.update(c.id, { photoUrl: "" })}
              className="h-9 px-3 rounded-lg bg-muted text-muted-foreground text-xs hover:text-foreground"
            >
              إزالة الصورة
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickPhoto} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="الاسم">
          <input
            value={c.name}
            onChange={(e) => customerActions.update(c.id, { name: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="الجنس">
          <select
            value={c.gender}
            onChange={(e) => customerActions.update(c.id, { gender: e.target.value as CustomerGender })}
            className="input"
          >
            <option value="female">أنثى</option>
            <option value="male">ذكر</option>
          </select>
        </Field>
        <Field label="الجوال" icon={Phone}>
          <input
            value={c.phone}
            onChange={(e) => customerActions.update(c.id, { phone: e.target.value })}
            className="input"
            inputMode="tel"
            placeholder="05xxxxxxxx"
          />
        </Field>
        <Field label="البريد" icon={Mail}>
          <input
            value={c.email}
            onChange={(e) => customerActions.update(c.id, { email: e.target.value })}
            className="input"
            type="email"
          />
        </Field>
        <Field label="تاريخ الميلاد" icon={Calendar}>
          <input
            value={c.birthDate}
            onChange={(e) => customerActions.update(c.id, { birthDate: e.target.value })}
            className="input"
            type="date"
          />
        </Field>
        <Field label="العنوان" icon={MapPin}>
          <input
            value={c.address}
            onChange={(e) => customerActions.update(c.id, { address: e.target.value })}
            className="input"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="ملاحظات">
            <textarea
              value={c.notes}
              onChange={(e) => customerActions.update(c.id, { notes: e.target.value })}
              rows={3}
              className="input resize-none"
              placeholder="حساسية، تفضيلات، ملاحظات مهمة…"
            />
          </Field>
        </div>
      </div>

      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
        <Save className="size-3.5 text-emerald-500" />
        يتم الحفظ تلقائياً عند كل تعديل.
      </div>
    </div>
  );
}

/* ============================================================
 * Stats Tab
 * ============================================================ */
function StatsTab({ c }: { c: Customer }) {
  const st = customerStats(c);
  const [service, setService] = useState("");
  const [amount, setAmount] = useState("");
  const [staffName, setStaffName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const submit = () => {
    const amt = Number(amount);
    if (!service.trim() || !(amt >= 0)) {
      toast.error("أدخل الخدمة والمبلغ");
      return;
    }
    customerActions.addVisit(c.id, { date, service: service.trim(), amount: amt, staffName: staffName.trim(), note: note.trim() });
    setService("");
    setAmount("");
    setStaffName("");
    setNote("");
    toast.success("تمت إضافة الزيارة");
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="عدد الزيارات" value={String(st.visitsCount)} icon={BarChart3} tone="primary" />
        <StatCard label="إجمالي الإنفاق" value={fmtSAR(st.totalSpent)} icon={Sparkles} tone="emerald" />
        <StatCard label="متوسط الفاتورة" value={fmtSAR(st.avgTicket)} icon={IdCard} tone="sky" />
        <StatCard label="إنفاق آخر 30 يوم" value={fmtSAR(st.spent30)} icon={Sparkles} tone="amber" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-bold mb-3">إضافة زيارة</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="التاريخ">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
          </Field>
          <Field label="الخدمة">
            <input value={service} onChange={(e) => setService(e.target.value)} className="input" placeholder="قص شعر…" />
          </Field>
          <Field label="المبلغ (ر.س)">
            <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="input" />
          </Field>
          <Field label="الأخصائية">
            <input value={staffName} onChange={(e) => setStaffName(e.target.value)} className="input" placeholder="اسم الموظفة" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="ملاحظات">
              <input value={note} onChange={(e) => setNote(e.target.value)} className="input" />
            </Field>
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            onClick={submit}
            className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-2"
          >
            <Plus className="size-4" />
            إضافة
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="p-4 border-b border-border text-sm font-bold">سجل الزيارات ({c.visits.length})</div>
        {c.visits.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">لا يوجد زيارات بعد.</div>
        ) : (
          <div className="divide-y divide-border">
            {c.visits.map((v) => (
              <div key={v.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{v.service}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {fmtDate(v.date)} {v.staffName ? `• ${v.staffName}` : ""} {v.note ? `• ${v.note}` : ""}
                  </div>
                </div>
                <div className="text-sm font-bold text-emerald-600 shrink-0">{fmtSAR(v.amount)}</div>
                <button
                  onClick={() => customerActions.removeVisit(c.id, v.id)}
                  className="text-rose-500 hover:bg-rose-500/10 rounded-lg h-8 w-8 flex items-center justify-center"
                  title="حذف"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * Wallet Tab
 * ============================================================ */
function WalletTab({ c }: { c: Customer }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const doAction = (action: "topup" | "charge") => {
    const amt = Number(amount);
    if (!(amt > 0)) {
      toast.error("أدخل مبلغاً صحيحاً");
      return;
    }
    if (action === "topup") customerActions.walletTopup(c.id, amt, note.trim());
    else customerActions.walletCharge(c.id, amt, note.trim());
    setAmount("");
    setNote("");
    toast.success(action === "topup" ? "تم شحن المحفظة" : "تم الخصم من المحفظة");
  };

  const totals = useMemo(() => {
    let topups = 0;
    let charges = 0;
    for (const t of c.walletTx) {
      if (t.type === "topup" || t.type === "refund") topups += t.amount;
      else charges += t.amount;
    }
    return { topups, charges };
  }, [c.walletTx]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-gradient-to-bl from-primary/20 via-accent/10 to-transparent p-5">
        <div className="text-xs text-muted-foreground">الرصيد الحالي</div>
        <div className={cn("mt-1 text-3xl font-black", c.walletBalance < 0 ? "text-rose-600" : "text-foreground")}>
          {fmtSAR(c.walletBalance)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
            <div className="text-[11px] text-emerald-700">إجمالي الشحن</div>
            <div className="text-sm font-bold text-emerald-700">{fmtSAR(totals.topups)}</div>
          </div>
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3">
            <div className="text-[11px] text-rose-700">إجمالي الخصم</div>
            <div className="text-sm font-bold text-rose-700">{fmtSAR(totals.charges)}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-bold mb-3">عملية جديدة</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="المبلغ (ر.س)">
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
              placeholder="0"
            />
          </Field>
          <Field label="ملاحظة">
            <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="سبب الحركة" />
          </Field>
        </div>
        <div className="mt-3 flex flex-col sm:flex-row gap-2 justify-end">
          <button
            onClick={() => doAction("charge")}
            className="h-10 px-4 rounded-xl bg-rose-500/15 text-rose-600 border border-rose-500/30 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-rose-500/25"
          >
            <ArrowDownCircle className="size-4" />
            خصم
          </button>
          <button
            onClick={() => doAction("topup")}
            className="h-10 px-4 rounded-xl bg-emerald-500 text-white text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-emerald-600"
          >
            <ArrowUpCircle className="size-4" />
            شحن المحفظة
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="p-4 border-b border-border text-sm font-bold">سجل حركات المحفظة ({c.walletTx.length})</div>
        {c.walletTx.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">لا توجد حركات بعد.</div>
        ) : (
          <div className="divide-y divide-border">
            {c.walletTx.map((t) => {
              const positive = t.type === "topup" || t.type === "refund";
              return (
                <div key={t.id} className="p-3 flex items-center gap-3">
                  <div
                    className={cn(
                      "size-9 rounded-xl flex items-center justify-center shrink-0",
                      positive
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-rose-500/10 text-rose-600",
                    )}
                  >
                    {positive ? <ArrowUpCircle className="size-4" /> : <ArrowDownCircle className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">
                      {t.type === "topup" && "شحن رصيد"}
                      {t.type === "charge" && "خصم من الرصيد"}
                      {t.type === "refund" && "استرجاع"}
                      {t.type === "adjust" && "تسوية"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {fmtDate(t.at)} {t.note ? `• ${t.note}` : ""}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "text-sm font-bold shrink-0",
                      positive ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {positive ? "+" : "−"} {fmtSAR(t.amount)}
                  </div>
                  <button
                    onClick={() => customerActions.removeWalletTx(c.id, t.id)}
                    className="text-rose-500 hover:bg-rose-500/10 rounded-lg h-8 w-8 flex items-center justify-center"
                    title="حذف"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * Account Tab
 * ============================================================ */
function AccountTab({ c }: { c: Customer }) {
  const [tag, setTag] = useState("");
  const [pointsDelta, setPointsDelta] = useState("");

  const addTag = () => {
    const t = tag.trim();
    if (!t) return;
    if (c.tags.includes(t)) {
      toast.error("الوسم موجود");
      return;
    }
    customerActions.update(c.id, { tags: [...c.tags, t] });
    setTag("");
  };

  const removeTag = (t: string) => {
    customerActions.update(c.id, { tags: c.tags.filter((x) => x !== t) });
  };

  const adjustPoints = (sign: 1 | -1) => {
    const n = Number(pointsDelta);
    if (!(n > 0)) {
      toast.error("أدخل عدد نقاط صحيح");
      return;
    }
    customerActions.addPoints(c.id, sign * n);
    setPointsDelta("");
    toast.success(sign > 0 ? "تمت إضافة النقاط" : "تم خصم النقاط");
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="رقم العميل">
          <input
            value={c.code}
            onChange={(e) => customerActions.update(c.id, { code: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="الحالة">
          <select
            value={c.status}
            onChange={(e) => customerActions.update(c.id, { status: e.target.value as CustomerStatus })}
            className="input"
          >
            <option value="active">نشط</option>
            <option value="vip">VIP</option>
            <option value="inactive">غير نشط</option>
            <option value="blocked">محظور</option>
          </select>
        </Field>
        <Field label="تاريخ الانضمام">
          <input
            type="date"
            value={c.joinDate}
            onChange={(e) => customerActions.update(c.id, { joinDate: e.target.value })}
            className="input"
          />
        </Field>
        <Field label="الأقدمية">
          <div className="input flex items-center text-muted-foreground">
            {c.joinDate ? membershipDuration(c.joinDate) : "—"}
          </div>
        </Field>
      </div>

      {/* Tags */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-bold mb-3">الوسوم</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {c.tags.length === 0 && (
            <span className="text-xs text-muted-foreground">لا يوجد وسوم بعد.</span>
          )}
          {c.tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs border border-primary/20"
            >
              {t}
              <button onClick={() => removeTag(t)} className="hover:text-rose-500">
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            className="input flex-1"
            placeholder="أضف وسم (مثال: عروس، حساسية…)"
          />
          <button
            onClick={addTag}
            className="h-10 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium inline-flex items-center gap-1"
          >
            <Plus className="size-4" />
            إضافة
          </button>
        </div>
      </div>

      {/* Points */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-bold">نقاط الولاء</div>
          <div className="text-2xl font-black text-primary">{c.points}</div>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            value={pointsDelta}
            onChange={(e) => setPointsDelta(e.target.value)}
            className="input flex-1"
            placeholder="عدد النقاط"
          />
          <button
            onClick={() => adjustPoints(-1)}
            className="h-10 px-3 rounded-xl bg-rose-500/15 text-rose-600 border border-rose-500/30 text-sm font-medium"
          >
            خصم
          </button>
          <button
            onClick={() => adjustPoints(1)}
            className="h-10 px-3 rounded-xl bg-emerald-500 text-white text-sm font-medium"
          >
            إضافة
          </button>
        </div>
      </div>
    </div>
  );
}

function membershipDuration(joinDate: string): string {
  try {
    const start = new Date(joinDate);
    const now = new Date();
    const months =
      (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (months < 1) {
      const days = Math.max(0, Math.round((now.getTime() - start.getTime()) / 86400_000));
      return `${days} يوم`;
    }
    if (months < 12) return `${months} شهر`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem ? `${years} سنة و ${rem} شهر` : `${years} سنة`;
  } catch {
    return "—";
  }
}

/* ============================================================
 * Field
 * ============================================================ */
function Field({
  label,
  children,
  icon: Icon,
}: {
  label: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <label className="block">
      <div className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </div>
      {children}
    </label>
  );
}
