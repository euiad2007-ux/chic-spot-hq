import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import {
  useStaff,
  staffActions,
  SERVICE_CATALOG,
  findServiceById,
  totalSalary,
  EMPLOYMENT_LABELS,
  type Staff,
  type EmploymentType,
  type Gender,
} from "@/lib/staff-store";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Users2,
  Plus,
  Search,
  Trash2,
  X,
  Upload,
  UserCircle2,
  Briefcase,
  Wallet,
  Sparkles,
  Star,
  ChevronDown,
  Check,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "إدارة الموظفين — لمسة" },
      { name: "description", content: "إدارة كاملة لبيانات الموظفين: التوظيف والرواتب والاختصاصات ومؤشرات التقييم." },
      { property: "og:title", content: "إدارة الموظفين" },
      { property: "og:description", content: "بيانات شخصية، توظيف، رواتب وبدلات وعمولات، واختصاصات الصالون بتقييم لكل خدمة." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffPage,
});

/* -------- Helpers -------- */
function fmtSAR(n: number) {
  try {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${n} ر.س`;
  }
}

/* -------- Root Page -------- */
function StaffPage() {
  const staff = useStaff();
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.jobTitle.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        s.nationalId.includes(q),
    );
  }, [staff, query]);

  const handleCreate = () => {
    try {
      const rec = staffActions.create({ name: "موظفة جديدة", jobTitle: "أخصائية" });
      setEditingId(rec.id);
      toast.success("تمت إضافة موظفة جديدة");
    } catch (err) {
      console.error(err);
      toast.error("تعذّر إضافة الموظفة");
    }
  };

  const editing = editingId ? staff.find((s) => s.id === editingId) ?? null : null;

  return (
    <AppShell
      title="إدارة الموظفين"
      subtitle={`${staff.length} موظفة مسجّلة`}
      action={
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold shadow-[var(--shadow-glow)]"
        >
          <Plus className="size-4" /> إضافة موظفة
        </button>
      }
    >
      {/* Search */}
      <div className="glass-card rounded-2xl p-3 mb-5 flex items-center gap-2">
        <Search className="size-4 text-muted-foreground shrink-0 mr-1" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث بالاسم، الوظيفة، الجوال، الهوية…"
          className="flex-1 bg-transparent outline-none text-sm h-9"
        />
        {query && (
          <button onClick={() => setQuery("")} className="size-8 grid place-items-center rounded-lg hover:bg-muted">
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState onAdd={handleCreate} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <StaffCard key={s.id} staff={s} onEdit={() => setEditingId(s.id)} />
          ))}
        </div>
      )}

      {editing && <StaffEditor staff={editing} onClose={() => setEditingId(null)} />}
    </AppShell>
  );
}

/* -------- Empty state -------- */
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="glass-card rounded-2xl p-10 text-center">
      <div className="mx-auto size-14 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground shadow-[var(--shadow-glow)] mb-4">
        <Users2 className="size-7" />
      </div>
      <h3 className="text-lg font-bold">لا يوجد موظفون بعد</h3>
      <p className="text-sm text-muted-foreground mt-1">أضيفي أول موظفة لتتمكني من إدارة بياناتها واختصاصاتها.</p>
      <button
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold"
      >
        <Plus className="size-4" /> إضافة موظفة
      </button>
    </div>
  );
}

/* -------- Staff Card -------- */
function StaffCard({ staff: s, onEdit }: { staff: Staff; onEdit: () => void }) {
  const total = totalSalary(s);
  const top = s.specializations.slice(0, 3);
  return (
    <button
      onClick={onEdit}
      className="glass-card rounded-2xl p-4 text-right hover:border-primary/40 hover:shadow-[var(--shadow-glow)] transition group"
    >
      <div className="flex items-start gap-3">
        <div className="size-14 rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30 grid place-items-center shrink-0">
          {s.photoUrl ? (
            <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover" />
          ) : (
            <UserCircle2 className="size-8 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold truncate">{s.name || "بدون اسم"}</h3>
            {!s.active && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">موقوفة</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate">{s.jobTitle || "—"}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{EMPLOYMENT_LABELS[s.employmentType]}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 p-2">
          <div className="text-[10px] text-muted-foreground">الراتب الإجمالي</div>
          <div className="font-bold text-primary">{fmtSAR(total)}</div>
        </div>
        <div className="rounded-lg bg-muted/40 p-2">
          <div className="text-[10px] text-muted-foreground">العمولة</div>
          <div className="font-bold">{s.commissionPct}%</div>
        </div>
      </div>

      {top.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {top.map((sp) => {
            const svc = findServiceById(sp.id);
            if (!svc) return null;
            return (
              <span key={sp.id} className="inline-flex items-center gap-1 text-[11px] rounded-full bg-primary/10 text-primary px-2 py-0.5">
                {svc.label}
                <span className="opacity-80">· {sp.rating}★</span>
              </span>
            );
          })}
          {s.specializations.length > 3 && (
            <span className="text-[11px] text-muted-foreground">+{s.specializations.length - 3}</span>
          )}
        </div>
      )}
    </button>
  );
}

/* -------- Editor Drawer -------- */
type Tab = "personal" | "employment" | "compensation" | "skills";

function StaffEditor({ staff: s, onClose }: { staff: Staff; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("personal");

  const update = (patch: Partial<Staff>) => {
    try {
      staffActions.update(s.id, patch);
    } catch (err) {
      console.error(err);
      toast.error("تعذّر حفظ التغييرات");
    }
  };

  const handleDelete = () => {
    if (!confirm(`حذف الموظفة "${s.name || ""}"؟ لا يمكن التراجع.`)) return;
    try {
      staffActions.remove(s.id);
      toast.success("تم الحذف");
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("تعذّر الحذف");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex" dir="rtl">
      <button
        onClick={onClose}
        aria-label="إغلاق"
        className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-in fade-in"
      />
      <aside className="relative ml-auto w-full max-w-2xl bg-background border-l border-border shadow-2xl overflow-y-auto animate-in slide-in-from-left">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4 flex items-center gap-3">
          <div className="size-11 rounded-xl overflow-hidden bg-gradient-to-br from-primary/30 to-accent/30 grid place-items-center shrink-0">
            {s.photoUrl ? (
              <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserCircle2 className="size-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{s.name || "موظفة جديدة"}</div>
            <div className="text-xs text-muted-foreground truncate">{s.jobTitle || "—"}</div>
          </div>
          <button onClick={handleDelete} className="size-9 rounded-lg text-destructive hover:bg-destructive/10 grid place-items-center" title="حذف">
            <Trash2 className="size-4" />
          </button>
          <button onClick={onClose} className="size-9 rounded-lg hover:bg-muted grid place-items-center" title="إغلاق">
            <X className="size-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="p-4 border-b border-border">
          <div className="glass-card rounded-xl p-1 inline-flex gap-1 flex-wrap">
            {(
              [
                { id: "personal", label: "بيانات شخصية", icon: UserCircle2 },
                { id: "employment", label: "بيانات التوظيف", icon: Briefcase },
                { id: "compensation", label: "الراتب والبدلات", icon: Wallet },
                { id: "skills", label: "الاختصاصات", icon: Sparkles },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "inline-flex items-center gap-2 h-9 px-3 rounded-lg text-xs font-medium transition",
                    active
                      ? "bg-gradient-to-l from-primary/25 to-accent/15 text-foreground border border-primary/30"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {tab === "personal" && <PersonalTab s={s} update={update} />}
          {tab === "employment" && <EmploymentTab s={s} update={update} />}
          {tab === "compensation" && <CompensationTab s={s} update={update} />}
          {tab === "skills" && <SkillsTab s={s} />}
        </div>

        <div className="p-4 border-t border-border flex items-center gap-2 text-xs text-muted-foreground">
          <Save className="size-3.5 text-success" /> الحفظ تلقائي عند التعديل
        </div>
      </aside>
    </div>
  );
}

/* -------- Tabs -------- */
function PersonalTab({ s, update }: { s: Staff; update: (p: Partial<Staff>) => void }) {
  const photoInput = useRef<HTMLInputElement>(null);
  const onPhoto = (files: FileList | null) => {
    if (!files || !files[0]) return;
    const f = files[0];
    if (!f.type.startsWith("image/")) {
      toast.error("الرجاء اختيار صورة صالحة");
      return;
    }
    const r = new FileReader();
    r.onload = () => update({ photoUrl: String(r.result) });
    r.onerror = () => {
      console.error(r.error);
      toast.error("تعذّر قراءة الصورة");
    };
    r.readAsDataURL(f);
  };

  return (
    <section className="glass-card rounded-2xl p-5 space-y-4">
      <SectionTitle icon={UserCircle2} title="بيانات شخصية" />

      <div className="flex items-center gap-4">
        <div className="size-20 rounded-2xl overflow-hidden border border-border bg-muted/30 grid place-items-center">
          {s.photoUrl ? (
            <img src={s.photoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserCircle2 className="size-10 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => photoInput.current?.click()} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-xs hover:bg-muted">
            <Upload className="size-3.5" /> رفع صورة
          </button>
          {s.photoUrl && (
            <button onClick={() => update({ photoUrl: "" })} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg text-xs text-destructive hover:bg-destructive/10">
              <Trash2 className="size-3.5" /> حذف
            </button>
          )}
          <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => onPhoto(e.target.files)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="الاسم الكامل" value={s.name} onChange={(v) => update({ name: v })} />
        <Select
          label="الجنس"
          value={s.gender}
          onChange={(v) => update({ gender: v as Gender })}
          options={[
            { value: "female", label: "أنثى" },
            { value: "male", label: "ذكر" },
          ]}
        />
        <Field label="رقم الهوية / الإقامة" value={s.nationalId} onChange={(v) => update({ nationalId: v })} />
        <Field label="الجوال" value={s.phone} onChange={(v) => update({ phone: v })} type="tel" />
        <Field label="البريد الإلكتروني" value={s.email} onChange={(v) => update({ email: v })} type="email" className="md:col-span-2" />
        <Field label="تاريخ الميلاد" value={s.birthDate} onChange={(v) => update({ birthDate: v })} type="date" />
        <Field label="العنوان" value={s.address} onChange={(v) => update({ address: v })} />
      </div>
    </section>
  );
}

function EmploymentTab({ s, update }: { s: Staff; update: (p: Partial<Staff>) => void }) {
  return (
    <section className="glass-card rounded-2xl p-5 space-y-4">
      <SectionTitle icon={Briefcase} title="بيانات التوظيف" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="المسمى الوظيفي" value={s.jobTitle} onChange={(v) => update({ jobTitle: v })} />
        <Select
          label="نوع التوظيف"
          value={s.employmentType}
          onChange={(v) => update({ employmentType: v as EmploymentType })}
          options={[
            { value: "full_time", label: "دوام كامل" },
            { value: "part_time", label: "دوام جزئي" },
            { value: "contract", label: "عقد مؤقت" },
            { value: "trainee", label: "متدرّبة" },
          ]}
        />
        <Field label="تاريخ التعيين" value={s.hireDate} onChange={(v) => update({ hireDate: v })} type="date" />
        <Field label="الفرع" value={s.branch} onChange={(v) => update({ branch: v })} />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border p-3">
        <div>
          <div className="text-sm font-semibold">الحالة</div>
          <div className="text-xs text-muted-foreground">{s.active ? "موظفة نشطة" : "موقوفة عن العمل"}</div>
        </div>
        <button
          onClick={() => update({ active: !s.active })}
          className={cn(
            "h-9 px-4 rounded-lg text-xs font-semibold transition",
            s.active ? "bg-success/15 text-success border border-success/30" : "bg-muted text-muted-foreground border border-border",
          )}
        >
          {s.active ? "نشطة" : "موقوفة"}
        </button>
      </div>

      <div>
        <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">ملاحظات</label>
        <textarea
          value={s.notes}
          onChange={(e) => update({ notes: e.target.value })}
          rows={3}
          className="w-full rounded-lg bg-muted/40 border border-border p-3 text-sm outline-none focus:border-primary/50 resize-none"
        />
      </div>
    </section>
  );
}

function CompensationTab({ s, update }: { s: Staff; update: (p: Partial<Staff>) => void }) {
  const total = totalSalary(s);
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const addAllowance = () => {
    const label = newLabel.trim();
    const amount = Number(newAmount);
    if (!label) {
      toast.error("أدخلي اسم البدل");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("قيمة البدل غير صحيحة");
      return;
    }
    try {
      staffActions.addAllowance(s.id, { label, amount });
      setNewLabel("");
      setNewAmount("");
    } catch (err) {
      console.error(err);
      toast.error("تعذّرت الإضافة");
    }
  };

  return (
    <section className="glass-card rounded-2xl p-5 space-y-5">
      <SectionTitle icon={Wallet} title="الراتب والبدلات والعمولة" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <NumberField
          label="الراتب الأساسي (ر.س)"
          value={s.basicSalary}
          onChange={(v) => update({ basicSalary: v })}
          min={0}
        />
        <NumberField
          label="نسبة العمولة (%)"
          value={s.commissionPct}
          onChange={(v) => update({ commissionPct: Math.max(0, Math.min(100, v)) })}
          min={0}
          max={100}
          step={0.5}
        />
      </div>

      {/* Allowances */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2">البدلات</div>
        <div className="space-y-2">
          {s.allowances.length === 0 && (
            <div className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-3 text-center">
              لا توجد بدلات — أضيفي بدلاً من الأسفل
            </div>
          )}
          {s.allowances.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 p-2">
              <input
                value={a.label}
                onChange={(e) => staffActions.updateAllowance(s.id, a.id, { label: e.target.value })}
                className="flex-1 min-w-0 bg-transparent text-sm outline-none px-2"
                placeholder="اسم البدل"
              />
              <input
                type="number"
                inputMode="decimal"
                value={a.amount}
                onChange={(e) => staffActions.updateAllowance(s.id, a.id, { amount: Number(e.target.value) || 0 })}
                className="w-24 bg-background border border-border rounded-md h-8 px-2 text-sm outline-none focus:border-primary/50 text-left"
              />
              <span className="text-xs text-muted-foreground">ر.س</span>
              <button
                onClick={() => staffActions.removeAllowance(s.id, a.id)}
                className="size-8 rounded-md text-destructive hover:bg-destructive/10 grid place-items-center"
                title="حذف"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="بدل جديد (مثال: سكن)"
            className="flex-1 h-9 rounded-lg bg-muted/40 border border-border px-3 text-sm outline-none focus:border-primary/50"
          />
          <input
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            placeholder="القيمة"
            type="number"
            inputMode="decimal"
            className="w-28 h-9 rounded-lg bg-muted/40 border border-border px-3 text-sm outline-none focus:border-primary/50"
          />
          <button
            onClick={addAllowance}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-xs font-semibold"
          >
            <Plus className="size-3.5" /> إضافة
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl bg-gradient-to-l from-primary/10 to-accent/10 border border-primary/20 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">الراتب الأساسي</span>
          <span className="font-semibold">{fmtSAR(s.basicSalary)}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-muted-foreground">إجمالي البدلات</span>
          <span className="font-semibold">{fmtSAR(s.allowances.reduce((a, b) => a + (Number(b.amount) || 0), 0))}</span>
        </div>
        <div className="h-px bg-border my-2" />
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">الإجمالي الشهري</span>
          <span className="text-lg font-black text-primary">{fmtSAR(total)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
          <span>+ عمولة</span>
          <span>{s.commissionPct}% من المبيعات</span>
        </div>
      </div>
    </section>
  );
}

function SkillsTab({ s }: { s: Staff }) {
  const [open, setOpen] = useState(false);

  const availableCount = SERVICE_CATALOG.reduce(
    (n, cat) => n + cat.services.filter((svc) => !s.specializations.some((sp) => sp.id === svc.id)).length,
    0,
  );

  const addSpec = (id: string) => {
    try {
      staffActions.addSpecialization(s.id, id, 3);
    } catch (err) {
      console.error(err);
      toast.error("تعذّرت الإضافة");
    }
  };

  return (
    <section className="glass-card rounded-2xl p-5 space-y-4">
      <SectionTitle icon={Sparkles} title="اختصاصات الموظفة" />
      <p className="text-xs text-muted-foreground">
        أضيفي الخدمات التي تتقنها الموظفة من قائمة اختصاصات الصالون، وحدّدي مؤشر التقييم (من 1 إلى 5 نجوم) لكل خدمة.
      </p>

      {/* Add dropdown */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          disabled={availableCount === 0}
          className={cn(
            "w-full inline-flex items-center justify-between gap-2 h-10 px-4 rounded-lg border text-sm font-semibold transition",
            availableCount === 0
              ? "border-border bg-muted/40 text-muted-foreground cursor-not-allowed"
              : "border-primary/40 bg-gradient-to-l from-primary/10 to-accent/10 text-foreground hover:border-primary/60",
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="size-4" />
            {availableCount === 0 ? "تمت إضافة كل الاختصاصات" : `إضافة اختصاص (${availableCount} متاح)`}
          </span>
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>

        {open && availableCount > 0 && (
          <>
            <button className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-label="إغلاق القائمة" />
            <div className="absolute z-20 mt-2 right-0 left-0 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover shadow-2xl">
              {SERVICE_CATALOG.map((cat) => {
                const available = cat.services.filter((svc) => !s.specializations.some((sp) => sp.id === svc.id));
                if (available.length === 0) return null;
                return (
                  <div key={cat.id} className="py-1.5">
                    <div className="px-3 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{cat.label}</div>
                    {available.map((svc) => (
                      <button
                        key={svc.id}
                        onClick={() => {
                          addSpec(svc.id);
                        }}
                        className="w-full text-right px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                      >
                        <Plus className="size-3.5 text-primary" />
                        {svc.label}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Selected list */}
      <div className="space-y-2">
        {s.specializations.length === 0 ? (
          <div className="text-xs text-muted-foreground rounded-lg border border-dashed border-border p-4 text-center">
            لم تتم إضافة اختصاصات بعد
          </div>
        ) : (
          groupSpecializations(s.specializations).map(([catLabel, list]) => (
            <div key={catLabel} className="rounded-xl border border-border overflow-hidden">
              <div className="px-3 py-1.5 bg-muted/40 text-[11px] font-bold text-muted-foreground">{catLabel}</div>
              <div className="divide-y divide-border">
                {list.map(({ id, rating, label }) => (
                  <div key={id} className="flex items-center gap-3 p-3">
                    <Check className="size-4 text-success shrink-0" />
                    <div className="flex-1 min-w-0 text-sm font-medium truncate">{label}</div>
                    <RatingPicker value={rating} onChange={(v) => staffActions.updateSpecializationRating(s.id, id, v)} />
                    <button
                      onClick={() => staffActions.removeSpecialization(s.id, id)}
                      className="size-8 rounded-md text-destructive hover:bg-destructive/10 grid place-items-center shrink-0"
                      title="حذف"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function groupSpecializations(specs: Staff["specializations"]) {
  const map = new Map<string, { id: string; rating: number; label: string }[]>();
  for (const sp of specs) {
    const svc = findServiceById(sp.id);
    if (!svc) continue;
    const arr = map.get(svc.category) ?? [];
    arr.push({ id: sp.id, rating: sp.rating, label: svc.label });
    map.set(svc.category, arr);
  }
  return Array.from(map.entries());
}

/* -------- Small components -------- */
function SectionTitle({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="size-8 rounded-lg bg-primary/15 text-primary grid place-items-center">
        <Icon className="size-4" />
      </div>
      <h3 className="font-bold">{title}</h3>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  type?: string;
}) {
  return (
    <div className={className}>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm outline-none focus:border-primary/50"
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>
      <input
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm outline-none focus:border-primary/50"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm outline-none focus:border-primary/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function RatingPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-0.5" role="radiogroup" aria-label="التقييم">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        return (
          <button
            key={n}
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "size-7 grid place-items-center rounded-md transition",
              active ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500/60",
            )}
            title={`${n} من 5`}
          >
            <Star className={cn("size-4", active && "fill-current")} />
          </button>
        );
      })}
    </div>
  );
}
