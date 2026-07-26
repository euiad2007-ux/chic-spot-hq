import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { useSalon, actions, formatSAR } from "@/lib/salon-store";
import { useState } from "react";
import { Plus, Trash2, Clock, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "الخدمات — لمسة" },
      { name: "description", content: "إدارة خدمات المشغل والأسعار." },
      { property: "og:title", content: "الخدمات" },
      { property: "og:description", content: "إدارة الخدمات والأسعار." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const services = useSalon((s) => s.services);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "الشعر", price: 100, durationMin: 30 });

  const submit = () => {
    if (!form.name) return toast.error("اكتب اسم الخدمة");
    actions.addService({ ...form, active: true });
    toast.success("تمت إضافة الخدمة");
    setOpen(false);
    setForm({ name: "", category: "الشعر", price: 100, durationMin: 30 });
  };

  const grouped = services.reduce<Record<string, typeof services>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  return (
    <AppShell
      title="الخدمات"
      subtitle={`${services.length} خدمة`}
      action={
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
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
              {list.map((s) => (
                <div key={s.id} className="glass-card rounded-2xl p-4 group relative">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-base">{s.name}</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1"><Clock className="size-3" /> {s.durationMin} د</span>
                        <span className={cn("size-1.5 rounded-full", s.active ? "bg-success" : "bg-muted-foreground")} />
                        <span>{s.active ? "متاحة" : "متوقفة"}</span>
                      </div>
                    </div>
                    <button onClick={() => { actions.removeService(s.id); toast.success("تم الحذف"); }} className="size-8 rounded-lg opacity-0 group-hover:opacity-100 transition hover:bg-destructive/10 hover:text-destructive grid place-items-center">
                      <Trash2 className="size-4" />
                    </button>
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
              ))}
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div className="glass-card rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg">خدمة جديدة</h3>
              <button onClick={() => setOpen(false)} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">اسم الخدمة</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">التصنيف</label>
                <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">السعر (ر.س)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">المدة (دقيقة)</label>
                  <input type="number" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-border flex items-center justify-end gap-2">
              <button onClick={() => setOpen(false)} className="px-4 h-10 rounded-lg border border-border text-sm">إلغاء</button>
              <button onClick={submit} className="px-6 h-10 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-semibold">إضافة</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
