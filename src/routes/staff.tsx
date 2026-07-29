import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { useSalon, actions, formatSAR, type Staff } from "@/lib/salon-store";
import { useMemo, useState } from "react";
import { Plus, Phone, Trash2, X, Pencil, Star, StickyNote, Wallet, TrendingUp, Award, Minus, CalendarDays as CalendarDaysIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "الموظفون — لمسة" },
      { name: "description", content: "إدارة الموظفين والرواتب والبدلات والنقاط والملاحظات." },
      { property: "og:title", content: "الموظفون" },
      { property: "og:description", content: "إدارة الموظفين والعمولات والنقاط." },
    ],
  }),
  component: StaffPage,
});

type FormShape = {
  name: string;
  role: string;
  phone: string;
  email: string;
  hireDate: string;
  commissionPct: number;
  salary: number;
  active: boolean;
  gender: "female" | "male" | "";
  nationalId: string;
  birthDate: string;
  nationality: string;
  address: string;
  emergencyName: string;
  emergencyPhone: string;
  jobTitle: string;
  contractType: "full_time" | "part_time" | "contract";
  annualLeaveDays: number;
};

const emptyForm: FormShape = {
  name: "", role: "مصففة شعر", phone: "", email: "", hireDate: "",
  commissionPct: 20, salary: 0, active: true,
  gender: "female", nationalId: "", birthDate: "", nationality: "",
  address: "", emergencyName: "", emergencyPhone: "",
  jobTitle: "", contractType: "full_time", annualLeaveDays: 21,
};

function StaffPage() {
  const { staff, bookings, services } = useSalon((s) => s);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [form, setForm] = useState<FormShape>(emptyForm);

  const stats = useMemo(() => {
    const m = new Map<string, { count: number; revenue: number; upcoming: number }>();
    bookings.forEach((b) => {
      const cur = m.get(b.staffId) ?? { count: 0, revenue: 0, upcoming: 0 };
      if (b.status === "completed") {
        cur.count += 1;
        cur.revenue += b.price - b.discount;
      }
      if (["new", "confirmed", "checked_in", "in_progress"].includes(b.status)) cur.upcoming += 1;
      m.set(b.staffId, cur);
    });
    return m;
  }, [bookings]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (s: Staff) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      role: s.role,
      phone: s.phone,
      email: s.email ?? "",
      hireDate: s.hireDate ?? "",
      commissionPct: s.commissionPct,
      salary: s.salary ?? 0,
      active: s.active,
      gender: s.gender ?? "female",
      nationalId: s.nationalId ?? "",
      birthDate: s.birthDate ?? "",
      nationality: s.nationality ?? "",
      address: s.address ?? "",
      emergencyName: s.emergencyName ?? "",
      emergencyPhone: s.emergencyPhone ?? "",
      jobTitle: s.jobTitle ?? "",
      contractType: s.contractType ?? "full_time",
      annualLeaveDays: s.annualLeaveDays ?? 21,
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name || !form.phone) return toast.error("أكمل البيانات");
    if (!form.hireDate) return toast.error("تاريخ التعيين مطلوب لاحتساب الراتب");
    const patch = {
      name: form.name,
      role: form.role,
      phone: form.phone,
      email: form.email || undefined,
      hireDate: form.hireDate || undefined,
      commissionPct: form.commissionPct,
      salary: form.salary,
      active: form.active,
      gender: form.gender || undefined,
      nationalId: form.nationalId || undefined,
      birthDate: form.birthDate || undefined,
      nationality: form.nationality || undefined,
      address: form.address || undefined,
      emergencyName: form.emergencyName || undefined,
      emergencyPhone: form.emergencyPhone || undefined,
      jobTitle: form.jobTitle || undefined,
      contractType: form.contractType,
      annualLeaveDays: form.annualLeaveDays,
    };
    if (editingId) {
      actions.updateStaff(editingId, patch);
      toast.success("تم التحديث");
    } else {
      actions.addStaff({ ...patch, services: [], notes: [], allowances: [], points: 0, pointsLog: [], leaves: [] });
      toast.success("تمت الإضافة");
    }
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };


  const detail = detailId ? staff.find((s) => s.id === detailId) ?? null : null;

  return (
    <AppShell
      title="الموظفون"
      subtitle={`${staff.length} موظف`}
      action={
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
          <Plus className="size-4" /> موظف جديد
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((s) => {
          const st = stats.get(s.id) ?? { count: 0, revenue: 0, upcoming: 0 };
          const commission = (st.revenue * s.commissionPct) / 100;
          const allowancesTotal = (s.allowances ?? []).reduce((a, x) => a + x.amount, 0);
          const totalPay = (s.salary ?? 0) + allowancesTotal + commission;
          return (
            <div key={s.id} className="glass-card rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute -top-16 -left-16 size-40 rounded-full bg-gradient-to-br from-primary/20 to-accent/10 blur-3xl" />
              <div className="relative flex items-start gap-4">
                <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground text-xl font-bold shadow-[var(--shadow-glow)]">
                  {s.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-base">{s.name}</div>
                    <span className={cn("size-1.5 rounded-full", s.active ? "bg-success" : "bg-muted-foreground")} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.role}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                    <Phone className="size-3" /> {s.phone}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button onClick={() => openEdit(s)} className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary grid place-items-center" title="تعديل">
                    <Pencil className="size-4" />
                  </button>
                  <button onClick={() => { if (confirm("حذف الموظف؟")) { actions.removeStaff(s.id); toast.success("تم الحذف"); } }} className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive grid place-items-center" title="حذف">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <div className="relative mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-muted/30 border border-border px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">الراتب</div>
                  <div className="font-bold text-sm">{formatSAR(s.salary ?? 0)}</div>
                </div>
                <div className="rounded-lg bg-muted/30 border border-border px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">البدلات</div>
                  <div className="font-bold text-sm">{formatSAR(allowancesTotal)}</div>
                </div>
                <div className="rounded-lg bg-muted/30 border border-border px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">العمولة</div>
                  <div className="font-bold text-sm gradient-text">{formatSAR(commission)}</div>
                </div>
                <div className="rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">الإجمالي</div>
                  <div className="font-bold text-sm">{formatSAR(totalPay)}</div>
                </div>
              </div>

              <div className="relative mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-base font-bold">{st.count}</div>
                  <div className="text-[10px] text-muted-foreground">خدمة</div>
                </div>
                <div>
                  <div className="text-base font-bold">{st.upcoming}</div>
                  <div className="text-[10px] text-muted-foreground">قادمة</div>
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Star className="size-3.5 text-warning fill-warning" />
                  <div className="text-base font-bold">{s.points ?? 0}</div>
                </div>
              </div>

              <button
                onClick={() => setDetailId(s.id)}
                className="relative mt-4 w-full h-9 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <StickyNote className="size-3.5" /> الملف الكامل والملاحظات
              </button>
            </div>
          );
        })}
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

      {detail && (
        <DetailDialog
          staff={detail}
          onClose={() => setDetailId(null)}
          bookingsCount={stats.get(detail.id)?.count ?? 0}
          revenue={stats.get(detail.id)?.revenue ?? 0}
        />
      )}
    </AppShell>
  );
}

