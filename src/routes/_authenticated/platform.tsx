import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users2,
  CalendarDays,
  Wallet,
  Loader2,
  ShieldCheck,
  Search,
  Package,
  Plus,
  Save,
  Trash2,
  Crown,
  Globe2,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/use-account";
import { AppShell } from "@/components/salon/app-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/platform")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لوحة مالك المنصة — Salon Flow" },
      {
        name: "description",
        content: "إدارة المشاغل المشتركة والباقات والاشتراكات وإحصائيات المنصة بالكامل.",
      },
      { property: "og:title", content: "لوحة مالك المنصة — Salon Flow" },
      { property: "og:description", content: "إدارة الاشتراكات والمشاغل والباقات في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlatformPage,
});

const STATUS_LABEL: Record<string, string> = {
  trial: "تجربة",
  active: "نشط",
  past_due: "متأخر",
  canceled: "ملغى",
};

interface SalonRow {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  plan: string;
  subscription_status: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  is_suspended: boolean;
  admin_notes: string | null;
  custom_domain: string | null;
  domain_status: string;
  created_at: string;
}

interface PlanRow {
  id: string;
  code: string;
  name: string;
  price_monthly: number;
  max_branches: number;
  max_staff: number;
  max_services: number;
  max_customers: number;
  features: string[];
  enabled_modules: string[];
  is_active: boolean;
  sort_order: number;
}

type Tab = "overview" | "salons" | "plans" | "admins";

const MODULE_OPTIONS = [
  ["bookings", "الحجوزات"], ["calendar", "التقويم"], ["services", "الخدمات"],
  ["inventory", "المخزون"], ["staff", "الموظفون"], ["payroll", "الرواتب"],
  ["attendance", "الحضور"], ["customers", "العملاء"], ["coupons", "الكوبونات"],
  ["invoices", "الفواتير"], ["booking_settings", "ضبط الحجز"], ["site_settings", "إعدادات الموقع"],
] as const;

