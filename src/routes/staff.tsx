import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { useSalon, actions, formatSAR } from "@/lib/salon-store";
import { useMemo, useState } from "react";
import { Plus, Phone, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/staff")({
  head: () => ({
    meta: [
      { title: "الموظفون — لمسة" },
      { name: "description", content: "إدارة الموظفين والعمولات." },
      { property: "og:title", content: "الموظفون" },
      { property: "og:description", content: "إدارة الموظفين والعمولات." },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const { staff, bookings, services } = useSalon((s) => s);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "مصففة شعر", phone: "", commissionPct: 20 });

  const stats = useMemo(() => {
    const m = new Map<string, { count: number; revenue: number }>();
    bookings.filter((b) => b.status === "completed").forEach((b) => {
      const cur = m.get(b.staffId) ?? { count: 0, revenue: 0 };
      m.set(b.staffId, { count: cur.count + 1, revenue: cur.revenue + (b.price - b.discount) });
    });
    return m;
  }, [bookings]);

  const submit = () => {
    if (!form.name || !form.phone) return toast.error("أكمل البيانات");
    actions.addStaff({ ...form, services: [], active: true });
    toast.success("تمت الإضافة");
    setOpen(false);
    setForm({ name: "", role: "مصففة شعر", phone: "", commissionPct: 20 });
  };

  return (
    <AppShell
      title="الموظفون"
      subtitle={`${staff.length} موظف`}
      action={
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
          <Plus className="size-4" /> موظف جديد
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.map((s) => {
          const st = stats.get(s.id) ?? { count: 0, revenue: 0 };
          const commission = (st.revenue * s.commissionPct) / 100;
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
                <button onClick={() => { if (confirm("حذف الموظف؟")) { actions.removeStaff(s.id); toast.success("تم الحذف"); } }} className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive grid place-items-center">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="relative mt-4 pt-4 border-t border-border grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold">{st.count}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">خدمة</div>
                </div>
                <div>
                  <div className="text-lg font-bold">{formatSAR(st.revenue)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">مبيعات</div>
                </div>
                <div>
                  <div className="text-lg font-bold gradient-text">{formatSAR(commission)}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">عمولة {s.commissionPct}%</div>
                </div>
              </div>
              <div className="relative mt-3 text-xs text-muted-foreground">
                يقدم: {s.services.map((sid) => services.find((x) => x.id === sid)?.name).filter(Boolean).join("، ") || "—"}
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div className="glass-card rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg">موظف جديد</h3>
              <button onClick={() => setOpen(false)} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">الاسم</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">المسمى</label>
                  <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">الجوال</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">نسبة العمولة %</label>
                <input type="number" value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: Number(e.target.value) })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
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