function EditDialog({ editing, form, setForm, onClose, onSubmit }: {
  editing: boolean;
  form: FormShape;
  setForm: (f: FormShape) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const set = <K extends keyof FormShape>(k: K, v: FormShape[K]) => setForm({ ...form, [k]: v });
  const inp = "w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm";
  const lbl = "text-xs font-semibold text-muted-foreground mb-2 block";
  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-lg">{editing ? "تعديل الموظف" : "موظف جديد"}</h3>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <section>
            <h4 className="text-xs font-bold text-primary mb-3">البيانات الشخصية</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>الاسم الكامل *</label><input value={form.name} onChange={(e) => set("name", e.target.value)} className={inp} /></div>
              <div><label className={lbl}>الجنس</label>
                <select value={form.gender} onChange={(e) => set("gender", e.target.value as any)} className={inp}>
                  <option value="female">أنثى</option><option value="male">ذكر</option>
                </select>
              </div>
              <div><label className={lbl}>الجوال *</label><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inp} /></div>
              <div><label className={lbl}>البريد الإلكتروني</label><input value={form.email} onChange={(e) => set("email", e.target.value)} className={inp} /></div>
              <div><label className={lbl}>رقم الهوية / الإقامة</label><input value={form.nationalId} onChange={(e) => set("nationalId", e.target.value)} className={inp} /></div>
              <div><label className={lbl}>تاريخ الميلاد</label><input type="date" value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} className={inp} /></div>
              <div><label className={lbl}>الجنسية</label><input value={form.nationality} onChange={(e) => set("nationality", e.target.value)} className={inp} /></div>
              <div><label className={lbl}>العنوان</label><input value={form.address} onChange={(e) => set("address", e.target.value)} className={inp} /></div>
              <div><label className={lbl}>جهة اتصال طوارئ</label><input value={form.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} className={inp} /></div>
              <div><label className={lbl}>جوال الطوارئ</label><input value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} className={inp} /></div>
            </div>
          </section>

          <section>
            <h4 className="text-xs font-bold text-primary mb-3">البيانات التعاقدية</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={lbl}>المسمى الوظيفي</label><input value={form.role} onChange={(e) => set("role", e.target.value)} className={inp} /></div>
              <div><label className={lbl}>المسمى التفصيلي</label><input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} className={inp} placeholder="مثال: كبير الأخصائيين" /></div>
              <div><label className={lbl}>نوع العقد</label>
                <select value={form.contractType} onChange={(e) => set("contractType", e.target.value as any)} className={inp}>
                  <option value="full_time">دوام كامل</option>
                  <option value="part_time">دوام جزئي</option>
                  <option value="contract">عقد مؤقت</option>
                </select>
              </div>
              <div><label className={lbl}>تاريخ التعيين *</label><input type="date" required value={form.hireDate} onChange={(e) => set("hireDate", e.target.value)} className={inp} /></div>
              <div><label className={lbl}>الراتب الأساسي</label><input type="number" value={form.salary} onChange={(e) => set("salary", Number(e.target.value))} className={inp} /></div>
              <div><label className={lbl}>نسبة العمولة %</label><input type="number" value={form.commissionPct} onChange={(e) => set("commissionPct", Number(e.target.value))} className={inp} /></div>
              <div><label className={lbl}>رصيد الإجازات السنوي (يوم)</label><input type="number" value={form.annualLeaveDays} onChange={(e) => set("annualLeaveDays", Number(e.target.value))} className={inp} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm mt-3">
              <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
              نشط
            </label>
          </section>
        </div>
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">إلغاء</button>
          <button onClick={onSubmit} className="px-6 h-10 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold">{editing ? "حفظ" : "إضافة"}</button>
        </div>
      </div>
    </div>
  );
}


