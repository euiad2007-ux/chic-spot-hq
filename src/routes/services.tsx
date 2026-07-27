import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import {
  useSalon, actions, formatSAR, serviceTotalMin,
  costPerBase, measureLabel, serviceMaterialsCost,
  type Service, type ServiceMaterial,
} from "@/lib/salon-store";
import { useState, useMemo } from "react";
import { Plus, Trash2, Clock, Tag, X, Pencil, Package, Timer, Users, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "الخدمات — لمسة" },
      { name: "description", content: "إدارة خدمات المشغل والأسعار والمواد والأوقات." },
      { property: "og:title", content: "الخدمات" },
      { property: "og:description", content: "إدارة الخدمات والأسعار والمواد والأوقات." },
    ],
  }),
  component: ServicesPage,
});

type FormState = {
  name: string;
  category: string;
  price: number;
  durationMin: number;
  prepMin: number;
  cleanupMin: number;
  materials: ServiceMaterial[];
};

const empty: FormState = {
  name: "", category: "الشعر", price: 100, durationMin: 30, prepMin: 5, cleanupMin: 5, materials: [],
};

function ServicesPage() {
  const services = useSalon((s) => s.services);
  const staff = useSalon((s) => s.staff);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [staffIds, setStaffIds] = useState<string[]>([]);

  const openNew = () => {
    setEditing(null); setForm(empty); setStaffIds([]); setOpen(true);
  };
  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name, category: s.category, price: s.price, durationMin: s.durationMin,
      prepMin: s.prepMin ?? 0, cleanupMin: s.cleanupMin ?? 0, materials: s.materials ?? [],
    });
    setStaffIds(staff.filter((st) => st.services.includes(s.id)).map((st) => st.id));
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return toast.error("اكتب اسم الخدمة");
    if (form.durationMin <= 0) return toast.error("مدة الخدمة غير صحيحة");
    let serviceId = editing?.id;
    if (editing) {
      actions.updateService(editing.id, form);
      toast.success("تم تحديث الخدمة");
    } else {
      serviceId = actions.addService({ ...form, active: true });
      toast.success("تمت إضافة الخدمة");
    }
    if (serviceId) actions.setServiceStaff(serviceId, staffIds);
    setOpen(false);
  };

  const grouped = services.reduce<Record<string, typeof services>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  return (
    <AppShell
      title="الخدمات"
      subtitle={`${services.length} خدمة — تُستخدم في الحجوزات وجرد المواد`}
      action={
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
          <Plus className="size-4" /> خدمة جديدة
        </button>
      }
    >
      <div className="space-y-6">
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="size-4 text-primary" />
              <h2 className="font-bold text-lg">{cat}</h2>
              <span className="text-xs text-muted-foreground">({list.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((s) => <ServiceCard key={s.id} s={s} onEdit={() => openEdit(s)} />)}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <ServiceDialog
          form={form}
          setForm={setForm}
          staffIds={staffIds}
          setStaffIds={setStaffIds}
          onClose={() => setOpen(false)}
          onSubmit={submit}
          isEdit={!!editing}
        />
      )}
    </AppShell>
  );
}

