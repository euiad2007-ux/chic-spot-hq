import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import {
  useSalon, actions, formatSAR, costPerBase, measureLabel, loadMeasures, addCustomMeasure,
  type InventoryItem,
} from "@/lib/salon-store";
import { useMemo, useState } from "react";
import { Plus, Package, AlertTriangle, Trash2, Pencil, X, Minus, TrendingDown, Search, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "المخزون — لمسة" },
      { name: "description", content: "إدارة جرد المواد بوحدات القياس التفصيلية وسعر الوحدة الصغيرة." },
      { property: "og:title", content: "المخزون" },
      { property: "og:description", content: "إدارة المواد بوحدات مرنة واستخراج سعر الوحدة الصغيرة." },
    ],
  }),
  component: InventoryPage,
});

type FormState = Omit<InventoryItem, "id">;
const empty: FormState = {
  name: "", unit: "قطعة", stock: 0, minStock: 0, costPerUnit: 0,
  measure: "count", sizePerUnit: 1,
};

function InventoryPage() {
  const inventory = useSalon((s) => s.inventory);
  const services = useSalon((s) => s.services);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [q, setQ] = useState("");
  const [measures, setMeasures] = useState(() => loadMeasures());

  const filtered = useMemo(
    () => inventory.filter((it) => !q || it.name.includes(q)),
    [inventory, q],
  );

  const lowStock = inventory.filter((it) => it.stock <= it.minStock);
  const totalValue = inventory.reduce((a, it) => a + it.stock * it.costPerUnit, 0);

  const usedBy = (id: string) =>
    services.filter((s) => s.materials?.some((m) => m.itemId === id)).length;

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (it: InventoryItem) => {
    setEditing(it);
    setForm({
      name: it.name, unit: it.unit, stock: it.stock, minStock: it.minStock,
      costPerUnit: it.costPerUnit, measure: it.measure ?? "count", sizePerUnit: it.sizePerUnit ?? 1,
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return toast.error("اكتب اسم المادة");
    if (form.sizePerUnit <= 0) return toast.error("حجم الوحدة يجب أن يكون أكبر من صفر");
    if (editing) {
      actions.updateInventory(editing.id, form);
      toast.success("تم التحديث");
    } else {
      actions.addInventory(form);
      toast.success("تمت إضافة المادة");
    }
    setOpen(false);
  };

  const onAddMeasure = (m: { code: string; label: string }) => {
    addCustomMeasure(m);
    setMeasures(loadMeasures());
    setForm((f) => ({ ...f, measure: m.code }));
  };

  return (
    <AppShell
      title="المخزون"
      subtitle={`${inventory.length} مادة — وحدات قياس مرنة وسعر تفصيلي للوحدة الصغيرة`}
      action={
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
          <Plus className="size-4" /> مادة جديدة
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <StatCard label="إجمالي المواد" value={inventory.length.toString()} icon={<Package className="size-5" />} tone="primary" />
        <StatCard label="قيمة المخزون" value={formatSAR(totalValue)} icon={<TrendingDown className="size-5" />} tone="chart-3" />
        <StatCard
          label="مواد منخفضة"
          value={lowStock.length.toString()}
          icon={<AlertTriangle className="size-5" />}
          tone={lowStock.length > 0 ? "destructive" : "success"}
        />
      </div>

      {lowStock.length > 0 && (
        <div className="glass-card rounded-2xl p-4 mb-4 border-warning/40 bg-warning/5">
          <div className="flex items-center gap-2 mb-2 text-warning font-semibold text-sm">
            <AlertTriangle className="size-4" />
            تنبيه: مواد وصلت للحد الأدنى
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((it) => (
              <span key={it.id} className="text-xs px-3 py-1 rounded-full bg-warning/15 border border-warning/40 text-warning">
                {it.name} — {it.stock} / {it.minStock} {it.unit}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl p-4 mb-4">
        <div className="relative">
          <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن مادة..."
            className="w-full h-10 rounded-lg bg-muted/40 border border-border pr-10 pl-3 text-sm outline-none focus:border-primary/50"
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th className="text-right p-3 font-medium">اسم الصنف</th>
                <th className="text-right p-3 font-medium">الوحدة</th>
                <th className="text-right p-3 font-medium">الكمية</th>
                <th className="text-right p-3 font-medium">سعر الوحدة</th>
                <th className="text-right p-3 font-medium">الإجمالي</th>
                <th className="text-right p-3 font-medium">تفصيل الوحدة</th>
                <th className="text-right p-3 font-medium">سعر الوحدة الصغيرة</th>
                <th className="text-right p-3 font-medium">تستخدم في</th>
                <th className="text-right p-3 font-medium">تعديل</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="p-12 text-center text-muted-foreground">لا توجد مواد</td></tr>
              )}
              {filtered.map((it) => {
                const low = it.stock <= it.minStock;
                const uses = usedBy(it.id);
                const perBase = costPerBase(it);
                const mLabel = measureLabel(it.measure ?? "count");
                return (
                  <tr key={it.id} className="border-t border-border hover:bg-muted/20 align-top">
                    <td className="p-3 font-semibold">{it.name}</td>
                    <td className="p-3 text-muted-foreground">{it.unit}</td>
                    <td className="p-3">
                      <span className={cn("font-bold", low && "text-destructive")}>{it.stock}</span>
                      <span className="text-[11px] text-muted-foreground"> / {it.minStock} حد أدنى</span>
                    </td>
                    <td className="p-3">{formatSAR(it.costPerUnit)}</td>
                    <td className="p-3 font-medium">{formatSAR(it.stock * it.costPerUnit)}</td>
                    <td className="p-3">
                      <div className="text-xs">
                        <span className="text-muted-foreground">1 {it.unit} = </span>
                        <span className="font-semibold">{it.sizePerUnit} {mLabel}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/30 font-semibold">
                        {perBase.toFixed(3)} ر.س / {mLabel}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/30">
                        {uses} خدمة
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => actions.adjustStock(it.id, -1)} className="size-7 rounded-md border border-border hover:border-destructive/50 hover:text-destructive grid place-items-center" title="خصم"><Minus className="size-3" /></button>
                        <button onClick={() => actions.adjustStock(it.id, +1)} className="size-7 rounded-md border border-border hover:border-success/50 hover:text-success grid place-items-center" title="إضافة"><Plus className="size-3" /></button>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(it)} className="size-8 rounded-lg border border-border hover:border-primary/50 hover:text-primary grid place-items-center" title="تعديل"><Pencil className="size-4" /></button>
                        <button
                          onClick={() => { if (confirm("حذف المادة من المخزون؟")) { actions.removeInventory(it.id); toast.success("تم الحذف"); } }}
                          className="size-8 rounded-lg border border-border hover:border-destructive/50 hover:text-destructive grid place-items-center"
                          title="حذف"
                        ><Trash2 className="size-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div className="glass-card rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between sticky top-0 bg-card/95 backdrop-blur">
              <h3 className="font-bold text-lg">{editing ? "تعديل المادة" : "مادة جديدة"}</h3>
              <button onClick={() => setOpen(false)} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <Field label="اسم الصنف">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="الوحدة (العبوة)">
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="قنينة، علبة، أنبوب..." className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </Field>
                <Field label="الكمية">
                  <input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </Field>
                <Field label="سعر الوحدة (ر.س)">
                  <input type="number" min={0} step="0.01" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: Number(e.target.value) })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </Field>
                <Field label="الحد الأدنى للتنبيه">
                  <input type="number" min={0} value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </Field>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3">
                <div className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                  <Ruler className="size-3.5" /> تفصيل الوحدة (لاستخراج سعر الوحدة الصغيرة)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="وحدة القياس">
                    <MeasureSelect
                      value={form.measure}
                      options={measures}
                      onChange={(v) => setForm({ ...form, measure: v })}
                      onAdd={onAddMeasure}
                    />
                  </Field>
                  <Field label={`الحجم لكل ${form.unit || "وحدة"}`}>
                    <input
                      type="number" min={0} step="0.01" value={form.sizePerUnit}
                      onChange={(e) => setForm({ ...form, sizePerUnit: Number(e.target.value) })}
                      className="w-full h-10 rounded-lg bg-background border border-border px-3 text-sm"
                    />
                  </Field>
                </div>
                <div className="text-xs bg-background rounded-lg p-2.5 border border-border flex items-center justify-between">
                  <span className="text-muted-foreground">سعر الوحدة الصغيرة</span>
                  <span className="font-bold text-primary">
                    {form.sizePerUnit > 0 ? (form.costPerUnit / form.sizePerUnit).toFixed(4) : "0.0000"} ر.س / {measureLabel(form.measure)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-border flex items-center justify-end gap-2 sticky bottom-0 bg-card/95 backdrop-blur">
              <button onClick={() => setOpen(false)} className="px-4 h-10 rounded-lg border border-border text-sm">إلغاء</button>
              <button onClick={submit} className="px-6 h-10 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold">
                {editing ? "حفظ" : "إضافة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function MeasureSelect({ value, options, onChange, onAdd }: {
  value: string;
  options: { code: string; label: string }[];
  onChange: (v: string) => void;
  onAdd: (m: { code: string; label: string }) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  if (adding) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="الاسم (مثال: ملعقة)" className="h-10 rounded-lg bg-background border border-border px-3 text-sm" />
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\s+/g, "_"))} placeholder="الرمز (مثال: tbsp)" className="h-10 rounded-lg bg-background border border-border px-3 text-sm" />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              if (!label.trim() || !code.trim()) return;
              onAdd({ code: code.trim(), label: label.trim() });
              setAdding(false); setLabel(""); setCode("");
            }}
            className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
          >إضافة</button>
          <button type="button" onClick={() => setAdding(false)} className="px-3 h-9 rounded-lg border border-border text-xs">إلغاء</button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 h-10 rounded-lg bg-background border border-border px-3 text-sm">
        {options.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
      </select>
      <button type="button" onClick={() => setAdding(true)} className="h-10 px-3 rounded-lg border border-primary/40 text-primary text-xs font-semibold hover:bg-primary/10">
        + جديد
      </button>
    </div>
  );
}

function StatCard({ label, value, icon, tone }: { label: string; value: string; icon: React.ReactNode; tone: "primary" | "success" | "destructive" | "chart-3" }) {
  const toneMap: Record<string, string> = {
    primary: "text-primary bg-primary/10 border-primary/30",
    success: "text-success bg-success/10 border-success/30",
    destructive: "text-destructive bg-destructive/10 border-destructive/30",
    "chart-3": "text-chart-3 bg-chart-3/10 border-chart-3/30",
  };
  return (
    <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
      <div className={cn("size-11 rounded-xl grid place-items-center border", toneMap[tone])}>{icon}</div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
