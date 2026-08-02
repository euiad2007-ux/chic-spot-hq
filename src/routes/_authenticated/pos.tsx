import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Package, Trash2, Plus, Minus, ShoppingCart, Receipt, Lock } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { useSalon, formatSAR } from "@/lib/salon-store";
import {
  listProducts,
  listBranches,
  listShifts,
  findOpenShift,
  posCheckout,
  PAY_METHODS,
  type CartLine,
} from "@/lib/db/ops-repo";

export const Route = createFileRoute("/_authenticated/pos")({
  head: () => ({
    meta: [
      { title: "نقطة البيع — بيع الخدمات والمنتجات | Salon Flow" },
      {
        name: "description",
        content:
          "نقطة بيع سريعة للخدمات والمنتجات مع خصم المخزون تلقائيًا، حساب الضريبة، وإصدار فاتورة مدفوعة مرتبطة بوردية الصندوق.",
      },
      { property: "og:title", content: "نقطة البيع — Salon Flow" },
      { property: "og:description", content: "بيع الخدمات والمنتجات وإصدار الفواتير في ثوانٍ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PosPage,
});

function PosPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const qc = useQueryClient();

  const services = useSalon((s) => s.services);
  const customers = useSalon((s) => s.customers);

  const [branchId, setBranchId] = useState<string | null>(null);
  const [tab, setTab] = useState<"services" | "products">("services");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState("cash");
  const [customerId, setCustomerId] = useState<string>("");
  const [lastInvoice, setLastInvoice] = useState<{ number: string; total: number } | null>(null);

  const branches = useQuery({
    queryKey: ["branches", salonId],
    queryFn: () => listBranches(salonId!),
    enabled: !!salonId,
  });
  const products = useQuery({
    queryKey: ["products", salonId],
    queryFn: () => listProducts(salonId!),
    enabled: !!salonId,
  });
  const shifts = useQuery({
    queryKey: ["shifts", salonId],
    queryFn: () => listShifts(salonId!),
    enabled: !!salonId,
  });

  const activeBranch = branchId ?? branches.data?.[0]?.id ?? null;
  const openShift = useMemo(
    () => (shifts.data ? findOpenShift(shifts.data, activeBranch) : null),
    [shifts.data, activeBranch],
  );

  const vatPct = useSalon((s) => s.settings.vatPct ?? 15);
  const subtotal = cart.reduce((a, l) => a + l.qty * l.unit_price, 0);
  const safeDiscount = Math.min(Math.max(discount, 0), subtotal);
  const vat = Math.round((subtotal - safeDiscount) * (vatPct / 100) * 100) / 100;
  const total = Math.round((subtotal - safeDiscount + vat) * 100) / 100;

  const sellable = (products.data ?? []).filter((p) => p.is_for_sale);
  const term = search.trim().toLowerCase();
  const visibleServices = services.filter(
    (s) => s.active !== false && (!term || s.name.toLowerCase().includes(term)),
  );
  const visibleProducts = sellable.filter(
    (p) => !term || p.name.toLowerCase().includes(term) || (p.sku ?? "").toLowerCase().includes(term),
  );

  function addLine(line: CartLine) {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.id === line.id && l.kind === line.kind);
      if (i === -1) return [...prev, line];
      const next = [...prev];
      next[i] = { ...next[i]!, qty: next[i]!.qty + 1 };
      return next;
    });
  }

  function setQty(index: number, qty: number) {
    setCart((prev) => prev.map((l, i) => (i === index ? { ...l, qty: Math.max(qty, 1) } : l)));
  }

  const checkout = useMutation({
    mutationFn: () =>
      posCheckout({
        salonId: salonId!,
        branchId: activeBranch,
        customerId: customerId || null,
        items: cart,
        method,
        discount: safeDiscount,
        shiftId: openShift?.id ?? null,
      }),
    onSuccess: (res) => {
      setLastInvoice({ number: res.number, total: res.total });
      setCart([]);
      setDiscount(0);
      setCustomerId("");
      toast.success(`تم إصدار الفاتورة ${res.number} بمبلغ ${formatSAR(res.total)}`);
      void qc.invalidateQueries({ queryKey: ["products", salonId] });
      void qc.invalidateQueries({ queryKey: ["shifts", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit() {
    if (!salonId) return toast.error("لا يوجد مشغل مرتبط بالحساب");
    if (cart.length === 0) return toast.error("السلة فارغة");
    if (method === "cash" && !openShift)
      return toast.error("افتح وردية الصندوق قبل البيع النقدي من صفحة الصندوق");
    checkout.mutate();
  }

  return (
    <AppShell
      title="نقطة البيع"
      subtitle="بيع الخدمات والمنتجات وإصدار فاتورة مدفوعة فورًا"
      action={
        <div className="flex items-center gap-2 flex-wrap">
          {branches.data && branches.data.length > 1 && (
            <select
              value={activeBranch ?? ""}
              onChange={(e) => setBranchId(e.target.value || null)}
              aria-label="الفرع"
              className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
            >
              {branches.data.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <span
            className={
              "inline-flex items-center gap-2 h-10 px-3 rounded-xl text-xs font-semibold border " +
              (openShift
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-destructive/40 bg-destructive/10 text-destructive")
            }
          >
            <Lock className="size-3.5" />
            {openShift ? "وردية مفتوحة" : "لا توجد وردية مفتوحة"}
          </span>
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_380px] items-start">
        {/* Catalog */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setTab("services")}
                className={
                  "h-10 px-4 text-sm font-semibold inline-flex items-center gap-2 " +
                  (tab === "services" ? "bg-primary text-primary-foreground" : "hover:bg-muted")
                }
              >
                <Sparkles className="size-4" /> الخدمات
              </button>
              <button
                onClick={() => setTab("products")}
                className={
                  "h-10 px-4 text-sm font-semibold inline-flex items-center gap-2 " +
                  (tab === "products" ? "bg-primary text-primary-foreground" : "hover:bg-muted")
                }
              >
                <Package className="size-4" /> المنتجات
              </button>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو رمز الصنف…"
              aria-label="بحث"
              className="flex-1 min-w-40 h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm"
            />
          </div>

          {tab === "services" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleServices.map((s) => (
                <button
                  key={s.id}
                  onClick={() =>
                    addLine({ kind: "service", id: s.id, name: s.name, qty: 1, unit_price: s.price })
                  }
                  className="text-right rounded-xl border border-border p-3 hover:border-primary/50 hover:bg-muted/40 transition"
                >
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.durationMin} دقيقة</div>
                  <div className="mt-2 font-bold text-primary">{formatSAR(s.price)}</div>
                </button>
              ))}
              {visibleServices.length === 0 && (
                <p className="text-sm text-muted-foreground">لا توجد خدمات مطابقة.</p>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleProducts.map((p) => (
                <button
                  key={p.id}
                  disabled={p.stock <= 0}
                  onClick={() =>
                    addLine({
                      kind: "product",
                      id: p.id,
                      name: p.name,
                      qty: 1,
                      unit_price: Number(p.sale_price),
                    })
                  }
                  className="text-right rounded-xl border border-border p-3 hover:border-primary/50 hover:bg-muted/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    المتوفر: {p.stock} {p.unit}
                    {p.sku ? ` · ${p.sku}` : ""}
                  </div>
                  <div className="mt-2 font-bold text-primary">{formatSAR(Number(p.sale_price))}</div>
                </button>
              ))}
              {visibleProducts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  لا توجد منتجات متاحة للبيع. فعّل «متاح للبيع» وحدّد سعر البيع من صفحة المخزون.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Cart */}
        <aside className="rounded-2xl border border-border bg-card p-4 space-y-4 lg:sticky lg:top-20">
          <h2 className="font-bold flex items-center gap-2">
            <ShoppingCart className="size-4" /> السلة ({cart.length})
          </h2>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {cart.map((l, i) => (
              <div key={`${l.kind}-${l.id}`} className="rounded-xl border border-border p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold truncate">{l.name}</span>
                  <button
                    onClick={() => setCart((prev) => prev.filter((_, x) => x !== i))}
                    aria-label="حذف"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="inline-flex items-center gap-1">
                    <button
                      onClick={() => setQty(i, l.qty - 1)}
                      aria-label="تقليل"
                      className="size-7 rounded-lg border border-border grid place-items-center"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold">{l.qty}</span>
                    <button
                      onClick={() => setQty(i, l.qty + 1)}
                      aria-label="زيادة"
                      className="size-7 rounded-lg border border-border grid place-items-center"
                    >
                      <Plus className="size-3" />
                    </button>
                  </div>
                  <span className="text-sm font-bold">{formatSAR(l.qty * l.unit_price)}</span>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <p className="text-sm text-muted-foreground">أضف خدمة أو منتجًا للبدء.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground">العميل (اختياري)</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm"
            >
              <option value="">بيع نقدي بدون عميل</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.phone}
                </option>
              ))}
            </select>

            <label className="block text-xs text-muted-foreground">الخصم (ريال)</label>
            <input
              type="number"
              min={0}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
              className="w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm"
            />

            <label className="block text-xs text-muted-foreground">طريقة الدفع</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm"
            >
              {PAY_METHODS.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-muted/40 p-3 space-y-1 text-sm">
            <Row label="المجموع" value={formatSAR(subtotal)} />
            <Row label="الخصم" value={`- ${formatSAR(safeDiscount)}`} />
            <Row label={`الضريبة (${vatPct}%)`} value={formatSAR(vat)} />
            <div className="border-t border-border pt-1 mt-1 flex items-center justify-between font-bold">
              <span>الإجمالي</span>
              <span className="text-primary">{formatSAR(total)}</span>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={checkout.isPending || cart.length === 0}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-60"
          >
            {checkout.isPending ? "جارٍ الإصدار…" : "إتمام البيع وإصدار الفاتورة"}
          </button>

          {lastInvoice && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm flex items-center gap-2">
              <Receipt className="size-4 text-primary" />
              آخر فاتورة: <strong>{lastInvoice.number}</strong> — {formatSAR(lastInvoice.total)}
            </div>
          )}
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