function ServiceCard({ s, onEdit }: { s: Service; onEdit: () => void }) {
  const inventory = useSalon((st) => st.inventory);
  const staff = useSalon((st) => st.staff);
  const total = serviceTotalMin(s);
  const matCost = serviceMaterialsCost(s.materials, inventory);
  const eligible = staff.filter((st) => st.services.includes(s.id));
  return (
    <div className="glass-card rounded-2xl p-4 group relative">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base">{s.name}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1"><Clock className="size-3" /> {s.durationMin} د</span>
            <span className="flex items-center gap-1 text-primary/80"><Timer className="size-3" /> إجمالي {total} د</span>
            <span className={cn("size-1.5 rounded-full", s.active ? "bg-success" : "bg-muted-foreground")} />
            <span>{s.active ? "متاحة" : "متوقفة"}</span>
          </div>
        </div>
        <div className="flex opacity-0 group-hover:opacity-100 transition">
          <button onClick={onEdit} className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary grid place-items-center" title="تعديل">
            <Pencil className="size-4" />
          </button>
          <button onClick={() => { if (confirm("حذف الخدمة؟")) { actions.removeService(s.id); toast.success("تم الحذف"); } }} className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive grid place-items-center" title="حذف">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {(s.prepMin > 0 || s.cleanupMin > 0) && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          تحضير {s.prepMin || 0} د · تنظيف {s.cleanupMin || 0} د
        </div>
      )}

      {s.materials && s.materials.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/60">
          <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Package className="size-3" /> المواد المستهلكة
          </div>
          <div className="flex flex-wrap gap-1.5">
            {s.materials.map((m) => {
              const it = inventory.find((x) => x.id === m.itemId);
              if (!it) return null;
              return (
                <span key={m.itemId} className="text-[11px] px-2 py-0.5 rounded-full bg-muted/50 border border-border">
                  {it.name} · {m.qty} {it.unit}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-end justify-between">
        <div className="text-2xl font-bold gradient-text">{formatSAR(s.price)}</div>
        <button
          onClick={() => actions.updateService(s.id, { active: !s.active })}
          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted"
        >
          {s.active ? "إيقاف" : "تفعيل"}
        </button>
      </div>
    </div>
  );
}

function ServiceDialog({ form, setForm, onClose, onSubmit, isEdit }: {
  form: FormState;
  setForm: (f: FormState) => void;
  onClose: () => void;
  onSubmit: () => void;
  isEdit: boolean;
}) {
  const inventory = useSalon((s) => s.inventory);
  const total = form.prepMin + form.durationMin + form.cleanupMin;

  const setMaterial = (itemId: string, qty: number) => {
    const others = form.materials.filter((m) => m.itemId !== itemId);
    setForm({ ...form, materials: qty > 0 ? [...others, { itemId, qty }] : others });
  };
  const currentQty = (id: string) => form.materials.find((m) => m.itemId === id)?.qty ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur">
          <h3 className="font-bold text-lg">{isEdit ? "تعديل الخدمة" : "خدمة جديدة"}</h3>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم الخدمة">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" />
            </Field>
            <Field label="التصنيف">
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input" />
            </Field>
            <Field label="السعر (ر.س)">
              <input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="input" />
            </Field>
            <Field label="مدة الخدمة (دقيقة)">
              <input type="number" min={0} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} className="input" />
            </Field>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Timer className="size-3" /> إدارة الوقت
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="تحضير (د)">
                <input type="number" min={0} value={form.prepMin} onChange={(e) => setForm({ ...form, prepMin: Number(e.target.value) })} className="input" />
              </Field>
              <Field label="تنظيف (د)">
                <input type="number" min={0} value={form.cleanupMin} onChange={(e) => setForm({ ...form, cleanupMin: Number(e.target.value) })} className="input" />
              </Field>
              <div className="flex flex-col justify-end">
                <div className="text-xs text-muted-foreground mb-1.5">الإجمالي المحجوز</div>
                <div className="h-10 rounded-lg bg-primary/10 border border-primary/30 grid place-items-center text-sm font-bold text-primary">
                  {total} دقيقة
                </div>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              يتم حجز الوقت الإجمالي في تقويم الموظف لمنع تداخل الحجوزات.
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Package className="size-3" /> المواد المستهلكة لكل جلسة
            </div>
            {inventory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                لا توجد مواد في المخزون بعد. أضيفي عناصر من صفحة المخزون أولاً.
              </div>
            ) : (
              <div className="rounded-xl border border-border divide-y divide-border max-h-56 overflow-y-auto">
                {inventory.map((it) => {
                  const qty = currentQty(it.id);
                  return (
                    <div key={it.id} className="flex items-center gap-3 p-2.5 text-sm">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{it.name}</div>
                        <div className="text-[11px] text-muted-foreground">المتوفر: {it.stock} {it.unit}</div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={qty}
                        onChange={(e) => setMaterial(it.id, Number(e.target.value))}
                        className="h-8 w-20 rounded-md bg-muted/40 border border-border px-2 text-xs text-center"
                        placeholder="0"
                      />
                      <span className="text-[11px] text-muted-foreground w-12">{it.unit}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-card/95 backdrop-blur">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">إلغاء</button>
          <button onClick={onSubmit} className="px-6 h-10 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold">
            {isEdit ? "حفظ التعديلات" : "إضافة"}
          </button>
        </div>
      </div>
      <style>{`.input{width:100%;height:2.5rem;border-radius:.5rem;background:color-mix(in oklab,var(--muted) 40%,transparent);border:1px solid var(--border);padding:0 .75rem;font-size:.875rem;outline:none}.input:focus{border-color:color-mix(in oklab,var(--primary) 50%,transparent)}`}</style>
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
