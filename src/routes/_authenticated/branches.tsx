import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Plus, Pencil, X, MapPin, Phone } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { listBranches, createBranch, updateBranch, type Branch } from "@/lib/db/ops-repo";

export const Route = createFileRoute("/_authenticated/branches")({
  head: () => ({
    meta: [
      { title: "الفروع — إدارة فروع المشغل | Salon Flow" },
      {
        name: "description",
        content:
          "إضافة وتعديل فروع المشغل مع الهاتف والعنوان ونطاق الحضور الجغرافي وتفعيل أو إيقاف الفرع.",
      },
      { property: "og:title", content: "الفروع — Salon Flow" },
      { property: "og:description", content: "إدارة فروع المشغل ونطاق الحضور لكل فرع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BranchesPage,
});

interface FormState {
  name: string;
  phone: string;
  address: string;
  geofence_m: number;
}
const empty: FormState = { name: "", phone: "", address: "", geofence_m: 150 };

function BranchesPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const branches = useQuery({
    queryKey: ["branches", salonId],
    queryFn: () => listBranches(salonId!),
    enabled: !!salonId,
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["branches", salonId] });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("اكتب اسم الفرع");
      if (editing) {
        await updateBranch(editing.id, {
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          geofence_m: form.geofence_m,
        });
      } else {
        await createBranch(salonId!, {
          name: form.name.trim(),
          phone: form.phone.trim(),
          address: form.address.trim(),
          geofence_m: form.geofence_m,
        });
      }
    },
    onSuccess: () => {
      toast.success(editing ? "تم تحديث الفرع" : "تمت إضافة الفرع");
      setOpen(false);
      setEditing(null);
      setForm(empty);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (b: Branch) => updateBranch(b.id, { active: !b.active }),
    onSuccess: () => {
      toast.success("تم تحديث حالة الفرع");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="الفروع"
      subtitle="فروع المشغل، بيانات التواصل، ونطاق تسجيل الحضور"
      action={
        <button
          onClick={() => {
            setEditing(null);
            setForm(empty);
            setOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 h-10 text-sm font-bold text-primary-foreground"
        >
          <Plus className="size-4" /> فرع جديد
        </button>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(branches.data ?? []).map((b) => (
          <section key={b.id} className="rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold flex items-center gap-2">
                <Building2 className="size-4 text-primary" /> {b.name}
              </h2>
              <span
                className={
                  "text-xs px-2 py-0.5 rounded-full border " +
                  (b.active
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground")
                }
              >
                {b.active ? "مفعّل" : "موقوف"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <Phone className="size-3.5" /> {b.phone || "—"}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="size-3.5" /> {b.address || "—"}
              </div>
              <div>نطاق الحضور: {b.geofence_m} متر</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditing(b);
                  setForm({
                    name: b.name,
                    phone: b.phone ?? "",
                    address: b.address ?? "",
                    geofence_m: b.geofence_m,
                  });
                  setOpen(true);
                }}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-sm"
              >
                <Pencil className="size-3.5" /> تعديل
              </button>
              <button
                onClick={() => toggle.mutate(b)}
                disabled={toggle.isPending}
                className="h-9 px-3 rounded-xl border border-border text-sm disabled:opacity-60"
              >
                {b.active ? "إيقاف" : "تفعيل"}
              </button>
            </div>
          </section>
        ))}
        {branches.isSuccess && (branches.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">لا توجد فروع بعد. أضف الفرع الأول.</p>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-bold">{editing ? "تعديل الفرع" : "فرع جديد"}</h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="إغلاق"
                className="size-8 rounded-lg hover:bg-muted grid place-items-center"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <Field label="اسم الفرع">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="الهاتف">
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                  />
                </Field>
                <Field label="نطاق الحضور (متر)">
                  <input
                    type="number"
                    min={20}
                    value={form.geofence_m}
                    onChange={(e) =>
                      setForm({ ...form, geofence_m: Number(e.target.value) || 150 })
                    }
                    className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                  />
                </Field>
              </div>
              <Field label="العنوان">
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-muted/40 p-3 text-sm"
                />
              </Field>
            </div>
            <div className="p-5 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="h-10 px-4 rounded-xl border border-border text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="h-10 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-60"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
