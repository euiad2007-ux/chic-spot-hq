import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useServices,
  servicesActions,
  computeServiceCosts,
  type Service,
  type ServiceMaterial,
  type MaterialUnitType,
} from "@/lib/services-store";
import { useInventory, type InventoryItem } from "@/lib/inventory-store";
import { useStaff, findServiceById, type Staff } from "@/lib/staff-store";
import {
  Scissors,
  Plus,
  Trash2,
  X,
  Search,
  Save,
  Package,
  Percent,
  Users2,
  Star,
  Calculator,
  Sparkles,
  Receipt,
  BadgeCheck,
  TrendingUp,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "الخدمات — لمسة" },
      { name: "description", content: "إدارة خدمات الصالون: تكاليف المواد، النسب، الأرباح، والموظفين المؤهلين." },
      { property: "og:title", content: "إدارة الخدمات" },
      { property: "og:description", content: "حساب تكلفة الخدمة تلقائياً من مواد المخزن والنسب مع تعيين الموظفين المؤهلين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicesPage,
});

function fmtSAR(n: number) {
  try {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${n.toFixed(2)} ر.س`;
  }
}

function ServicesPage() {
  const services = useServices();
  const { items } = useInventory();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Service | null>(null);

  const itemsById = useMemo(() => {
    const m = new Map<string, InventoryItem>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return services;
    return services.filter((x) => x.name.toLowerCase().includes(s) || x.description.toLowerCase().includes(s));
  }, [services, q]);

  const openNew = () => {
    setEditing({ ...servicesActions.empty(), name: "خدمة جديدة" });
  };

  return (
    <AppShell
      title="الخدمات"
      subtitle="حساب تكلفة الخدمة تلقائياً من المواد والنسب"
      action={
        <button
          onClick={openNew}
          className="h-9 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm inline-flex items-center gap-1.5 shadow-[var(--shadow-glow)]"
        >
          <Plus className="size-4" /> خدمة جديدة
        </button>
      }
    >
      <div className="relative mb-3">
        <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث باسم الخدمة..."
          className="w-full h-10 pr-9 pl-3 rounded-lg bg-card/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-10 text-center text-muted-foreground">
          <Scissors className="size-8 mx-auto mb-2 opacity-60" />
          لا توجد خدمات بعد. أضف خدمة جديدة لبدء الحساب التلقائي للتكاليف.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((svc) => {
            const costs = computeServiceCosts(svc, itemsById);
            return (
              <button
                key={svc.id}
                onClick={() => setEditing(svc)}
                className="text-right rounded-xl border border-border bg-card/60 hover:bg-card p-4 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold truncate">{svc.name || "بدون اسم"}</div>
                    {svc.description && (
                      <div className="text-xs text-muted-foreground truncate">{svc.description}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-left">
                    <div className="text-[11px] text-muted-foreground">السعر</div>
                    <div className="font-bold text-primary">{fmtSAR(costs.finalPrice)}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <MiniStat label="المواد" value={fmtSAR(costs.materialsCost)} />
                  <MiniStat label="التكاليف" value={fmtSAR(costs.totalCosts)} />
                  <MiniStat label="الربح" value={fmtSAR(costs.profitAmount)} tone="ok" />
                </div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Package className="size-3" />{svc.materials.length}</span>
                  <span className="inline-flex items-center gap-1"><Users2 className="size-3" />{svc.staffIds.length}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {editing && (
        <ServiceEditor
          key={editing.id}
          draft={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </AppShell>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "ok" }) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border/50 p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("font-semibold text-xs mt-0.5", tone === "ok" && "text-emerald-600")}>{value}</div>
    </div>
  );
}

/* -------- Editor -------- */
function ServiceEditor({ draft, onClose }: { draft: Service; onClose: () => void }) {
  const [d, setD] = useState<Service>(draft);
  const { items } = useInventory();
  const staff = useStaff();
  const services = useServices();
  const exists = services.some((s) => s.id === draft.id);
  const [staffQ, setStaffQ] = useState("");
  const [onlyQualified, setOnlyQualified] = useState(false);

  const itemsById = useMemo(() => {
    const m = new Map<string, InventoryItem>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  const costs = useMemo(() => computeServiceCosts(d, itemsById), [d, itemsById]);
  const subtotal = costs.materialsCost + costs.storeCost + costs.serviceCost + costs.staffCost;

  const patch = (p: Partial<Service>) => setD((prev) => ({ ...prev, ...p }));

  const save = () => {
    if (!d.name.trim()) {
      toast.error("أدخل اسم الخدمة");
      return;
    }
    if (exists) {
      servicesActions.update(d.id, d);
      toast.success("تم حفظ الخدمة");
    } else {
      servicesActions.create(d);
      toast.success("تم إضافة الخدمة");
    }
    onClose();
  };

  const remove = () => {
    if (!exists) { onClose(); return; }
    if (!confirm("حذف الخدمة؟")) return;
    servicesActions.remove(d.id);
    toast.success("تم الحذف");
    onClose();
  };

  const addMaterial = () => {
    const it = items[0];
    if (!it) {
      toast.error("لا توجد مواد في المخزن");
      return;
    }
    const m: ServiceMaterial = {
      id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      itemId: it.id,
      unitType: "small",
      qty: 1,
    };
    patch({ materials: [...d.materials, m] });
  };

  const updateMaterial = (id: string, p: Partial<ServiceMaterial>) => {
    patch({ materials: d.materials.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  };
  const removeMaterial = (id: string) => {
    patch({ materials: d.materials.filter((m) => m.id !== id) });
  };

  const toggleStaff = (id: string) => {
    patch({
      staffIds: d.staffIds.includes(id)
        ? d.staffIds.filter((x) => x !== id)
        : [...d.staffIds, id],
    });
  };

  // Enriched staff list with best matching specialization + score
  const staffEnriched = useMemo(() => {
    const nameL = d.name.toLowerCase();
    return staff.map((s) => {
      let best: { label: string; rating: number; matched: boolean } | null = null;
      for (const sp of s.specializations) {
        const svc = findServiceById(sp.id);
        if (!svc) continue;
        const matched = !!nameL && svc.label.toLowerCase().includes(nameL);
        if (!best
          || (matched && !best.matched)
          || (matched === best.matched && sp.rating > best.rating)) {
          best = { label: svc.label, rating: sp.rating, matched };
        }
      }
      return { staff: s, best };
    });
  }, [staff, d.name]);

  const staffFiltered = useMemo(() => {
    const q = staffQ.trim().toLowerCase();
    let list = staffEnriched;
    if (onlyQualified) list = list.filter((x) => !!x.best);
    if (q) list = list.filter((x) => x.staff.name.toLowerCase().includes(q) || (x.staff.jobTitle || "").toLowerCase().includes(q));
    // Sort: selected → matched → rating desc → name
    return [...list].sort((a, b) => {
      const aSel = d.staffIds.includes(a.staff.id) ? 1 : 0;
      const bSel = d.staffIds.includes(b.staff.id) ? 1 : 0;
      if (aSel !== bSel) return bSel - aSel;
      const aM = a.best?.matched ? 1 : 0;
      const bM = b.best?.matched ? 1 : 0;
      if (aM !== bM) return bM - aM;
      const aR = a.best?.rating || 0;
      const bR = b.best?.rating || 0;
      if (aR !== bR) return bR - aR;
      return (a.staff.name || "").localeCompare(b.staff.name || "");
    });
  }, [staffEnriched, staffQ, onlyQualified, d.staffIds]);

  return (
    <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full md:max-w-5xl bg-background md:rounded-2xl md:my-6 border-y md:border border-border shadow-2xl overflow-y-auto max-h-screen"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="size-4 text-primary shrink-0" />
            <div className="font-bold truncate">{exists ? "تعديل خدمة" : "خدمة جديدة"}</div>
            {d.name && <span className="text-xs text-muted-foreground truncate hidden md:inline">— {d.name}</span>}
          </div>
          <div className="flex items-center gap-2">
            {exists && (
              <button onClick={remove} className="h-9 px-3 rounded-lg border border-destructive/40 text-destructive text-sm inline-flex items-center gap-1.5 hover:bg-destructive/10">
                <Trash2 className="size-4" /> حذف
              </button>
            )}
            <button onClick={save} className="h-9 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm inline-flex items-center gap-1.5">
              <Save className="size-4" /> حفظ
            </button>
            <button onClick={onClose} className="size-9 rounded-lg border border-border inline-flex items-center justify-center hover:bg-muted">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-[1fr_320px] gap-4 md:gap-6 p-4 md:p-6">
          {/* Main column */}
          <div className="space-y-4 min-w-0">
            {/* Basic */}
            <Section title="بيانات الخدمة" icon={<Tag className="size-4" />} step="1">
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="اسم الخدمة" required>
                  <input
                    value={d.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    className="input"
                    placeholder="مثلاً: صبغ شعر"
                  />
                </Field>
                <Field label="الوصف (اختياري)">
                  <input
                    value={d.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    className="input"
                    placeholder="ملاحظات مختصرة"
                  />
                </Field>
              </div>
            </Section>

            {/* Materials */}
            <Section
              title="مواد الخدمة"
              icon={<Package className="size-4" />}
              step="2"
              hint="اختر المواد من المخزن. سعر الوحدة الصغيرة يُحسب تلقائياً."
              action={
                <button onClick={addMaterial} className="h-8 px-2.5 rounded-lg border border-border bg-card/60 text-xs inline-flex items-center gap-1 hover:bg-muted">
                  <Plus className="size-3.5" /> إضافة مادة
                </button>
              }
            >
              {d.materials.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  لا توجد مواد. اضغط "إضافة مادة" لاختيار مادة من المخزن.
                </div>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-muted-foreground text-xs">
                        <tr>
                          <th className="text-right p-2 font-medium">المادة</th>
                          <th className="text-right p-2 font-medium">نوع الوحدة</th>
                          <th className="text-right p-2 font-medium">الوحدة</th>
                          <th className="text-right p-2 font-medium">الكمية</th>
                          <th className="text-right p-2 font-medium">الإجمالي</th>
                          <th className="p-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.materials.map((m) => {
                          const it = itemsById.get(m.itemId);
                          const unitLabel = it ? (m.unitType === "large" ? it.unit : it.smallUnit) : "-";
                          const perUnit = it ? (m.unitType === "large" ? it.unitPrice : (it.unitPrice / (it.packQty || 1))) : 0;
                          const total = perUnit * (Number(m.qty) || 0);
                          return (
                            <tr key={m.id} className="border-t border-border">
                              <td className="p-2">
                                <select
                                  value={m.itemId}
                                  onChange={(e) => updateMaterial(m.id, { itemId: e.target.value })}
                                  className="input h-9"
                                >
                                  {items.map((it2) => (
                                    <option key={it2.id} value={it2.id}>{it2.name || it2.code}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2">
                                <select
                                  value={m.unitType}
                                  onChange={(e) => updateMaterial(m.id, { unitType: e.target.value as MaterialUnitType })}
                                  className="input h-9"
                                >
                                  <option value="small">صغيرة</option>
                                  <option value="large">كبيرة</option>
                                </select>
                              </td>
                              <td className="p-2 text-muted-foreground text-xs">{unitLabel}</td>
                              <td className="p-2">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={m.qty}
                                  onChange={(e) => updateMaterial(m.id, { qty: Number(e.target.value) })}
                                  className="input h-9 w-24"
                                />
                              </td>
                              <td className="p-2 font-medium">{fmtSAR(total)}</td>
                              <td className="p-2">
                                <button
                                  onClick={() => removeMaterial(m.id)}
                                  className="size-8 rounded-md hover:bg-destructive/10 text-destructive inline-flex items-center justify-center"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border bg-muted/30">
                          <td colSpan={4} className="p-2 text-left font-medium">تكلفة المواد</td>
                          <td colSpan={2} className="p-2 font-bold text-primary">{fmtSAR(costs.materialsCost)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </Section>

            {/* Overhead percentages (before VAT) */}
            <Section
              title="النسب التشغيلية"
              icon={<Percent className="size-4" />}
              step="3"
              hint="نسب تُحسب على تكلفة المواد وتُضاف قبل الضريبة."
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <PctField label="نسبة المتجر" value={d.storePct} onChange={(v) => patch({ storePct: v })} hint={fmtSAR(costs.storeCost)} />
                <PctField label="نسبة الخدمات" value={d.servicePct} onChange={(v) => patch({ servicePct: v })} hint={fmtSAR(costs.serviceCost)} />
                <PctField label="نسبة راتب الموظف" value={d.staffSalaryPct} onChange={(v) => patch({ staffSalaryPct: v })} hint={fmtSAR(costs.staffCost)} />
              </div>

              {/* Subtotal before VAT */}
              <div className="mt-4 rounded-lg bg-muted/30 border border-border p-3 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">الإجمالي قبل الضريبة</div>
                <div className="font-bold">{fmtSAR(subtotal)}</div>
              </div>
            </Section>

            {/* VAT — applied on subtotal */}
            <Section title="الضريبة" icon={<Receipt className="size-4" />} step="4" hint="الضريبة تُحسب على الإجمالي بعد النسب التشغيلية.">
              <div className="grid md:grid-cols-2 gap-3 items-end">
                <PctField label="نسبة الضريبة (الهاك)" value={d.vatPct} onChange={(v) => patch({ vatPct: v })} />
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">قيمة الضريبة</div>
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">{fmtSAR(costs.vatCost)}</div>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-primary/10 border border-primary/30 p-3 flex items-center justify-between">
                <div className="text-sm font-medium">إجمالي التكاليف (شامل الضريبة)</div>
                <div className="font-bold text-lg text-primary">{fmtSAR(costs.totalCosts)}</div>
              </div>
            </Section>

            {/* Pricing */}
            <Section title="التسعير والربح" icon={<Calculator className="size-4" />} step="5">
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="الربح">
                  <div className="flex gap-2">
                    <select
                      value={d.profitMode}
                      onChange={(e) => patch({ profitMode: e.target.value as "pct" | "amount" })}
                      className="input w-28"
                    >
                      <option value="pct">نسبة %</option>
                      <option value="amount">مبلغ ر.س</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={d.profitValue}
                      onChange={(e) => patch({ profitValue: Number(e.target.value) })}
                      className="input flex-1"
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 inline-flex items-center gap-1">
                    <TrendingUp className="size-3" /> قيمة الربح: {fmtSAR(costs.profitAmount)}
                  </div>
                </Field>
                <Field label="سعر الخدمة">
                  <div className="flex gap-2">
                    <select
                      value={d.priceMode}
                      onChange={(e) => patch({ priceMode: e.target.value as "auto" | "manual" })}
                      className="input w-28"
                    >
                      <option value="auto">تلقائي</option>
                      <option value="manual">يدوي</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      disabled={d.priceMode === "auto"}
                      value={d.priceMode === "auto" ? costs.autoPrice.toFixed(2) : d.manualPrice}
                      onChange={(e) => patch({ manualPrice: Number(e.target.value) })}
                      className="input flex-1 disabled:opacity-70"
                    />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    السعر التلقائي المقترح: {fmtSAR(costs.autoPrice)}
                  </div>
                </Field>
              </div>
            </Section>

            {/* Staff */}
            <Section
              title="الموظفون المؤهلون"
              icon={<Users2 className="size-4" />}
              step="6"
              hint="اختر من يستطيع تقديم هذه الخدمة. الأعلى تقييماً والأنسب لاسم الخدمة يظهرون أولاً."
              action={
                <div className="text-xs text-muted-foreground">
                  محدد: <span className="font-bold text-foreground">{d.staffIds.length}</span> / {staff.length}
                </div>
              }
            >
              <div className="flex flex-col sm:flex-row gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={staffQ}
                    onChange={(e) => setStaffQ(e.target.value)}
                    placeholder="بحث بالاسم أو المسمى الوظيفي..."
                    className="w-full h-10 pr-9 pl-3 rounded-lg bg-card/60 border border-border text-sm"
                  />
                </div>
                <label className="inline-flex items-center gap-2 h-10 px-3 rounded-lg border border-border bg-card/60 text-sm cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={onlyQualified}
                    onChange={(e) => setOnlyQualified(e.target.checked)}
                    className="accent-primary"
                  />
                  عرض المؤهلين فقط
                </label>
              </div>

              {staffFiltered.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                  لا يوجد موظفون مطابقون.
                </div>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {staffFiltered.map((row) => (
                    <StaffPickRow
                      key={row.staff.id}
                      staff={row.staff}
                      best={row.best}
                      selected={d.staffIds.includes(row.staff.id)}
                      onToggle={() => toggleStaff(row.staff.id)}
                    />
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* Sticky summary sidebar */}
          <aside className="md:sticky md:top-16 self-start">
            <div className="rounded-2xl border border-border bg-card/70 backdrop-blur p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Receipt className="size-4 text-primary" />
                ملخص التكلفة
              </div>
              <SumRow label="المواد" value={fmtSAR(costs.materialsCost)} />
              <SumRow label="المتجر" value={fmtSAR(costs.storeCost)} muted />
              <SumRow label="الخدمات" value={fmtSAR(costs.serviceCost)} muted />
              <SumRow label="راتب" value={fmtSAR(costs.staffCost)} muted />
              <div className="h-px bg-border" />
              <SumRow label="قبل الضريبة" value={fmtSAR(subtotal)} bold />
              <SumRow label={`الضريبة (${d.vatPct || 0}%)`} value={fmtSAR(costs.vatCost)} />
              <div className="h-px bg-border" />
              <SumRow label="إجمالي التكاليف" value={fmtSAR(costs.totalCosts)} bold />
              <SumRow label="الربح" value={fmtSAR(costs.profitAmount)} tone="ok" />
              <div className="h-px bg-border" />
              <div className="rounded-xl bg-gradient-to-l from-primary/20 to-accent/15 border border-primary/30 p-3 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">السعر النهائي</div>
                <div className="font-extrabold text-xl text-primary">{fmtSAR(costs.finalPrice)}</div>
              </div>
              <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                <BadgeCheck className="size-3" />
                {d.priceMode === "auto" ? "تسعير تلقائي" : "تسعير يدوي"}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function SumRow({ label, value, muted, bold, tone }: {
  label: string; value: string; muted?: boolean; bold?: boolean; tone?: "ok";
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn("text-muted-foreground", muted && "text-xs")}>{label}</span>
      <span className={cn(
        bold && "font-bold",
        tone === "ok" && "text-emerald-600 font-semibold",
      )}>{value}</span>
    </div>
  );
}

function StaffPickRow({ staff, best, selected, onToggle }: {
  staff: Staff;
  best: { label: string; rating: number; matched: boolean } | null;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "text-right flex items-center gap-3 p-3 rounded-lg border transition",
        selected
          ? "border-primary/60 bg-primary/10 shadow-sm"
          : "border-border bg-card/60 hover:bg-muted/50",
      )}
    >
      <div className={cn(
        "size-10 rounded-full flex items-center justify-center border-2 shrink-0 font-bold",
        selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground",
      )}>
        {staff.name.slice(0, 1) || "؟"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className="font-medium text-sm truncate">{staff.name || "بدون اسم"}</div>
          {best?.matched && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
              مطابق
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          {staff.jobTitle || "—"}
          {best && <span className="mx-1">• {best.label}</span>}
        </div>
      </div>
      {best ? (
        <div className="flex items-center gap-0.5 shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={cn("size-3.5", i < best.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
          ))}
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground shrink-0">بدون تخصص</span>
      )}
    </button>
  );
}

/* -------- Small UI helpers -------- */
function Section({ title, icon, action, children, step, hint }: {
  title: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  step?: string;
  hint?: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-card/60 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-sm min-w-0">
          {step && (
            <span className="size-6 rounded-full bg-primary/15 text-primary text-[11px] font-bold inline-flex items-center justify-center shrink-0">
              {step}
            </span>
          )}
          {icon}
          <span className="truncate">{title}</span>
        </div>
        {action}
      </div>
      {hint && (
        <div className="px-4 pt-2 text-[11px] text-muted-foreground">{hint}</div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">
        {label}
        {required && <span className="text-destructive mr-0.5">*</span>}
      </div>
      {children}
    </label>
  );
}

function PctField({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type="number"
          min={0}
          step="0.01"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="input pl-8"
        />
        <Percent className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">= {hint}</div>}
    </Field>
  );
}
