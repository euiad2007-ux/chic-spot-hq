import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { limitMessage, usePlanCaps, withinLimit } from "@/lib/plan-limits";
import { Building2, Plus, Pencil, X, MapPin, Phone, Mail, MessageCircle, Clock, UserCog, Crosshair, ExternalLink } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { useSalon } from "@/lib/salon-store";
import {
  listBranches,
  createBranch,
  updateBranch,
  branchMapsUrl,
  parseMapsCoords,
  type Branch,
} from "@/lib/db/ops-repo";

export const Route = createFileRoute("/_authenticated/branches")({
  head: () => ({
    meta: [
      { title: "الفروع — إدارة فروع المشغل | Salon Flow" },
      {
        name: "description",
        content:
          "إضافة وتعديل فروع المشغل مع الهاتف والعنوان وموقع الفرع على خرائط جوجل ومدير الفرع ونطاق الحضور.",
      },
      { property: "og:title", content: "الفروع — Salon Flow" },
      { property: "og:description", content: "إدارة فروع المشغل وبيانات الاتصال والموقع لكل فرع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BranchesPage,
});

interface FormState {
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  mapsUrl: string;
  lat: string;
  lng: string;
  managerStaffId: string;
  geofence_m: number;
}

const empty: FormState = {
  name: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  hours: "",
  mapsUrl: "",
  lat: "",
  lng: "",
  managerStaffId: "",
  geofence_m: 150,
};

function BranchesPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const qc = useQueryClient();
  const staff = useSalon((s) => s.staff);

  const { plan } = usePlanCaps();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const branches = useQuery({
    queryKey: ["branches", salonId],
    queryFn: () => listBranches(salonId!),
    enabled: !!salonId,
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["branches", salonId] });
  const managerName = (id: string | null) =>
    id ? staff.find((s) => s.id === id)?.name ?? "موظف محذوف" : "—";

  const payload = () => ({
    name: form.name.trim(),
    phone: form.phone.trim() || null,
    whatsapp: form.whatsapp.trim() || null,
    email: form.email.trim() || null,
    address: form.address.trim() || null,
    hours: form.hours.trim() || null,
    maps_url: form.mapsUrl.trim() || null,
    lat: form.lat.trim() ? Number(form.lat) : null,
    lng: form.lng.trim() ? Number(form.lng) : null,
    manager_staff_id: form.managerStaffId || null,
    geofence_m: form.geofence_m,
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("اكتب اسم الفرع");
      if (!editing && !withinLimit(plan?.maxBranches, (branches.data ?? []).length))
        throw new Error(limitMessage(plan, "فرع/فروع", plan!.maxBranches));
      if (editing) await updateBranch(editing.id, payload());
      else await createBranch(salonId!, payload());
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

  /** Fills the coordinates from the device location. */
  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("المتصفح لا يدعم تحديد الموقع");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        })),
      () => toast.error("تعذّر تحديد الموقع، اسمح بالوصول للموقع أو الصق رابط الخريطة"),
      { enableHighAccuracy: true },
    );
  }

  /** Pasting a Google Maps link auto-extracts the coordinates when available. */
  function onMapsUrlChange(value: string) {
    const coords = parseMapsCoords(value);
    setForm((f) => ({
      ...f,
      mapsUrl: value,
      lat: coords ? String(coords.lat) : f.lat,
      lng: coords ? String(coords.lng) : f.lng,
    }));
  }

  return (
    <AppShell
      title="الفروع"
      subtitle="فروع المشغل، بيانات التواصل، الموقع على الخريطة، ومدير الفرع"
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
        {(branches.data ?? []).map((b) => {
          const maps = branchMapsUrl(b);
          return (
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
                  <MessageCircle className="size-3.5" /> {b.whatsapp || "—"}
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5" /> {b.email || "—"}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-3.5" /> {b.address || "—"}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-3.5" /> {b.hours || "—"}
                </div>
                <div className="flex items-center gap-2">
                  <UserCog className="size-3.5" /> مدير الفرع: {managerName(b.manager_staff_id)}
                </div>
                <div>نطاق الحضور: {b.geofence_m} متر</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setEditing(b);
                    setForm({
                      name: b.name,
                      phone: b.phone ?? "",
                      whatsapp: b.whatsapp ?? "",
                      email: b.email ?? "",
                      address: b.address ?? "",
                      hours: b.hours ?? "",
                      mapsUrl: b.maps_url ?? "",
                      lat: b.lat != null ? String(b.lat) : "",
                      lng: b.lng != null ? String(b.lng) : "",
                      managerStaffId: b.manager_staff_id ?? "",
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
                {maps && (
                  <a
                    href={maps}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-sm"
                  >
                    <ExternalLink className="size-3.5" /> الخريطة
                  </a>
                )}
              </div>
            </section>
          );
        })}
        {branches.isSuccess && (branches.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">لا توجد فروع بعد. أضف الفرع الأول.</p>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border bg-card my-8"
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
                <Field label="واتساب">
                  <input
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="البريد الإلكتروني">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                  />
                </Field>
                <Field label="أوقات العمل">
                  <input
                    value={form.hours}
                    onChange={(e) => setForm({ ...form, hours: e.target.value })}
                    placeholder="مثال: السبت - الخميس 10ص - 10م"
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
              <Field label="رابط الموقع على خرائط جوجل">
                <input
                  value={form.mapsUrl}
                  onChange={(e) => onMapsUrlChange(e.target.value)}
                  placeholder="الصق رابط الموقع من Google Maps"
                  className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="خط العرض (Latitude)">
                  <input
                    value={form.lat}
                    onChange={(e) => setForm({ ...form, lat: e.target.value })}
                    className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                  />
                </Field>
                <Field label="خط الطول (Longitude)">
                  <input
                    value={form.lng}
                    onChange={(e) => setForm({ ...form, lng: e.target.value })}
                    className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                  />
                </Field>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-sm"
                >
                  <Crosshair className="size-3.5" /> استخدم موقعي الحالي
                </button>
                <a
                  href={
                    branchMapsUrl({
                      maps_url: form.mapsUrl || null,
                      lat: form.lat ? Number(form.lat) : null,
                      lng: form.lng ? Number(form.lng) : null,
                      address: form.address,
                      name: form.name,
                    }) ?? "https://www.google.com/maps"
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border text-sm"
                >
                  <MapPin className="size-3.5" /> اختر الموقع على الخريطة
                </a>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="مدير الفرع">
                  <select
                    value={form.managerStaffId}
                    onChange={(e) => setForm({ ...form, managerStaffId: e.target.value })}
                    className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                  >
                    <option value="">بدون مدير</option>
                    {staff
                      .filter((s) => s.active)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                          {s.jobTitle ? ` — ${s.jobTitle}` : ""}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="نطاق الحضور (متر)">
                  <input
                    type="number"
                    min={20}
                    value={form.geofence_m}
                    onChange={(e) => setForm({ ...form, geofence_m: Number(e.target.value) || 150 })}
                    className="w-full h-11 rounded-xl border border-border bg-muted/40 px-3 text-sm"
                  />
                </Field>
              </div>
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
