import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/salon/app-shell";
import {
  useSalon, actions, formatSAR, serviceTotalMin,
  costPerBase, measureLabel, serviceMaterialsCost,
  type Service, type ServiceMaterial,
} from "@/lib/salon-store";
import { useAccount } from "@/hooks/use-account";
import { listBranches } from "@/lib/db/ops-repo";
import { useActiveBranch } from "@/lib/active-branch";
import { scopeToBranch } from "@/lib/branch-scope";
import { useState, useMemo, useEffect } from "react";

import { Plus, Trash2, Clock, Tag, X, Pencil, Package, Timer, Users, Coins, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { limitMessage, usePlanCaps, withinLimit } from "@/lib/plan-limits";

export const Route = createFileRoute("/_authenticated/services")({
  head: () => ({
    meta: [
      { title: "الخدمات — لمسة" },
      { name: "description", content: "إدارة خدمات المشغل والأسعار والمواد والأوقات لكل فرع." },
      { property: "og:title", content: "الخدمات" },
      { property: "og:description", content: "إدارة الخدمات والأسعار والمواد والأوقات لكل فرع." },
    ],
  }),
  component: ServicesPage,
});

interface BranchOption { id: string; name: string }

type FormState = {
  name: string;
  category: string;
  price: number;
  durationMin: number;
  prepMin: number;
  cleanupMin: number;
  branchId: string;
  materials: ServiceMaterial[];
};

const empty: FormState = {
  name: "", category: "الشعر", price: 100, durationMin: 30, prepMin: 5, cleanupMin: 5,
  branchId: "", materials: [],
};


function ServicesPage() {
  const services = useSalon((s) => s.services);
  const staff = useSalon((s) => s.staff);
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const { plan } = usePlanCaps();
  const headerBranch = useActiveBranch();
  const [branchFilter, setBranchFilter] = useState(headerBranch ?? "");
  // Follow the branch chosen in the dashboard header.
  useEffect(() => {
    setBranchFilter(headerBranch ?? "");
  }, [headerBranch]);


  const branchesQuery = useQuery({
    queryKey: ["branches", salonId],
    queryFn: () => listBranches(salonId!),
    enabled: !!salonId,
  });
  const branches: BranchOption[] = (branchesQuery.data ?? []).map((b) => ({ id: b.id, name: b.name }));
  const branchName = (id?: string | null) =>
    id ? branches.find((b) => b.id === id)?.name ?? "فرع محذوف" : "كل الفروع";

  const openNew = () => {
    setEditing(null);
    setForm({ ...empty, branchId: branchFilter });
    setStaffIds([]);
    setOpen(true);
  };
  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name, category: s.category, price: s.price, durationMin: s.durationMin,
      prepMin: s.prepMin ?? 0, cleanupMin: s.cleanupMin ?? 0, materials: s.materials ?? [],
      branchId: s.branchId ?? "",
    });
    setStaffIds(staff.filter((st) => st.services.includes(s.id)).map((st) => st.id));
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return toast.error("اكتب اسم الخدمة");
    if (form.durationMin <= 0) return toast.error("مدة الخدمة غير صحيحة");
    if (!editing && !withinLimit(plan?.maxServices, services.length))
      return toast.error(limitMessage(plan, "خدمة/خدمات", plan!.maxServices));
    const payload = { ...form, branchId: form.branchId || null };
    let serviceId = editing?.id;
    if (editing) {
      actions.updateService(editing.id, payload);
      toast.success("تم تحديث الخدمة");
    } else {
      serviceId = actions.addService({ ...payload, active: true });
      toast.success("تمت إضافة الخدمة");
    }
    if (serviceId) actions.setServiceStaff(serviceId, staffIds);
    setOpen(false);
  };

  const visible = branchFilter
    ? scopeToBranch(services, branchFilter)
    : services;

  const grouped = visible.reduce<Record<string, typeof services>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  return (
    <AppShell
      title="الخدمات"
      subtitle={`${visible.length} خدمة — تُستخدم في الحجوزات وجرد المواد`}
      action={
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
          <Plus className="size-4" /> خدمة جديدة
        </button>
      }
    >
      {branches.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Building2 className="size-3.5" /> عرض خدمات الفرع
          </span>
          <button
            onClick={() => setBranchFilter("")}
            className={cn(
              "text-xs px-3 py-1.5 rounded-full border transition",
              !branchFilter ? "bg-primary text-primary-foreground border-primary" : "border-border hover:text-primary",
            )}
          >
            كل الفروع
          </button>
          {branches.map((b) => (
            <button
              key={b.id}
              onClick={() => setBranchFilter(b.id)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition",
                branchFilter === b.id ? "bg-primary text-primary-foreground border-primary" : "border-border hover:text-primary",
              )}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(grouped).map(([cat, list]) => (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <Tag className="size-4 text-primary" />
              <h2 className="font-bold text-lg">{cat}</h2>
              <span className="text-xs text-muted-foreground">({list.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {list.map((s) => (
                <ServiceCard key={s.id} s={s} branchLabel={branchName(s.branchId)} onEdit={() => openEdit(s)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <ServiceDialog
          form={form}
          setForm={setForm}
          branches={branches}
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

function ServiceCard({ s, branchLabel, onEdit }: { s: Service; branchLabel: string; onEdit: () => void }) {
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
            <span className="flex items-center gap-1"><Building2 className="size-3" /> {branchLabel}</span>
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

      <div className="mt-3 pt-3 border-t border-border/60">
        <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
          <Users className="size-3" /> الموظفون المؤهلون
        </div>
        {eligible.length === 0 ? (
          <div className="text-[11px] text-warning">لا يوجد موظف مربوط — اضبطي التعيين من زر التعديل.</div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {eligible.map((st) => (
              <span key={st.id} className="text-[11px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent">
                {st.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-muted/40 border border-border p-2">
          <div className="text-muted-foreground">تكلفة المواد</div>
          <div className="font-bold">{formatSAR(matCost)}</div>
        </div>
        <div className="rounded-lg bg-success/10 border border-success/30 p-2">
          <div className="text-muted-foreground">صافي الربح</div>
          <div className="font-bold text-success">{formatSAR(Math.max(0, s.price - matCost))}</div>
        </div>
      </div>

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

function ServiceDialog({ form, setForm, branches, staffIds, setStaffIds, onClose, onSubmit, isEdit }: {
  form: FormState;
  setForm: (f: FormState) => void;
  branches: BranchOption[];
  staffIds: string[];
  setStaffIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  onClose: () => void;
  onSubmit: () => void;
  isEdit: boolean;
}) {

  const inventory = useSalon((s) => s.inventory);
  const staff = useSalon((s) => s.staff);
  const total = form.prepMin + form.durationMin + form.cleanupMin;

  const matCost = useMemo(() => serviceMaterialsCost(form.materials, inventory), [form.materials, inventory]);

  const setMaterial = (itemId: string, qty: number) => {
    const others = form.materials.filter((m) => m.itemId !== itemId);
    setForm({ ...form, materials: qty > 0 ? [...others, { itemId, qty }] : others });
  };
  const currentQty = (id: string) => form.materials.find((m) => m.itemId === id)?.qty ?? 0;
  const toggleStaff = (id: string) => {
    setStaffIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

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

          <Field label="الفرع المقدِّم للخدمة">
            <select
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              className="input"
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>


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
              <Users className="size-3" /> الموظفون المؤهلون لتقديم الخدمة
            </div>
            {staff.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                لا يوجد موظفون. أضيفي موظفين من صفحة الموظفين.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {staff.map((st) => {
                  const on = staffIds.includes(st.id);
                  return (
                    <button
                      type="button"
                      key={st.id}
                      onClick={() => toggleStaff(st.id)}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full border transition",
                        on
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border hover:border-primary/50 hover:text-primary",
                      )}
                    >
                      {st.name}
                      <span className="opacity-70 mr-1">· {st.role}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-2">
              في الحجز يظهر فقط الموظفون المؤهلون لهذه الخدمة.
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center justify-between gap-1">
              <span className="flex items-center gap-1"><Package className="size-3" /> المواد المستهلكة لكل جلسة</span>
              <span className="text-[11px] font-normal">{form.materials.length} مادة</span>
            </div>

            {inventory.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                لا توجد مواد في المخزون بعد. أضيفي عناصر من صفحة المخزون أولاً.
              </div>
            ) : (
              <>
                {/* Add from inventory */}
                {(() => {
                  const available = inventory.filter((it) => !form.materials.some((m) => m.itemId === it.id));
                  return (
                    <div className="flex items-center gap-2 mb-2">
                      <select
                        value=""
                        onChange={(e) => {
                          const id = e.target.value;
                          if (!id) return;
                          const it = inventory.find((x) => x.id === id);
                          if (!it) return;
                          setForm({ ...form, materials: [...form.materials, { itemId: id, qty: 1 }] });
                        }}
                        disabled={available.length === 0}
                        className="input flex-1"
                      >
                        <option value="">
                          {available.length === 0 ? "أضفتِ جميع المواد المتوفرة" : "اختاري مادة من المخزون…"}
                        </option>
                        {available.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.name} — متوفر {it.stock} {it.unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })()}

                {/* Added list */}
                {form.materials.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    لا توجد مواد مضافة. اختاري مادة من القائمة أعلاه لإضافتها.
                  </div>
                ) : (
                  <div className="rounded-xl border border-border divide-y divide-border">
                    {form.materials.map((m) => {
                      const it = inventory.find((x) => x.id === m.itemId);
                      if (!it) {
                        return (
                          <div key={m.itemId} className="flex items-center gap-2 p-2.5 text-xs text-destructive">
                            <span className="flex-1">مادة محذوفة من المخزون</span>
                            <button
                              type="button"
                              onClick={() => setForm({ ...form, materials: form.materials.filter((x) => x.itemId !== m.itemId) })}
                              className="size-7 rounded-md hover:bg-destructive/10 grid place-items-center"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        );
                      }
                      const perBase = costPerBase(it);
                      const mLabel = measureLabel(it.measure ?? "count");
                      const lineCost = m.qty * perBase;
                      return (
                        <div key={m.itemId} className="flex items-center gap-2 p-2.5 text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{it.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {perBase.toFixed(3)} ر.س / {mLabel} · متوفر {it.stock} {it.unit}
                            </div>
                          </div>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={m.qty}
                            onChange={(e) => setMaterial(it.id, Number(e.target.value))}
                            className="h-8 w-20 rounded-md bg-muted/40 border border-border px-2 text-xs text-center"
                          />
                          <span className="text-[11px] text-muted-foreground w-8">{mLabel}</span>
                          <span className="text-[11px] w-16 text-left font-semibold text-primary">
                            {lineCost > 0 ? formatSAR(lineCost) : "—"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setForm({ ...form, materials: form.materials.filter((x) => x.itemId !== m.itemId) })}
                            className="size-7 rounded-md hover:bg-destructive/10 hover:text-destructive grid place-items-center"
                            title="حذف"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-lg bg-muted/40 border border-border p-2 flex items-center gap-1">
                <Coins className="size-3 text-muted-foreground" />
                <span className="text-muted-foreground">تكلفة المواد:</span>
                <span className="font-bold mr-auto">{formatSAR(matCost)}</span>
              </div>
              <div className="rounded-lg bg-muted/40 border border-border p-2">
                <span className="text-muted-foreground">السعر:</span>
                <span className="font-bold mr-1">{formatSAR(form.price)}</span>
              </div>
              <div className="rounded-lg bg-success/10 border border-success/30 p-2">
                <span className="text-muted-foreground">الربح:</span>
                <span className="font-bold text-success mr-1">{formatSAR(Math.max(0, form.price - matCost))}</span>
              </div>
            </div>
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