function PlatformPage() {
  const { data: account, isLoading } = useAccount();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");

  const isOwner = account?.role === "platform_owner";

  const claim = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("claim_platform_owner");
      if (error) throw error;
      if (data === false) throw new Error("يوجد مالك للمنصة بالفعل");
      return true;
    },
    onSuccess: async () => {
      toast.success("تم تعيينك مالكًا للمنصة");
      await qc.invalidateQueries();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر التعيين"),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <AppShell title="لوحة مالك المنصة" subtitle="صلاحية خاصة">
        <div className="max-w-lg mx-auto text-center rounded-2xl border border-border bg-card p-8 space-y-4">
          <span className="mx-auto size-14 rounded-2xl bg-primary/10 grid place-items-center">
            <ShieldCheck className="size-7 text-primary" />
          </span>
          <h2 className="text-lg font-bold">هذه اللوحة مخصصة لمالك المنصة</h2>
          <p className="text-sm text-muted-foreground">
            إذا كنت مالك هذه المنصة ولم يتم تعيين مالك بعد، يمكنك المطالبة بالصلاحية الآن. تعمل مرة
            واحدة فقط.
          </p>
          <button
            type="button"
            onClick={() => claim.mutate()}
            disabled={claim.isPending}
            className="h-11 px-5 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {claim.isPending ? <Loader2 className="size-4 animate-spin" /> : <Crown className="size-4" />}
            تعيينـي مالكًا للمنصة
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="block w-full text-xs text-muted-foreground hover:text-foreground"
          >
            العودة إلى لوحة المشغل
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="لوحة مالك المنصة" subtitle="إدارة المشاغل والاشتراكات والباقات">
      <div className="space-y-6">
        <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-full overflow-x-auto">
          {(
            [
              ["overview", "نظرة عامة"],
              ["salons", "المشاغل"],
              ["plans", "الباقات"],
              ["admins", "مالكو المنصة"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                "h-9 px-4 rounded-lg text-sm font-semibold whitespace-nowrap transition",
                tab === key
                  ? "bg-card shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && <Overview />}
        {tab === "salons" && <SalonsTab />}
        {tab === "plans" && <PlansTab />}
        {tab === "admins" && <AdminsTab />}
      </div>
    </AppShell>
  );
}

/* ------------------------------- Overview ------------------------------- */

function Overview() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform", "stats"],
    queryFn: async () => {
      const counts = async (table: "salons" | "customers" | "staff" | "bookings") => {
        const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
        return count ?? 0;
      };
      const [salons, customers, staff, bookings] = await Promise.all([
        counts("salons"),
        counts("customers"),
        counts("staff"),
        counts("bookings"),
      ]);
      const { data: invoices } = await supabase.from("invoices").select("total, paid, status");
      const revenue = (invoices ?? []).reduce((s, i) => s + Number(i.paid ?? 0), 0);
      const { data: salonRows } = await supabase
        .from("salons")
        .select("subscription_status, is_suspended");
      const active = (salonRows ?? []).filter(
        (s) => s.subscription_status === "active" && !s.is_suspended,
      ).length;
      const trial = (salonRows ?? []).filter((s) => s.subscription_status === "trial").length;
      return { salons, customers, staff, bookings, revenue, active, trial };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { label: "المشاغل المشتركة", value: data.salons, icon: Building2 },
    { label: "اشتراكات نشطة", value: data.active, icon: ShieldCheck },
    { label: "قيد التجربة", value: data.trial, icon: Package },
    { label: "إجمالي الموظفين", value: data.staff, icon: Users2 },
    { label: "إجمالي العملاء", value: data.customers, icon: Users2 },
    { label: "إجمالي الحجوزات", value: data.bookings, icon: CalendarDays },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{c.label}</span>
              <c.icon className="size-4 text-primary" />
            </div>
            <div className="mt-2 text-2xl font-extrabold">{c.value.toLocaleString("ar-SA")}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-gradient-to-l from-primary/10 to-accent/10 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Wallet className="size-4 text-primary" />
          إجمالي المبالغ المحصّلة عبر جميع المشاغل
        </div>
        <div className="mt-2 text-3xl font-extrabold">
          {data.revenue.toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Salons -------------------------------- */

function SalonsTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: salons, isLoading } = useQuery({
    queryKey: ["platform", "salons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salons")
        .select(
          "id, name, slug, phone, plan, subscription_status, trial_ends_at, subscription_ends_at, is_suspended, admin_notes, custom_domain, domain_status, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as SalonRow[];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["platform", "plans"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_plans").select("code, name").order("sort_order");
      return (data ?? []) as { code: string; name: string }[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<SalonRow> }) => {
      const { error } = await supabase.from("salons").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تم التحديث");
      await qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر التحديث"),
  });

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return salons ?? [];
    return (salons ?? []).filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.slug.toLowerCase().includes(term) ||
        (s.phone ?? "").includes(term),
    );
  }, [salons, q]);

  if (isLoading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث باسم المشغل أو الرابط أو الجوال"
          className="w-full h-11 rounded-xl border border-input bg-background pr-10 pl-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">لا توجد مشاغل مطابقة.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-bold truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    /{s.slug} · {s.phone || "بدون جوال"} ·{" "}
                    {new Date(s.created_at).toLocaleDateString("ar-SA")}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-1 rounded-full",
                      s.is_suspended
                        ? "bg-destructive/10 text-destructive"
                        : s.subscription_status === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {s.is_suspended
                      ? "موقوف"
                      : STATUS_LABEL[s.subscription_status ?? "trial"] ?? s.subscription_status}
                  </span>
                  <button
                    type="button"
                    onClick={() => update.mutate({ id: s.id, patch: { is_suspended: !s.is_suspended } })}
                    className="h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted/50"
                  >
                    {s.is_suspended ? "إلغاء الإيقاف" : "إيقاف"}
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">الباقة</span>
                  <select
                    value={s.plan ?? ""}
                    onChange={(e) => update.mutate({ id: s.id, patch: { plan: e.target.value } })}
                    className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                  >
                    <option value="">— غير محددة —</option>
                    {(plans ?? []).map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">حالة الاشتراك</span>
                  <select
                    value={s.subscription_status ?? "trial"}
                    onChange={(e) =>
                      update.mutate({ id: s.id, patch: { subscription_status: e.target.value } })
                    }
                    className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                  >
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">
                    نهاية الاشتراك
                  </span>
                  <input
                    type="date"
                    defaultValue={(s.subscription_ends_at ?? "").slice(0, 10)}
                    onBlur={(e) =>
                      update.mutate({
                        id: s.id,
                        patch: {
                          subscription_ends_at: e.target.value
                            ? new Date(e.target.value).toISOString()
                            : null,
                        },
                      })
                    }
                    className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground">النطاق المخصص</span>
                  <div className="relative mt-1">
                    <Globe2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      type="text"
                      dir="ltr"
                      defaultValue={s.custom_domain ?? ""}
                      placeholder="salon.example.com"
                      onBlur={(e) => {
                        const domain = e.target.value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
                        if ((s.custom_domain ?? "") !== domain) update.mutate({ id: s.id, patch: { custom_domain: domain || null, domain_status: domain ? "pending" : "not_configured" } });
                      }}
                      className="w-full h-10 rounded-xl border border-input bg-background pr-10 pl-3 text-sm"
                    />
                  </div>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={s.domain_status ?? "not_configured"}
                    onChange={(e) => update.mutate({ id: s.id, patch: { domain_status: e.target.value } })}
                    disabled={!s.custom_domain}
                    className="h-10 rounded-xl border border-input bg-background px-2 text-xs font-semibold disabled:opacity-60"
                  >
                    <option value="not_configured">غير مربوط</option>
                    <option value="pending">بانتظار التحقق</option>
                    <option value="verified">مربوط ومفعّل</option>
                    <option value="failed">فشل الربط</option>
                  </select>
                  <a
                    href={`/site?tenant=${encodeURIComponent(s.slug)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-10 inline-flex items-center px-3 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
                  >
                    معاينة
                  </a>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                وجّه سجل A للنطاق إلى <span dir="ltr" className="font-mono">185.158.133.1</span> ثم
                اجعل الحالة «مربوط ومفعّل». الزيارة عبر النطاق تفتح موقع هذا المتجر فقط، وتسجيل
                الدخول منه يفتح لوحة المتجر لأعضائه فقط.
              </p>


              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground">ملاحظات إدارية</span>
                <textarea
                  defaultValue={s.admin_notes ?? ""}
                  onBlur={(e) => {
                    if ((s.admin_notes ?? "") !== e.target.value)
                      update.mutate({ id: s.id, patch: { admin_notes: e.target.value } });
                  }}
                  rows={2}
                  className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-sm"
                />
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --------------------------------- Plans -------------------------------- */

const EMPTY_PLAN: Omit<PlanRow, "id"> = {
  code: "",
  name: "",
  price_monthly: 0,
  max_branches: 1,
  max_staff: 5,
  max_services: 30,
  max_customers: 100,
  features: [],
  enabled_modules: MODULE_OPTIONS.map(([key]) => key),
  is_active: true,
  sort_order: 10,
};

function PlansTab() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Omit<PlanRow, "id"> | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["platform", "plans", "full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_plans")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as PlanRow[];
    },
  });

  const save = useMutation({
    mutationFn: async (row: Omit<PlanRow, "id"> & { id?: string }) => {
      if (!row.code.trim() || !row.name.trim()) throw new Error("الرمز والاسم مطلوبان");
      const payload = { ...row, features: row.features };
      const { error } = row.id
        ? await supabase.from("platform_plans").update(payload).eq("id", row.id)
        : await supabase.from("platform_plans").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تم حفظ الباقة");
      setDraft(null);
      await qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر الحفظ"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("platform_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تم حذف الباقة");
      await qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر الحذف"),
  });

  if (isLoading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY_PLAN })}
          className="h-10 px-4 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center gap-2"
        >
          <Plus className="size-4" />
          باقة جديدة
        </button>
      </div>

      {draft && (
        <PlanForm
          value={draft}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={() => save.mutate(draft)}
          busy={save.isPending}
        />
      )}

      <div className="grid md:grid-cols-3 gap-3">
        {(plans ?? []).map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            onSave={(patch) => save.mutate({ ...p, ...patch })}
            onDelete={() => remove.mutate(p.id)}
          />
        ))}
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  onSave,
  onDelete,
}: {
  plan: PlanRow;
  onSave: (patch: Partial<PlanRow>) => void;
  onDelete: () => void;
}) {
  const [edit, setEdit] = useState<Omit<PlanRow, "id"> | null>(null);

  if (edit) {
    return (
      <div className="md:col-span-3">
        <PlanForm
          value={edit}
          onChange={setEdit}
          onCancel={() => setEdit(null)}
          onSave={() => {
            onSave(edit);
            setEdit(null);
          }}
          busy={false}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-bold">{plan.name}</div>
          <div className="text-[11px] text-muted-foreground">{plan.code}</div>
        </div>
        <span
          className={cn(
            "text-[11px] font-bold px-2 py-0.5 rounded-full",
            plan.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          {plan.is_active ? "مفعّلة" : "متوقفة"}
        </span>
      </div>
      <div className="text-2xl font-extrabold">
        {Number(plan.price_monthly).toLocaleString("ar-SA")}
        <span className="text-xs font-semibold text-muted-foreground"> ر.س / شهر</span>
      </div>
      <ul className="text-xs text-muted-foreground space-y-1">
        <li>الفروع: {plan.max_branches}</li>
        <li>الموظفون: {plan.max_staff}</li>
        <li>الخدمات: {plan.max_services}</li>
        <li>العملاء: {plan.max_customers}</li>
        {(plan.features ?? []).map((f) => (
          <li key={f}>• {f}</li>
        ))}
      </ul>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            const { id: _id, ...rest } = plan;
            setEdit(rest);
          }}
          className="flex-1 h-9 rounded-lg border border-border text-xs font-semibold hover:bg-muted/50"
        >
          تعديل
        </button>
        <button
          type="button"
          onClick={() => onSave({ is_active: !plan.is_active })}
          className="flex-1 h-9 rounded-lg border border-border text-xs font-semibold hover:bg-muted/50"
        >
          {plan.is_active ? "تعطيل" : "تفعيل"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="size-9 grid place-items-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10"
          aria-label="حذف الباقة"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function PlanForm({
  value,
  onChange,
  onCancel,
  onSave,
  busy,
}: {
  value: Omit<PlanRow, "id">;
  onChange: (v: Omit<PlanRow, "id">) => void;
  onCancel: () => void;
  onSave: () => void;
  busy: boolean;
}) {
  const set = <K extends keyof Omit<PlanRow, "id">>(k: K, v: Omit<PlanRow, "id">[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="rounded-2xl border border-primary/30 bg-card p-4 space-y-3">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Num label="الرمز (إنجليزي)" text value={value.code} onText={(v) => set("code", v)} />
        <Num label="اسم الباقة" text value={value.name} onText={(v) => set("name", v)} />
        <Num
          label="السعر الشهري"
          value={String(value.price_monthly)}
          onText={(v) => set("price_monthly", Number(v) || 0)}
        />
        <Num
          label="ترتيب العرض"
          value={String(value.sort_order)}
          onText={(v) => set("sort_order", Number(v) || 0)}
        />
        <Num
          label="أقصى عدد فروع"
          value={String(value.max_branches)}
          onText={(v) => set("max_branches", Number(v) || 0)}
        />
        <Num
          label="أقصى عدد موظفين"
          value={String(value.max_staff)}
          onText={(v) => set("max_staff", Number(v) || 0)}
        />
        <Num
          label="أقصى عدد خدمات"
          value={String(value.max_services)}
          onText={(v) => set("max_services", Number(v) || 0)}
        />
        <Num
          label="أقصى عدد عملاء"
          value={String(value.max_customers)}
          onText={(v) => set("max_customers", Number(v) || 0)}
        />
        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={value.is_active}
            onChange={(e) => set("is_active", e.target.checked)}
            className="size-4 accent-[hsl(var(--primary))]"
          />
          <span className="text-xs font-semibold">مفعّلة</span>
        </label>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold text-muted-foreground">الأقسام المتاحة في الباقة</legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {MODULE_OPTIONS.map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold">
              <input
                type="checkbox"
                checked={value.enabled_modules.includes(key)}
                onChange={(e) => set("enabled_modules", e.target.checked ? [...value.enabled_modules, key] : value.enabled_modules.filter((item) => item !== key))}
                className="size-4 accent-[hsl(var(--primary))]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="text-xs font-semibold text-muted-foreground">
          المزايا (سطر لكل ميزة)
        </span>
        <textarea
          value={(value.features ?? []).join("\n")}
          onChange={(e) =>
            set(
              "features",
              e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
          rows={3}
          className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-sm"
        />
      </label>
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 px-4 rounded-xl border border-border text-sm font-semibold"
        >
          إلغاء
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={busy}
          className="h-10 px-4 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          حفظ
        </button>
      </div>
    </div>
  );
}

function Num({
  label,
  value,
  onText,
  text,
}: {
  label: string;
  value: string;
  onText: (v: string) => void;
  text?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={text ? "text" : "number"}
        value={value}
        onChange={(e) => onText(e.target.value)}
        className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}

/* -------------------------------- Admins -------------------------------- */

function AdminsTab() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");

  const { data: admins } = useQuery({
    queryKey: ["platform", "admins"],
    queryFn: async () => {
      const { data } = await supabase
        .from("salon_members")
        .select("id, user_id, created_at")
        .eq("role", "platform_owner");
      return (data ?? []) as { id: string; user_id: string; created_at: string }[];
    },
  });

  const grant = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("grant_platform_owner", { _email: email.trim() });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تمت الترقية إلى مالك منصة");
      setEmail("");
      await qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e) =>
      toast.error(
        e instanceof Error && e.message.includes("not found")
          ? "لا يوجد مستخدم بهذا البريد"
          : "تعذّرت الترقية",
      ),
  });

  return (
    <div className="space-y-4 max-w-xl">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <h2 className="font-bold text-sm">ترقية مستخدم إلى مالك منصة</h2>
        <p className="text-xs text-muted-foreground">
          يجب أن يكون المستخدم قد أنشأ حسابًا في المنصة مسبقًا.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            className="flex-1 h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => grant.mutate()}
            disabled={grant.isPending || !email.trim()}
            className="h-11 px-4 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center gap-2 disabled:opacity-60"
          >
            {grant.isPending ? <Loader2 className="size-4 animate-spin" /> : <Crown className="size-4" />}
            ترقية
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold text-sm mb-3">مالكو المنصة الحاليون ({admins?.length ?? 0})</h2>
        <ul className="space-y-2 text-xs text-muted-foreground">
          {(admins ?? []).map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2">
              <span className="font-mono truncate">{a.user_id}</span>
              <span>{new Date(a.created_at).toLocaleDateString("ar-SA")}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
