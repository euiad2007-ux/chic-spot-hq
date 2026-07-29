import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { useCoupons, couponActions, type Coupon, type CouponType } from "@/lib/coupon-store";
import { useRewardsSettings, rewardsActions } from "@/lib/rewards-settings";
import { useMemo, useState } from "react";
import { Plus, Trash2, X, Pencil, Copy, Ticket, Percent, Tag, Gift, Users, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatSAR } from "@/lib/salon-store";

export const Route = createFileRoute("/coupons")({
  head: () => ({
    meta: [
      { title: "الكوبونات — لمسة" },
      { name: "description", content: "إدارة أكواد الخصم للفواتير والحجوزات." },
      { property: "og:title", content: "الكوبونات" },
      { property: "og:description", content: "خصومات ثابتة أو نسبية مع حدود استخدام وصلاحية." },
    ],
  }),
  component: CouponsPage,
});

type Form = {
  code: string;
  type: CouponType;
  value: number;
  minTotal: number;
  maxDiscount: number;
  activeFrom: string;
  expiresAt: string;
  usageLimit: number;
  active: boolean;
  note: string;
};

function todayISO(offsetDays = 0) {
  const d = new Date(); d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
const emptyForm: Form = {
  code: "", type: "percent", value: 10,
  minTotal: 0, maxDiscount: 0,
  activeFrom: todayISO(0), expiresAt: todayISO(30),
  usageLimit: 0, active: true, note: "",
};

function CouponsPage() {
  const coupons = useCoupons();
  const [openForm, setOpenForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);

  const rows = useMemo(
    () => [...coupons].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [coupons],
  );

  const openNew = () => { setEditingId(null); setForm(emptyForm); setOpenForm(true); };
  const openEdit = (c: Coupon) => {
    setEditingId(c.id);
    setForm({
      code: c.code, type: c.type, value: c.value,
      minTotal: c.minTotal ?? 0, maxDiscount: c.maxDiscount ?? 0,
      activeFrom: c.activeFrom.slice(0, 10), expiresAt: c.expiresAt.slice(0, 10),
      usageLimit: c.usageLimit ?? 0, active: c.active, note: c.note ?? "",
    });
    setOpenForm(true);
  };

  const submit = () => {
    const code = form.code.trim().toUpperCase();
    if (!code) return toast.error("أدخل كود الخصم");
    if (!Number.isFinite(form.value) || form.value <= 0) return toast.error("قيمة غير صحيحة");
    if (form.type === "percent" && form.value > 100) return toast.error("النسبة يجب ألا تتجاوز 100%");
    if (new Date(form.expiresAt) < new Date(form.activeFrom)) return toast.error("تاريخ الانتهاء قبل تاريخ التفعيل");
    const payload = {
      code, type: form.type, value: form.value,
      minTotal: form.minTotal || undefined,
      maxDiscount: form.type === "percent" && form.maxDiscount ? form.maxDiscount : undefined,
      activeFrom: new Date(form.activeFrom).toISOString(),
      expiresAt: new Date(form.expiresAt + "T23:59:59").toISOString(),
      usageLimit: form.usageLimit || undefined,
      active: form.active, note: form.note.trim() || undefined,
    };
    try {
      if (editingId) { couponActions.update(editingId, payload); toast.success("تم تحديث الكوبون"); }
      else { couponActions.add(payload); toast.success("تم إنشاء الكوبون"); }
      setOpenForm(false); setEditingId(null); setForm(emptyForm);
    } catch (e: any) { toast.error(e?.message ?? "تعذر الحفظ"); }
  };

  const del = (c: Coupon) => {
    if (!confirm(`حذف الكوبون ${c.code}؟`)) return;
    couponActions.remove(c.id); toast.success("تم الحذف");
  };
  const copy = (code: string) => { navigator.clipboard.writeText(code); toast.success("تم نسخ الكود"); };

  return (
    <AppShell
      title="الكوبونات"
      subtitle={`${rows.length} كوبون · ${rows.filter((c) => c.active).length} فعّال`}
      action={
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
          <Plus className="size-4" /> كوبون جديد
        </button>
      }
    >
      <RewardsPanel />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

        {rows.map((c) => {
          const now = Date.now();
          const expired = new Date(c.expiresAt).getTime() < now;
          const notStarted = new Date(c.activeFrom).getTime() > now;
          const exhausted = c.usageLimit ? c.usedCount >= c.usageLimit : false;
          const status =
            !c.active ? { label: "متوقّف", cls: "border-border bg-muted/30 text-muted-foreground" }
            : expired ? { label: "منتهي", cls: "border-destructive/40 bg-destructive/10 text-destructive" }
            : notStarted ? { label: "لم يبدأ", cls: "border-warning/40 bg-warning/10 text-warning" }
            : exhausted ? { label: "مستنفد", cls: "border-warning/40 bg-warning/10 text-warning" }
            : { label: "فعّال", cls: "border-success/40 bg-success/10 text-success" };
          const usagePct = c.usageLimit ? Math.min(100, Math.round((c.usedCount / c.usageLimit) * 100)) : 0;

          return (
            <div key={c.id} className="glass-card rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute -top-10 -left-10 size-32 rounded-full bg-gradient-to-br from-primary/10 to-accent/5 blur-3xl" />
              <div className="relative flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="size-9 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 grid place-items-center">
                      {c.type === "percent" ? <Percent className="size-4" /> : <Tag className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-black font-mono truncate">{c.code}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {c.type === "percent" ? `خصم ${c.value}%` : `خصم ${formatSAR(c.value)}`}
                        {c.type === "percent" && c.maxDiscount ? ` (حد أقصى ${formatSAR(c.maxDiscount)})` : ""}
                      </div>
                    </div>
                  </div>
                </div>
                <span className={cn("text-[10px] font-semibold px-2 py-1 rounded-full border whitespace-nowrap", status.cls)}>
                  {status.label}
                </span>
              </div>

              {c.note && <div className="relative mt-3 text-xs text-muted-foreground">{c.note}</div>}

              <div className="relative mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/30 border border-border px-2 py-2">
                  <div className="text-[9px] text-muted-foreground">الاستخدام</div>
                  <div className="font-bold text-sm">{c.usedCount}{c.usageLimit ? `/${c.usageLimit}` : ""}</div>
                </div>
                <div className="rounded-lg bg-muted/30 border border-border px-2 py-2">
                  <div className="text-[9px] text-muted-foreground">حد أدنى</div>
                  <div className="font-bold text-sm">{c.minTotal ? formatSAR(c.minTotal) : "—"}</div>
                </div>
                <div className="rounded-lg bg-muted/30 border border-border px-2 py-2">
                  <div className="text-[9px] text-muted-foreground">ينتهي</div>
                  <div className="font-bold text-[11px]">{new Date(c.expiresAt).toLocaleDateString("ar-SA")}</div>
                </div>
              </div>

              {c.usageLimit ? (
                <div className="relative mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-gradient-to-l from-primary to-accent" style={{ width: `${usagePct}%` }} />
                </div>
              ) : null}

              <div className="relative mt-3 text-[10px] text-muted-foreground">
                من {new Date(c.activeFrom).toLocaleDateString("ar-SA")} إلى {new Date(c.expiresAt).toLocaleDateString("ar-SA")}
              </div>

              <div className="relative mt-3 flex gap-1.5">
                <button onClick={() => copy(c.code)} className="flex-1 h-9 rounded-lg border border-border hover:bg-muted/40 text-xs font-semibold flex items-center justify-center gap-1"><Copy className="size-3.5" /> نسخ</button>
                <button onClick={() => openEdit(c)} className="size-9 rounded-lg border border-border hover:border-primary/40 hover:text-primary grid place-items-center"><Pencil className="size-4" /></button>
                <button onClick={() => del(c)} className="size-9 rounded-lg border border-border hover:border-destructive/40 hover:text-destructive grid place-items-center"><Trash2 className="size-4" /></button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <div className="col-span-full glass-card rounded-2xl p-12 text-center text-muted-foreground">
            <Ticket className="size-8 mx-auto mb-2 opacity-40" />
            لا توجد كوبونات. أنشئ أول كود خصم لعملائك.
          </div>
        )}
      </div>

      {openForm && (
        <CouponFormDialog
          editing={!!editingId}
          form={form}
          setForm={setForm}
          onClose={() => { setOpenForm(false); setEditingId(null); }}
          onSubmit={submit}
        />
      )}
    </AppShell>
  );
}

function CouponFormDialog({
  editing, form, setForm, onClose, onSubmit,
}: {
  editing: boolean; form: Form; setForm: (f: Form) => void;
  onClose: () => void; onSubmit: () => void;
}) {
  const inp = "w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm";
  const lbl = "text-xs font-semibold text-muted-foreground mb-2 block";
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm({ ...form, [k]: v });

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-lg">{editing ? "تعديل كوبون" : "كوبون جديد"}</h3>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className={lbl}>الكود</label>
            <input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="مثال: SUMMER20" className={cn(inp, "font-mono uppercase")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>نوع الخصم</label>
              <select value={form.type} onChange={(e) => set("type", e.target.value as CouponType)} className={inp}>
                <option value="percent">نسبة مئوية %</option>
                <option value="fixed">قيمة ثابتة (ريال)</option>
              </select>
            </div>
            <div>
              <label className={lbl}>{form.type === "percent" ? "النسبة %" : "القيمة (ريال)"}</label>
              <input type="number" min={0} value={form.value || ""} onChange={(e) => set("value", Number(e.target.value))} className={inp} />
            </div>
            {form.type === "percent" && (
              <div>
                <label className={lbl}>الحد الأقصى للخصم (اختياري)</label>
                <input type="number" min={0} value={form.maxDiscount || ""} onChange={(e) => set("maxDiscount", Number(e.target.value))} className={inp} />
              </div>
            )}
            <div>
              <label className={lbl}>حد أدنى للفاتورة</label>
              <input type="number" min={0} value={form.minTotal || ""} onChange={(e) => set("minTotal", Number(e.target.value))} className={inp} />
            </div>
            <div>
              <label className={lbl}>يبدأ من</label>
              <input type="date" value={form.activeFrom} onChange={(e) => set("activeFrom", e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>ينتهي في</label>
              <input type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>حد الاستخدام (0 = غير محدود)</label>
              <input type="number" min={0} value={form.usageLimit || ""} onChange={(e) => set("usageLimit", Number(e.target.value))} className={inp} />
            </div>
            <div>
              <label className={lbl}>الحالة</label>
              <select value={form.active ? "1" : "0"} onChange={(e) => set("active", e.target.value === "1")} className={inp}>
                <option value="1">فعّال</option>
                <option value="0">متوقّف</option>
              </select>
            </div>
          </div>
          <div>
            <label className={lbl}>ملاحظة</label>
            <textarea value={form.note} onChange={(e) => set("note", e.target.value)} rows={2} className="w-full rounded-lg bg-muted/40 border border-border px-3 py-2 text-sm resize-none" />
          </div>
        </div>
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">إلغاء</button>
          <button onClick={onSubmit} className="px-6 h-10 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold">{editing ? "حفظ" : "إنشاء"}</button>
        </div>
      </div>
    </div>
  );
}
