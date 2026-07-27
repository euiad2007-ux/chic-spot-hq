import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { useSalon, actions, formatSAR, type InventoryItem } from "@/lib/salon-store";
import { useMemo, useState } from "react";
import { Plus, Package, AlertTriangle, Trash2, Pencil, X, Minus, TrendingDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "المخزون — لمسة" },
      { name: "description", content: "إدارة جرد المواد والمستلزمات، مع تنبيه انخفاض المخزون." },
      { property: "og:title", content: "المخزون" },
      { property: "og:description", content: "إدارة جرد المواد والمستلزمات المستخدمة في الخدمات." },
    ],
  }),
  component: InventoryPage,
});

type FormState = Omit<InventoryItem, "id">;
const empty: FormState = { name: "", unit: "قطعة", stock: 0, minStock: 0, costPerUnit: 0 };

function InventoryPage() {
  const inventory = useSalon((s) => s.inventory);
  const services = useSalon((s) => s.services);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [q, setQ] = useState("");

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
    setForm({ name: it.name, unit: it.unit, stock: it.stock, minStock: it.minStock, costPerUnit: it.costPerUnit });
    setOpen(true);
  };

  const submit = () => {
    if (!form.name.trim()) return toast.error("اكتب اسم المادة");
    if (editing) {
      actions.updateInventory(editing.id, form);
      toast.success("تم التحديث");
    } else {
      actions.addInventory(form);
      toast.success("تمت إضافة المادة");
    }
    setOpen(false);
  };

  return (
    <AppShell
      title="المخزون"
      subtitle={`${inventory.length} مادة — يخصم تلقائياً عند إصدار الفواتير`}
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
                <th className="text-right p-3 font-medium">المادة</th>
                <th className="text-right p-3 font-medium">الوحدة</th>
                <th className="text-right p-3 font-medium">المتوفر</th>
                <th className="text-right p-3 font-medium">الحد الأدنى</th>
                <th className="text-right p-3 font-medium">تكلفة الوحدة</th>
                <th className="text-right p-3 font-medium">القيمة</th>
                <th className="text-right p-3 font-medium">تستخدم في</th>
                <th className="text-right p-3 font-medium">تعديل المخزون</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="p-12 text-center text-muted-foreground">لا توجد مواد</td></tr>
              )}
              {filtered.map((it) => {
                const low = it.stock <= it.minStock;
                const uses = usedBy(it.id);
                return (
                  <tr key={it.id} className="border-t border-border hover:bg-muted/20">
                    <td className="p-3 font-semibold">{it.name}</td>
                    <td className="p-3 text-muted-foreground">{it.unit}</td>
                    <td className="p-3">
                      <span className={cn("font-bold", low && "text-destructive")}>
                        {it.stock}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{it.minStock}</td>
                    <td className="p-3">{formatSAR(it.costPerUnit)}</td>
                    <td className="p-3 font-medium">{formatSAR(it.stock * it.costPerUnit)}</td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                        {uses} خدمة
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => actions.adjustStock(it.id, -1)}
                          className="size-7 rounded-md border border-border hover:border-destructive/50 hover:text-destructive grid place-items-center"
                          title="خصم"
                        >
                          <Minus className="size-3" />
                        </button>
                        <button
                          onClick={() => actions.adjustStock(it.id, +1)}
                          className="size-7 rounded-md border border-border hover:border-success/50 hover:text-success grid place-items-center"
                          title="إضافة"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(it)} className="size-8 rounded-lg border border-border hover:border-primary/50 hover:text-primary grid place-items-center" title="تعديل">
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => { if (confirm("حذف المادة من المخزون؟")) { actions.removeInventory(it.id); toast.success("تم الحذف"); } }}
                          className="size-8 rounded-lg border border-border hover:border-destructive/50 hover:text-destructive grid place-items-center"
                          title="حذف"
                        >
                          <Trash2 className="size-4" />
                        </button>
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
          <div className="glass-card rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg">{editing ? "تعديل المادة" : "مادة جديدة"}</h3>
              <button onClick={() => setOpen(false)} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <Field label="اسم المادة">
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="الوحدة">
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="مل، جم، قطعة..." className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </Field>
                <Field label="تكلفة الوحدة (ر.س)">
                  <input type="number" min={0} step="0.01" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: Number(e.target.value) })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </Field>
                <Field label="المتوفر حالياً">
                  <input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </Field>
                <Field label="الحد الأدنى للتنبيه">
                  <input type="number" min={0} value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </Field>
              </div>
            </div>
            <div className="p-5 border-t border-border flex items-center justify-end gap-2">
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
