import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/salon/app-shell";
import { useSalon, actions, formatSAR, formatDate } from "@/lib/salon-store";
import { useMemo, useState } from "react";
import { Plus, Search, Phone, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "العملاء — لمسة" },
      { name: "description", content: "قاعدة بيانات العملاء وسجل الزيارات." },
      { property: "og:title", content: "العملاء" },
      { property: "og:description", content: "قاعدة بيانات العملاء." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const customers = useSalon((s) => s.customers);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "" });

  const rows = useMemo(() => customers.filter((c) => !q || c.name.includes(q) || c.phone.includes(q)).sort((a, b) => b.totalSpent - a.totalSpent), [customers, q]);

  const submit = () => {
    if (!form.name || !form.phone) return toast.error("أكمل البيانات");
    actions.addCustomer({ name: form.name, phone: form.phone, gender: "female" });
    toast.success("تمت الإضافة");
    setOpen(false);
    setForm({ name: "", phone: "" });
  };

  return (
    <AppShell
      title="العملاء"
      subtitle={`${customers.length} عميل`}
      action={
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
          <Plus className="size-4" /> عميل جديد
        </button>
      }
    >
      <div className="glass-card rounded-2xl p-4 mb-4">
        <div className="relative">
          <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الجوال" className="w-full h-10 rounded-lg bg-muted/40 border border-border pr-10 pl-3 text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((c) => (
          <div key={c.id} className="glass-card rounded-2xl p-4 group">
            <div className="flex items-start gap-3">
              <div className="size-12 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 grid place-items-center font-bold text-lg">
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold">{c.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><Phone className="size-3" /> {c.phone}</div>
                <div className="text-[10px] text-muted-foreground mt-1">مسجل منذ {formatDate(c.createdAt)}</div>
              </div>
              <button onClick={() => { if (confirm("حذف العميل؟")) { actions.removeCustomer(c.id); toast.success("تم الحذف"); } }} className="size-8 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive grid place-items-center">
                <Trash2 className="size-4" />
              </button>
            </div>
            <div className="mt-4 pt-3 border-t border-border grid grid-cols-2 gap-2 text-center">
              <div>
                <div className="text-xl font-bold">{c.visits}</div>
                <div className="text-[10px] text-muted-foreground">زيارة</div>
              </div>
              <div>
                <div className="text-xl font-bold gradient-text">{formatSAR(c.totalSpent)}</div>
                <div className="text-[10px] text-muted-foreground">إجمالي</div>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div className="col-span-full text-center py-12 text-muted-foreground">لا يوجد عملاء</div>}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={() => setOpen(false)}>
          <div className="glass-card rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold text-lg">عميل جديد</h3>
              <button onClick={() => setOpen(false)} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">الاسم</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">رقم الجوال</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" />
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
