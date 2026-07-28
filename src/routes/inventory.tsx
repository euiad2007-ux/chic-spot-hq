import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  useInventory,
  inventoryActions,
  costPerSmallUnit,
  totalValue,
  totalSmallUnits,
  isLowStock,
  COMMON_UNITS,
  COMMON_SMALL_UNITS,
  type InventoryItem,
} from "@/lib/inventory-store";
import {
  Package,
  Plus,
  Trash2,
  X,
  Search,
  Save,
  FolderPlus,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  Ruler,
  ClipboardList,
  Bell,
  Settings2,
  Edit3,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "المخزن — لمسة" },
      { name: "description", content: "إدارة أقسام ومنتجات المخزن مع تسعير الوحدات الصغيرة والتنبيهات والجرد." },
      { property: "og:title", content: "إدارة المخزن" },
      { property: "og:description", content: "أقسام مرنة، منتجات، تفصيل الوحدات، تنبيه انخفاض المخزون، وجرد دوري." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InventoryPage,
});

function fmtSAR(n: number) {
  try {
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${n.toFixed(2)} ر.س`;
  }
}

function fmtDate(t: number) {
  try {
    return new Intl.DateTimeFormat("ar-SA", { dateStyle: "short", timeStyle: "short" }).format(new Date(t));
  } catch {
    return String(t);
  }
}

function InventoryPage() {
  const { categories, items, settings } = useInventory();
  const [activeCat, setActiveCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [breakdownItem, setBreakdownItem] = useState<InventoryItem | null>(null);
  const [countItem, setCountItem] = useState<InventoryItem | null>(null);
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (activeCat !== "all" && i.categoryId !== activeCat) return false;
      const s = q.trim();
      if (!s) return true;
      const hay = `${i.name} ${i.code} ${i.description}`.toLowerCase();
      return hay.includes(s.toLowerCase());
    });
  }, [items, activeCat, q]);

  const lowStockCount = items.filter((i) => isLowStock(i, settings)).length;
  const totalStockValue = items.reduce((s, i) => s + totalValue(i), 0);

  const catName = (id: string) => categories.find((c) => c.id === id)?.name || "بدون قسم";

  const openNew = () => {
    const cat = activeCat !== "all" ? activeCat : categories[0]?.id || "";
    setEditingItem({ ...inventoryActions.emptyItem(cat) });
  };

  return (
    <AppShell
      title="المخزن"
      subtitle="إدارة الأقسام والمنتجات والوحدات"
      action={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="h-9 px-3 rounded-lg border border-border bg-card/60 hover:bg-muted text-sm inline-flex items-center gap-1.5"
          >
            <Bell className="size-4" /> التنبيهات
          </button>
          <button
            onClick={() => setShowCatMgr(true)}
            className="h-9 px-3 rounded-lg border border-border bg-card/60 hover:bg-muted text-sm inline-flex items-center gap-1.5"
          >
            <FolderPlus className="size-4" /> الأقسام
          </button>
          <button
            onClick={openNew}
            className="h-9 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm inline-flex items-center gap-1.5 shadow-[var(--shadow-glow)]"
          >
            <Plus className="size-4" /> منتج جديد
          </button>
        </div>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="عدد الأصناف" value={String(items.length)} icon={<Package className="size-4" />} />
        <StatCard label="الأقسام" value={String(categories.length)} icon={<ClipboardList className="size-4" />} />
        <StatCard
          label="أصناف منخفضة"
          value={String(lowStockCount)}
          icon={<AlertTriangle className="size-4" />}
          tone={lowStockCount > 0 ? "warn" : "ok"}
        />
        <StatCard label="قيمة المخزون" value={fmtSAR(totalStockValue)} icon={<Ruler className="size-4" />} />
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1">
        <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")}>
          الكل
        </CatChip>
        {categories.map((c) => (
          <CatChip key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
            {c.name}
          </CatChip>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث باسم المنتج أو الكود..."
          className="w-full h-10 pr-9 pl-3 rounded-lg bg-card/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-right p-2.5 font-medium">الكود</th>
                <th className="text-right p-2.5 font-medium">المنتج</th>
                <th className="text-right p-2.5 font-medium">القسم</th>
                <th className="text-right p-2.5 font-medium">الوحدة</th>
                <th className="text-right p-2.5 font-medium">الكمية</th>
                <th className="text-right p-2.5 font-medium">سعر الوحدة</th>
                <th className="text-right p-2.5 font-medium">الإجمالي</th>
                <th className="text-right p-2.5 font-medium">الحالة</th>
                <th className="text-right p-2.5 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    لا توجد منتجات بعد. ابدأ بإضافة منتج جديد.
                  </td>
                </tr>
              )}
              {filtered.map((i) => {
                const low = isLowStock(i, settings);
                return (
                  <tr key={i.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-2.5 font-mono text-xs">{i.code}</td>
                    <td className="p-2.5">
                      <div className="font-medium">{i.name || "بدون اسم"}</div>
                      {i.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[220px]">{i.description}</div>
                      )}
                    </td>
                    <td className="p-2.5 text-muted-foreground">{catName(i.categoryId)}</td>
                    <td className="p-2.5">
                      {i.unit}
                      <span className="text-xs text-muted-foreground"> / {i.packQty} {i.smallUnit}</span>
                    </td>
                    <td className="p-2.5">
                      <span className={cn("font-medium", low && "text-amber-600")}>{i.quantity}</span>
                      <span className="text-xs text-muted-foreground"> {i.unit}</span>
                    </td>
                    <td className="p-2.5">{fmtSAR(i.unitPrice)}</td>
                    <td className="p-2.5 font-semibold">{fmtSAR(totalValue(i))}</td>
                    <td className="p-2.5">
                      {low ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                          <AlertTriangle className="size-3" /> منخفض
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600">جيد</span>
                      )}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <IconBtn title="تفصيل الوحدات" onClick={() => setBreakdownItem(i)}>
                          <Ruler className="size-4" />
                        </IconBtn>
                        <IconBtn title="جرد" onClick={() => setCountItem(i)}>
                          <ClipboardList className="size-4" />
                        </IconBtn>
                        <IconBtn title="تعديل" onClick={() => setEditingItem(i)}>
                          <Edit3 className="size-4" />
                        </IconBtn>
                        <IconBtn
                          title="حذف"
                          onClick={() => {
                            if (confirm(`حذف ${i.name}؟`)) {
                              inventoryActions.removeItem(i.id);
                              toast.success("تم الحذف");
                            }
                          }}
                          tone="danger"
                        >
                          <Trash2 className="size-4" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingItem && (
        <ItemEditor item={editingItem} onClose={() => setEditingItem(null)} />
      )}
      {breakdownItem && (
        <BreakdownDialog item={breakdownItem} onClose={() => setBreakdownItem(null)} />
      )}
      {countItem && (
        <StockCountDialog item={countItem} onClose={() => setCountItem(null)} />
      )}
      {showCatMgr && <CategoriesDialog onClose={() => setShowCatMgr(false)} />}
      {showSettings && <SettingsDialog onClose={() => setShowSettings(false)} />}
    </AppShell>
  );
}

/* ============= Small pieces ============= */

function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "default" | "warn" | "ok";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3 bg-card/60",
        tone === "warn" && "border-amber-500/40 bg-amber-500/10",
        tone === "ok" && "border-border",
        tone === "default" && "border-border",
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon} {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function CatChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-full text-xs font-medium border whitespace-nowrap transition",
        active
          ? "bg-gradient-to-l from-primary/25 to-accent/15 text-foreground border-primary/40"
          : "bg-card/60 border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={cn(
        "size-8 rounded-lg inline-flex items-center justify-center border border-border bg-card/60 hover:bg-muted",
        tone === "danger" && "hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/40",
      )}
    >
      {children}
    </button>
  );
}

/* ============= Modal shell ============= */
function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-sm" dir="rtl">
      <div
        className={cn(
          "w-full bg-card border border-border rounded-2xl shadow-2xl max-h-[92vh] flex flex-col",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-border">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="size-8 inline-flex items-center justify-center rounded-lg hover:bg-muted">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}

const inputCls =
  "w-full h-10 px-3 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";

/* ============= Item editor ============= */
function ItemEditor({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const { categories, settings } = useInventory();
  const [draft, setDraft] = useState<InventoryItem>(item);
  const [showUnits, setShowUnits] = useState(false);
  const isNew = !useInventory().items.some((i) => i.id === item.id);

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("أدخل اسم المنتج");
      return;
    }
    if (isNew) {
      inventoryActions.createItem(draft);
      toast.success("تم إضافة المنتج");
    } else {
      inventoryActions.updateItem(draft.id, draft);
      toast.success("تم الحفظ");
    }
    onClose();
  };

  const set = (patch: Partial<InventoryItem>) => setDraft((d) => ({ ...d, ...patch }));

  const perSmall = draft.packQty > 0 ? draft.unitPrice / draft.packQty : 0;

  return (
    <Modal title={isNew ? "منتج جديد" : `تعديل: ${draft.name}`} onClose={onClose} wide>
      {/* ============ Card 1: Product info & stock ============ */}
      <section className="rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold flex items-center gap-1.5">
            <Package className="size-4 text-primary" /> بيانات المنتج والكمية
          </h4>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="اسم المنتج">
            <input className={inputCls} value={draft.name} onChange={(e) => set({ name: e.target.value })} />
          </Field>
          <Field label="القسم">
            <select className={inputCls} value={draft.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
              <option value="">— بدون —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="الكود">
            <input
              className={inputCls}
              value={draft.code}
              onChange={(e) => set({ code: e.target.value })}
              placeholder="تلقائي"
            />
          </Field>
          <Field label="حد التنبيه (بالوحدات)">
            <input
              type="number"
              min={0}
              className={inputCls}
              value={draft.lowStockThreshold}
              onChange={(e) => set({ lowStockThreshold: Number(e.target.value) })}
              placeholder={`الافتراضي: ${settings.defaultThreshold}`}
            />
          </Field>
          <Field label={`الكمية (${draft.unit || "وحدة"})`}>
            <input
              type="number"
              min={0}
              step="any"
              className={inputCls}
              value={draft.quantity}
              onChange={(e) => set({ quantity: Number(e.target.value) })}
            />
          </Field>
          <Field label={`سعر الوحدة (${draft.unit || "وحدة"})`}>
            <input
              type="number"
              min={0}
              step="any"
              className={inputCls}
              value={draft.unitPrice}
              onChange={(e) => set({ unitPrice: Number(e.target.value) })}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="الوصف">
              <textarea
                rows={2}
                className={cn(inputCls, "h-auto py-2")}
                value={draft.description}
                onChange={(e) => set({ description: e.target.value })}
              />
            </Field>
          </div>
        </div>
        <div className="mt-3">
          <ReadonlyStat label="إجمالي قيمة المخزون" value={fmtSAR(draft.quantity * draft.unitPrice)} />
        </div>
      </section>

      {/* ============ Card 2: Unit breakdown ============ */}
      <section className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h4 className="text-sm font-bold flex items-center gap-1.5">
            <Ruler className="size-4 text-primary" /> تفصيل الوحدات
          </h4>
          <button
            type="button"
            onClick={() => setShowUnits(true)}
            className="h-8 px-2.5 rounded-lg border border-border bg-card/60 hover:bg-muted text-xs inline-flex items-center gap-1"
          >
            <Settings2 className="size-3.5" /> إدارة الوحدات
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <Field label="الوحدة الكبيرة">
            <select
              className={inputCls}
              value={draft.unit}
              onChange={(e) => set({ unit: e.target.value })}
            >
              {!settings.largeUnits.includes(draft.unit) && draft.unit && (
                <option value={draft.unit}>{draft.unit}</option>
              )}
              {settings.largeUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>
          <Field label="كمية الوحدة الصغيرة داخل الكبيرة">
            <input
              type="number"
              min={0}
              step="any"
              className={inputCls}
              value={draft.packQty}
              onChange={(e) => set({ packQty: Number(e.target.value) })}
            />
          </Field>
          <Field label="الوحدة الصغيرة">
            <select
              className={inputCls}
              value={draft.smallUnit}
              onChange={(e) => set({ smallUnit: e.target.value })}
            >
              {!settings.smallUnits.includes(draft.smallUnit) && draft.smallUnit && (
                <option value={draft.smallUnit}>{draft.smallUnit}</option>
              )}
              {settings.smallUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          1 {draft.unit || "وحدة"} = <b className="text-foreground">{draft.packQty || 0}</b> {draft.smallUnit || "وحدة صغيرة"}
        </div>
        <div className="mt-3 grid md:grid-cols-2 gap-3">
          <ReadonlyStat
            label={`سعر الـ ${draft.smallUnit || "وحدة صغيرة"}`}
            value={fmtSAR(perSmall)}
          />
          <ReadonlyStat
            label="إجمالي الوحدات الصغيرة"
            value={`${(draft.quantity * draft.packQty).toLocaleString()} ${draft.smallUnit || ""}`}
          />
        </div>
      </section>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border bg-card hover:bg-muted text-sm">
          إلغاء
        </button>
        <button
          onClick={save}
          className="h-10 px-4 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm inline-flex items-center gap-1.5"
        >
          <Save className="size-4" /> حفظ
        </button>
      </div>

      {showUnits && <UnitsDialog onClose={() => setShowUnits(false)} />}
    </Modal>
  );
}

function ReadonlyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-base font-bold">{value}</div>
    </div>
  );
}

/* ============= Breakdown dialog ============= */
function BreakdownDialog({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const perSmall = costPerSmallUnit(item);
  const [useAmount, setUseAmount] = useState<number>(0);

  return (
    <Modal title={`تفصيل الوحدات: ${item.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-xl border border-border p-3 bg-muted/30">
          <div className="text-xs text-muted-foreground mb-1">القاعدة</div>
          <div className="text-sm">
            1 {item.unit} = <b>{item.packQty}</b> {item.smallUnit}
          </div>
          <div className="text-sm mt-1">
            سعر الـ {item.unit}: <b>{fmtSAR(item.unitPrice)}</b>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ReadonlyStat label={`سعر 1 ${item.smallUnit}`} value={fmtSAR(perSmall)} />
          <ReadonlyStat
            label="المتاح حالياً"
            value={`${totalSmallUnits(item).toLocaleString()} ${item.smallUnit}`}
          />
        </div>

        <div className="rounded-xl border border-dashed border-border p-3">
          <div className="text-xs text-muted-foreground mb-2">حساب تكلفة استخدام للخدمة</div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              step="any"
              value={useAmount}
              onChange={(e) => setUseAmount(Number(e.target.value))}
              className={inputCls}
              placeholder={`الكمية المستخدمة بالـ ${item.smallUnit}`}
            />
            <div className="text-sm text-muted-foreground">{item.smallUnit}</div>
          </div>
          <div className="mt-3 text-sm">
            التكلفة: <b className="text-primary">{fmtSAR(useAmount * perSmall)}</b>
          </div>
        </div>
      </div>
    </Modal>
  );
}

/* ============= Stock count dialog ============= */
function StockCountDialog({ item, onClose }: { item: InventoryItem; onClose: () => void }) {
  const [count, setCount] = useState<number>(item.quantity);
  const [inQty, setInQty] = useState<number>(0);
  const [outQty, setOutQty] = useState<number>(0);
  const [note, setNote] = useState("");

  const currentItem = useInventory().items.find((i) => i.id === item.id) || item;

  const doIn = () => {
    if (!(inQty > 0)) return;
    inventoryActions.stockIn(item.id, inQty, note || "إدخال يدوي");
    toast.success("تم الإدخال");
    setInQty(0);
    setNote("");
  };
  const doOut = () => {
    if (!(outQty > 0)) return;
    inventoryActions.stockOut(item.id, outQty, note || "إخراج يدوي");
    toast.success("تم الإخراج");
    setOutQty(0);
    setNote("");
  };
  const doAdjust = () => {
    inventoryActions.adjustQuantity(item.id, count, "جرد يدوي");
    toast.success("تم تحديث الجرد");
    onClose();
  };

  return (
    <Modal title={`جرد وحركة: ${item.name}`} onClose={onClose} wide>
      <div className="grid md:grid-cols-3 gap-3">
        <ReadonlyStat label="الرصيد الحالي" value={`${currentItem.quantity} ${item.unit}`} />
        <ReadonlyStat label={`= ${item.smallUnit}`} value={`${totalSmallUnits(currentItem).toLocaleString()}`} />
        <ReadonlyStat label="قيمة الرصيد" value={fmtSAR(totalValue(currentItem))} />
      </div>

      <div className="mt-4 grid md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border p-3">
          <div className="text-sm font-semibold mb-2 flex items-center gap-1">
            <ArrowUpCircle className="size-4 text-emerald-600" /> إدخال (إضافة)
          </div>
          <input
            type="number"
            min={0}
            className={inputCls}
            value={inQty}
            onChange={(e) => setInQty(Number(e.target.value))}
            placeholder={`عدد ${item.unit}`}
          />
          <button
            onClick={doIn}
            className="mt-2 h-9 w-full rounded-lg bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 text-sm"
          >
            تنفيذ الإدخال
          </button>
        </div>

        <div className="rounded-xl border border-border p-3">
          <div className="text-sm font-semibold mb-2 flex items-center gap-1">
            <ArrowDownCircle className="size-4 text-rose-600" /> إخراج
          </div>
          <input
            type="number"
            min={0}
            className={inputCls}
            value={outQty}
            onChange={(e) => setOutQty(Number(e.target.value))}
            placeholder={`عدد ${item.unit}`}
          />
          <button
            onClick={doOut}
            className="mt-2 h-9 w-full rounded-lg bg-rose-500/15 text-rose-600 border border-rose-500/30 text-sm"
          >
            تنفيذ الإخراج
          </button>
        </div>

        <div className="rounded-xl border border-border p-3">
          <div className="text-sm font-semibold mb-2 flex items-center gap-1">
            <ClipboardList className="size-4 text-primary" /> ضبط الجرد
          </div>
          <input
            type="number"
            min={0}
            className={inputCls}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          />
          <button
            onClick={doAdjust}
            className="mt-2 h-9 w-full rounded-lg bg-primary/15 text-primary border border-primary/30 text-sm"
          >
            تحديث الكمية
          </button>
        </div>
      </div>

      <div className="mt-3">
        <Field label="ملاحظة (اختياري)">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4">
        <div className="text-sm font-semibold mb-2">سجل الحركة</div>
        <div className="rounded-xl border border-border overflow-hidden">
          {currentItem.movements.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">لا توجد حركات بعد.</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="text-right p-2">التاريخ</th>
                    <th className="text-right p-2">النوع</th>
                    <th className="text-right p-2">الكمية</th>
                    <th className="text-right p-2">ملاحظة</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItem.movements.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="p-2 text-muted-foreground">{fmtDate(m.at)}</td>
                      <td className="p-2">
                        {m.type === "in" && <span className="text-emerald-600">إدخال</span>}
                        {m.type === "out" && <span className="text-rose-600">إخراج</span>}
                        {m.type === "adjust" && <span className="text-primary">جرد</span>}
                        {m.type === "sale" && <span className="text-accent">بيع/فاتورة</span>}
                      </td>
                      <td className="p-2">{m.qty} {item.smallUnit}</td>
                      <td className="p-2 text-muted-foreground">
                        {m.note}
                        {m.ref ? ` — ${m.ref}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ============= Categories dialog ============= */
function CategoriesDialog({ onClose }: { onClose: () => void }) {
  const { categories } = useInventory();
  const [name, setName] = useState("");

  return (
    <Modal title="إدارة الأقسام" onClose={onClose}>
      <div className="flex gap-2 mb-3">
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم قسم جديد"
        />
        <button
          onClick={() => {
            if (!name.trim()) return;
            inventoryActions.addCategory(name);
            setName("");
            toast.success("تم إضافة القسم");
          }}
          className="h-10 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm inline-flex items-center gap-1"
        >
          <Plus className="size-4" /> إضافة
        </button>
      </div>

      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
            <input
              className={cn(inputCls, "h-9")}
              value={c.name}
              onChange={(e) => inventoryActions.updateCategory(c.id, e.target.value)}
            />
            <button
              onClick={() => {
                if (confirm(`حذف ${c.name}؟`)) inventoryActions.removeCategory(c.id);
              }}
              className="size-9 rounded-lg border border-border hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/40 inline-flex items-center justify-center"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">لا توجد أقسام.</div>
        )}
      </div>
    </Modal>
  );
}

/* ============= Settings dialog ============= */
function SettingsDialog({ onClose }: { onClose: () => void }) {
  const { settings } = useInventory();
  const [draft, setDraft] = useState(settings);

  return (
    <Modal title="إعدادات التنبيهات" onClose={onClose}>
      <div className="space-y-3">
        <label className="flex items-center gap-2 rounded-lg border border-border p-3">
          <input
            type="checkbox"
            checked={draft.alertsEnabled}
            onChange={(e) => setDraft({ ...draft, alertsEnabled: e.target.checked })}
            className="size-4"
          />
          <div>
            <div className="text-sm font-medium">تفعيل تنبيهات انخفاض المخزون</div>
            <div className="text-xs text-muted-foreground">إظهار تحذير للأصناف التي بلغت الحد الأدنى</div>
          </div>
        </label>

        <Field label="الحد الأدنى الافتراضي (بالوحدات)">
          <input
            type="number"
            min={0}
            className={inputCls}
            value={draft.defaultThreshold}
            onChange={(e) => setDraft({ ...draft, defaultThreshold: Number(e.target.value) })}
          />
        </Field>

        <Field label="رقم جوال للتنبيه (اختياري)">
          <input
            className={inputCls}
            value={draft.notifyPhone}
            onChange={(e) => setDraft({ ...draft, notifyPhone: e.target.value })}
            placeholder="05xxxxxxxx"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border bg-card hover:bg-muted text-sm">
            إلغاء
          </button>
          <button
            onClick={() => {
              inventoryActions.updateSettings(draft);
              toast.success("تم حفظ الإعدادات");
              onClose();
            }}
            className="h-10 px-4 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm inline-flex items-center gap-1.5"
          >
            <Settings2 className="size-4" /> حفظ
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ============= Units management dialog ============= */
function UnitsDialog({ onClose }: { onClose: () => void }) {
  const { settings } = useInventory();
  const [newLarge, setNewLarge] = useState("");
  const [newSmall, setNewSmall] = useState("");

  return (
    <Modal title="إدارة الوحدات" onClose={onClose} wide>
      <div className="grid md:grid-cols-2 gap-4">
        {/* Large units */}
        <div className="rounded-xl border border-border p-3">
          <div className="text-sm font-bold mb-2">الوحدات الكبيرة</div>
          <div className="flex gap-2 mb-3">
            <input
              className={inputCls}
              value={newLarge}
              onChange={(e) => setNewLarge(e.target.value)}
              placeholder="مثال: علبة"
            />
            <button
              onClick={() => {
                if (!newLarge.trim()) return;
                inventoryActions.addLargeUnit(newLarge);
                setNewLarge("");
                toast.success("تم الإضافة");
              }}
              className="h-10 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm inline-flex items-center gap-1"
            >
              <Plus className="size-4" /> إضافة
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {settings.largeUnits.map((u) => (
              <div key={u} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <input
                  className={cn(inputCls, "h-9")}
                  defaultValue={u}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== u) inventoryActions.updateLargeUnit(u, v);
                  }}
                />
                <button
                  onClick={() => {
                    if (confirm(`حذف ${u}؟`)) inventoryActions.removeLargeUnit(u);
                  }}
                  className="size-9 rounded-lg border border-border hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/40 inline-flex items-center justify-center"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {settings.largeUnits.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-3">لا توجد وحدات.</div>
            )}
          </div>
        </div>

        {/* Small units */}
        <div className="rounded-xl border border-border p-3">
          <div className="text-sm font-bold mb-2">الوحدات الصغيرة</div>
          <div className="flex gap-2 mb-3">
            <input
              className={inputCls}
              value={newSmall}
              onChange={(e) => setNewSmall(e.target.value)}
              placeholder="مثال: مل"
            />
            <button
              onClick={() => {
                if (!newSmall.trim()) return;
                inventoryActions.addSmallUnit(newSmall);
                setNewSmall("");
                toast.success("تم الإضافة");
              }}
              className="h-10 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm inline-flex items-center gap-1"
            >
              <Plus className="size-4" /> إضافة
            </button>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {settings.smallUnits.map((u) => (
              <div key={u} className="flex items-center gap-2 rounded-lg border border-border p-2">
                <input
                  className={cn(inputCls, "h-9")}
                  defaultValue={u}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== u) inventoryActions.updateSmallUnit(u, v);
                  }}
                />
                <button
                  onClick={() => {
                    if (confirm(`حذف ${u}؟`)) inventoryActions.removeSmallUnit(u);
                  }}
                  className="size-9 rounded-lg border border-border hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-500/40 inline-flex items-center justify-center"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            {settings.smallUnits.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-3">لا توجد وحدات.</div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