function DetailDialog({ staff, bookingsCount, revenue, onClose }: {
  staff: Staff;
  bookingsCount: number;
  revenue: number;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "allowances" | "leaves" | "notes" | "points">("overview");
  const [leaveFrom, setLeaveFrom] = useState("");
  const [leaveTo, setLeaveTo] = useState("");
  const [leaveReason, setLeaveReason] = useState("");

  const [noteText, setNoteText] = useState("");
  const [allowLabel, setAllowLabel] = useState("");
  const [allowAmount, setAllowAmount] = useState(0);
  const [pointDelta, setPointDelta] = useState(5);
  const [pointReason, setPointReason] = useState("");

  const allowancesTotal = (staff.allowances ?? []).reduce((a, x) => a + x.amount, 0);
  const commission = (revenue * staff.commissionPct) / 100;
  const totalPay = (staff.salary ?? 0) + allowancesTotal + commission;

  const addNote = () => {
    if (!noteText.trim()) return;
    actions.addStaffNote(staff.id, noteText.trim());
    setNoteText("");
    toast.success("أُضيفت الملاحظة");
  };
  const addAllowance = () => {
    if (!allowLabel.trim() || !allowAmount) return toast.error("أكمل بيانات البدل");
    actions.addStaffAllowance(staff.id, allowLabel.trim(), allowAmount);
    setAllowLabel(""); setAllowAmount(0);
    toast.success("أُضيف البدل");
  };
  const givePoints = (sign: 1 | -1) => {
    if (!pointReason.trim()) return toast.error("اكتب السبب");
    actions.addStaffPoints(staff.id, sign * Math.abs(pointDelta), pointReason.trim());
    setPointReason("");
    toast.success(sign > 0 ? "تمت إضافة النقاط" : "تم خصم النقاط");
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-bold">
              {staff.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-lg">{staff.name}</h3>
              <p className="text-xs text-muted-foreground">{staff.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>

        <div className="px-5 pt-4 flex gap-1 border-b border-border">
          {([
            ["overview", "نظرة عامة", TrendingUp],
            ["allowances", "البدلات", Wallet],
            ["leaves", "الإجازات", CalendarDaysIcon],
            ["notes", "الملاحظات", StickyNote],
            ["points", "النقاط", Award],
          ] as const).map(([k, label, Icon]) => (

            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "px-3 h-9 rounded-t-lg text-xs font-semibold flex items-center gap-1.5 border-b-2 -mb-px",
                tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          {tab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="خدمات مكتملة" value={String(bookingsCount)} />
                <Stat label="الإيرادات" value={formatSAR(revenue)} />
                <Stat label="النقاط" value={String(staff.points ?? 0)} />
                <Stat label="الإجمالي الشهري" value={formatSAR(totalPay)} highlight />
              </div>
              <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
                <Row label="الراتب الأساسي" value={formatSAR(staff.salary ?? 0)} />
                <Row label="مجموع البدلات" value={formatSAR(allowancesTotal)} />
                <Row label={`العمولة (${staff.commissionPct}%)`} value={formatSAR(commission)} />
                <div className="border-t border-border my-2" />
                <Row label="الإجمالي" value={formatSAR(totalPay)} bold />
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div>الجوال: <span className="text-foreground">{staff.phone}</span></div>
                {staff.email && <div>البريد: <span className="text-foreground">{staff.email}</span></div>}
                {staff.hireDate && <div>تاريخ التعيين: <span className="text-foreground">{staff.hireDate}</span></div>}
                <div>الحالة: <span className="text-foreground">{staff.active ? "نشط" : "غير نشط"}</span></div>
              </div>
            </div>
          )}

          {tab === "allowances" && (
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_120px_auto] gap-2">
                <input placeholder="مسمى البدل (مواصلات، سكن...)" value={allowLabel} onChange={(e) => setAllowLabel(e.target.value)} className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                <input type="number" placeholder="المبلغ" value={allowAmount || ""} onChange={(e) => setAllowAmount(Number(e.target.value))} className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                <button onClick={addAllowance} className="px-4 h-10 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold">إضافة</button>
              </div>
              <div className="space-y-2">
                {(staff.allowances ?? []).length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">لا توجد بدلات</div>}
                {(staff.allowances ?? []).map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                    <div className="font-semibold text-sm">{a.label}</div>
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-sm">{formatSAR(a.amount)}</div>
                      <button onClick={() => { actions.removeStaffAllowance(staff.id, a.id); toast.success("حُذف"); }} className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive grid place-items-center"><Trash2 className="size-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "notes" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <textarea placeholder="اكتب ملاحظة عن الموظف..." value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2} className="flex-1 rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm resize-none" />
                <button onClick={addNote} className="px-4 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold">إضافة</button>
              </div>
              <div className="space-y-2">
                {(staff.notes ?? []).length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">لا توجد ملاحظات</div>}
                {(staff.notes ?? []).map((n) => (
                  <div key={n.id} className="rounded-lg border border-border bg-muted/20 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm flex-1 whitespace-pre-wrap">{n.text}</p>
                      <button onClick={() => actions.removeStaffNote(staff.id, n.id)} className="size-7 rounded-md hover:bg-destructive/10 hover:text-destructive grid place-items-center shrink-0"><Trash2 className="size-3.5" /></button>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-2">{new Date(n.at).toLocaleString("ar-SA")}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "points" && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 p-5 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Star className="size-6 text-warning fill-warning" />
                  <div className="text-4xl font-bold">{staff.points ?? 0}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">إجمالي النقاط</div>
              </div>
              <div className="rounded-xl border border-border p-3 space-y-2">
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <input type="number" value={pointDelta} onChange={(e) => setPointDelta(Number(e.target.value))} className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                  <input placeholder="السبب (أداء ممتاز، تأخير...)" value={pointReason} onChange={(e) => setPointReason(e.target.value)} className="h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => givePoints(1)} className="flex-1 h-10 rounded-lg bg-success/20 text-success hover:bg-success/30 text-sm font-semibold flex items-center justify-center gap-1"><Plus className="size-4" /> إضافة نقاط</button>
                  <button onClick={() => givePoints(-1)} className="flex-1 h-10 rounded-lg bg-destructive/20 text-destructive hover:bg-destructive/30 text-sm font-semibold flex items-center justify-center gap-1"><Minus className="size-4" /> خصم نقاط</button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">السجل</div>
                {(staff.pointsLog ?? []).length === 0 && <div className="text-center py-6 text-sm text-muted-foreground">لا يوجد سجل</div>}
                {(staff.pointsLog ?? []).map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                    <div>
                      <div className="text-sm">{l.reason}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(l.at).toLocaleString("ar-SA")}</div>
                    </div>
                    <div className={cn("text-sm font-bold", l.delta > 0 ? "text-success" : "text-destructive")}>
                      {l.delta > 0 ? "+" : ""}{l.delta}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-3", highlight ? "border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10" : "border-border bg-muted/20")}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("font-bold text-base mt-1", highlight && "gradient-text")}>{value}</div>
    </div>
  );
}
function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={cn(bold ? "font-bold" : "font-semibold")}>{value}</span>
    </div>
  );
}
