import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Loader2,
  ShieldCheck,
  Search,
  Package,
  Plus,
  Save,
  Trash2,
  Crown,
  Globe2,
  Wallet,
  ReceiptText,
  LifeBuoy,
  Send,
  BadgeCheck,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useAccount } from "@/hooks/use-account";
import { OwnerShell } from "@/components/platform/owner-shell";
import {
  STATUS_LABEL,
  money,
  useSalonsOverview,
  usePlans,
  FinanceCard,
  Field,
  type PlanRow,
} from "@/components/platform/owner-ui";
import { cn } from "@/lib/utils";
import {
  listSupportTickets,
  listSupportMessages,
  addSupportMessage,
  createSupportTicket,
  setTicketStatus,
  TICKET_STATUS_LABEL,
  TICKET_PRIORITY_LABEL,
  type PlatformSalonOverview,
} from "@/lib/db/platform-repo";

export const Route = createFileRoute("/_authenticated/platform")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "لوحة مالك المنصة — اشتراكات المتاجر والدعم الفني" },
      {
        name: "description",
        content:
          "إدارة اشتراكات المتاجر وفواتير الاشتراك والمدفوعات والباقات وتقديم الدعم الفني لكل متجر.",
      },
      { property: "og:title", content: "لوحة مالك المنصة — اشتراكات المتاجر والدعم الفني" },
      {
        property: "og:description",
        content: "اشتراكات المتاجر، الفواتير والتحصيل، الباقات، وتذاكر الدعم الفني.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlatformPage,
});

type Tab = "overview" | "salons" | "support" | "plans" | "admins";

const MODULE_OPTIONS = [
  ["bookings", "الحجوزات"], ["calendar", "التقويم"], ["services", "الخدمات"],
  ["inventory", "المخزون والجرد"], ["staff", "الموظفون"], ["payroll", "الرواتب"],
  ["attendance", "الحضور"], ["customers", "العملاء"], ["coupons", "الكوبونات"],
  ["invoices", "الفواتير"], ["pos", "نقطة البيع"], ["cash", "الصندوق والورديات"],
  ["expenses", "المصروفات"], ["accounting", "المحاسبة"], ["reports", "التقارير"],
  ["ledger", "السجل المالي"], ["branches", "الفروع"],
  ["booking_settings", "ضبط الحجز"], ["invoice_settings", "ضبط الفواتير"],
  ["site_settings", "إعدادات الموقع"], ["users", "المستخدمون والصلاحيات"],
  ["activity_log", "سجل النشاط"], ["branch_audit", "سجل تدقيق الفروع"],
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
      <OwnerShell title="لوحة مالك المنصة" subtitle="صلاحية خاصة">
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
      </OwnerShell>
    );
  }

  return (
    <OwnerShell title="لوحة مالك المنصة" subtitle="نظرة عامة على المتاجر والباقات والدعم">
      <div className="space-y-6">
        <div className="flex gap-1 p-1 rounded-xl bg-muted/50 w-full overflow-x-auto">
          {(
            [
              ["overview", "نظرة عامة"],
              ["salons", "المتاجر"],
              ["support", "الدعم الفني"],
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
        {tab === "support" && <SupportTab />}
        {tab === "plans" && <PlansTab />}
        {tab === "admins" && <AdminsTab />}
      </div>
    </OwnerShell>
  );
}

/* ------------------------------- Overview ------------------------------- */

function Overview() {
  const salons = useSalonsOverview();
  const invoices = useQuery({
    queryKey: ["platform", "sub-invoices"],
    queryFn: () => listSubscriptionInvoices(),
  });
  const payments = useQuery({
    queryKey: ["platform", "sub-payments"],
    queryFn: () => listSubscriptionPayments(),
  });

  if (salons.isLoading || !salons.data) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const rows = salons.data;
  const active = rows.filter((s) => s.subscription_status === "active" && !s.is_suspended);
  const trial = rows.filter((s) => s.subscription_status === "trial");
  const suspended = rows.filter((s) => s.is_suspended);
  const mrr = active.reduce((sum, s) => sum + Number(s.plan_price ?? 0), 0);
  const billed = (invoices.data ?? []).reduce((s, i) => s + Number(i.total), 0);
  const collected = (payments.data ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const due = (invoices.data ?? [])
    .filter((i) => i.status !== "void")
    .reduce((s, i) => s + (Number(i.total) - Number(i.paid)), 0);
  const openTickets = rows.reduce((s, r) => s + r.open_tickets, 0);

  const soon = rows
    .filter((s) => {
      const end = s.subscription_ends_at ?? s.trial_ends_at;
      if (!end) return false;
      const days = (new Date(end).getTime() - Date.now()) / 86400000;
      return days <= 14;
    })
    .sort(
      (a, b) =>
        new Date(a.subscription_ends_at ?? a.trial_ends_at ?? 0).getTime() -
        new Date(b.subscription_ends_at ?? b.trial_ends_at ?? 0).getTime(),
    )
    .slice(0, 8);

  const cards = [
    { label: "إجمالي المتاجر", value: String(rows.length), icon: Building2 },
    { label: "اشتراكات نشطة", value: String(active.length), icon: BadgeCheck },
    { label: "قيد التجربة", value: String(trial.length), icon: Package },
    { label: "متاجر موقوفة", value: String(suspended.length), icon: AlertTriangle },
    { label: "الإيراد الشهري المتكرر (MRR)", value: money(mrr), icon: TrendingUp },
    { label: "تذاكر دعم مفتوحة", value: String(openTickets), icon: LifeBuoy },
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
            <div className="mt-2 text-2xl font-extrabold">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <FinanceCard label="إجمالي فواتير الاشتراكات" value={money(billed)} />
        <FinanceCard label="المحصّل" value={money(collected)} tone="good" />
        <FinanceCard label="المستحق غير المحصّل" value={money(due)} tone={due > 0 ? "bad" : "good"} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
          <AlertTriangle className="size-4 text-primary" /> اشتراكات تنتهي خلال 14 يومًا
        </h2>
        {soon.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد اشتراكات قاربت على الانتهاء.</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {soon.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between gap-2">
                <span className="font-semibold truncate">{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(s.subscription_ends_at ?? s.trial_ends_at ?? "").toLocaleDateString(
                    "ar-SA",
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Salons -------------------------------- */

function SalonsTab() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const salons = useSalonsOverview();
  const plans = usePlans();

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"salons"> }) => {
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
    return (salons.data ?? []).filter((s) => {
      const okStatus =
        status === "all" ||
        (status === "suspended" ? s.is_suspended : s.subscription_status === status);
      if (!okStatus) return false;
      if (!term) return true;
      return (
        s.name.toLowerCase().includes(term) ||
        s.slug.toLowerCase().includes(term) ||
        (s.phone ?? "").includes(term) ||
        (s.owner_email ?? "").toLowerCase().includes(term)
      );
    });
  }, [salons.data, q, status]);

  if (salons.isLoading) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم المتجر أو الرابط أو الجوال أو بريد المالك"
            className="w-full h-11 rounded-xl border border-input bg-background pr-10 pl-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="all">كل الحالات</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
          <option value="suspended">موقوف</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">لا توجد متاجر مطابقة.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <SalonCard
              key={s.id}
              salon={s}
              plans={plans.data ?? []}
              onPatch={(patch) => update.mutate({ id: s.id, patch })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SalonCard({
  salon: s,
  plans,
  onPatch,
}: {
  salon: PlatformSalonOverview;
  plans: PlanRow[];
  onPatch: (patch: TablesUpdate<"salons">) => void;
}) {
  const [open, setOpen] = useState(false);
  const plan = plans.find((p) => p.code === s.plan) ?? null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="font-bold truncate">{s.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            /{s.slug} · {s.phone || "بدون جوال"} · {s.owner_email || "بدون بريد"} ·{" "}
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
            onClick={() => onPatch({ is_suspended: !s.is_suspended })}
            className="h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted/50"
          >
            {s.is_suspended ? "إلغاء الإيقاف" : "إيقاف"}
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="h-8 px-3 rounded-lg border border-border text-xs font-semibold hover:bg-muted/50"
          >
            {open ? "إخفاء التفاصيل" : "كل البيانات"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center">
        <Stat label="الفروع" used={s.branches_count} max={plan?.max_branches} />
        <Stat label="الموظفون" used={s.staff_count} max={plan?.max_staff} />
        <Stat label="الخدمات" used={s.services_count} max={plan?.max_services} />
        <Stat label="العملاء" used={s.customers_count} max={plan?.max_customers} />
        <Stat label="فواتير الشهر" used={s.invoices_month} max={plan?.max_invoices} />
        <Stat label="الحجوزات" used={s.bookings_count} />
        <Stat label="تذاكر مفتوحة" used={s.open_tickets} />
      </div>

      <div className="grid sm:grid-cols-3 gap-2 text-xs">
        <div className="rounded-xl border border-border p-2">
          <div className="text-muted-foreground">مبيعات المتجر</div>
          <div className="font-bold mt-0.5">{money(s.gross_sales)}</div>
        </div>
        <div className="rounded-xl border border-border p-2">
          <div className="text-muted-foreground">اشتراكات محصّلة</div>
          <div className="font-bold mt-0.5">{money(s.sub_paid)}</div>
        </div>
        <div
          className={cn(
            "rounded-xl border p-2",
            s.sub_due > 0 ? "border-destructive/40 bg-destructive/5" : "border-border",
          )}
        >
          <div className="text-muted-foreground">مستحق الاشتراك</div>
          <div className="font-bold mt-0.5">{money(s.sub_due)}</div>
        </div>
      </div>

      {open && (
        <div className="space-y-3 pt-1 border-t border-border">
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">الباقة</span>
              <select
                value={s.plan ?? ""}
                onChange={(e) => onPatch({ plan: e.target.value })}
                className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
              >
                <option value="">— غير محددة —</option>
                {plans.map((p) => (
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
                onChange={(e) => onPatch({ subscription_status: e.target.value })}
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
              <span className="text-xs font-semibold text-muted-foreground">نهاية الاشتراك</span>
              <input
                type="date"
                defaultValue={(s.subscription_ends_at ?? "").slice(0, 10)}
                onBlur={(e) =>
                  onPatch({
                    subscription_ends_at: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
                className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">النطاق المخصص</span>
              <div className="relative mt-1">
                <Globe2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  defaultValue={s.custom_domain ?? ""}
                  onBlur={(e) => onPatch({ custom_domain: e.target.value.trim() || null })}
                  placeholder="salon.example.com"
                  className="w-full h-10 rounded-xl border border-input bg-background pr-10 pl-3 text-sm"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">حالة النطاق</span>
              <select
                value={s.domain_status ?? "none"}
                onChange={(e) => onPatch({ domain_status: e.target.value })}
                className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
              >
                <option value="none">بدون</option>
                <option value="pending">قيد التحقق</option>
                <option value="active">مفعّل</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">ملاحظات الإدارة</span>
            <textarea
              defaultValue={s.admin_notes ?? ""}
              onBlur={(e) => onPatch({ admin_notes: e.target.value || null })}
              rows={2}
              className="mt-1 w-full rounded-xl border border-input bg-background p-2 text-sm"
            />
          </label>

          <div className="text-xs text-muted-foreground">
            الموقع الإلكتروني في الباقة: {plan?.has_website ? "مُتاح" : "غير مُتاح"} · مالك المتجر:{" "}
            {s.owner_name || "—"} · نهاية التجربة:{" "}
            {s.trial_ends_at ? new Date(s.trial_ends_at).toLocaleDateString("ar-SA") : "—"}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, used, max }: { label: string; used: number; max?: number }) {
  const limit = max && max > 0 ? max : null;
  const over = limit !== null && used >= limit;
  return (
    <div className={cn("rounded-xl border p-2", over ? "border-destructive/40 bg-destructive/5" : "border-border")}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold">
        {used}
        {limit !== null && <span className="text-[10px] text-muted-foreground"> / {limit}</span>}
      </div>
    </div>
  );
}


/* -------------------------------- Support -------------------------------- */

function SupportTab() {
  const qc = useQueryClient();
  const { data: account } = useAccount();
  const salons = useSalonsOverview();
  const tickets = useQuery({
    queryKey: ["platform", "tickets"],
    queryFn: () => listSupportTickets(),
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [newTicket, setNewTicket] = useState({ salonId: "", subject: "", body: "", priority: "normal" });

  const messages = useQuery({
    queryKey: ["platform", "ticket-messages", activeId],
    queryFn: () => listSupportMessages(activeId!),
    enabled: !!activeId,
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["platform"] });
  };

  const send = useMutation({
    mutationFn: async () => {
      const t = (tickets.data ?? []).find((x) => x.id === activeId);
      if (!t) throw new Error("اختر تذكرة");
      await addSupportMessage({
        ticketId: t.id,
        salonId: t.salon_id,
        body: reply.trim(),
        fromPlatform: true,
        authorName: account?.fullName ?? "الدعم الفني",
      });
    },
    onSuccess: async () => {
      setReply("");
      await refresh();
      await qc.invalidateQueries({ queryKey: ["platform", "ticket-messages"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر الإرسال"),
  });

  const open = useMutation({
    mutationFn: () =>
      createSupportTicket({
        salonId: newTicket.salonId,
        subject: newTicket.subject.trim(),
        category: "general",
        priority: newTicket.priority,
        body: newTicket.body.trim(),
        fromPlatform: true,
        authorName: account?.fullName ?? "الدعم الفني",
      }),
    onSuccess: async () => {
      toast.success("تم فتح التذكرة");
      setNewTicket({ salonId: "", subject: "", body: "", priority: "normal" });
      await refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر الفتح"),
  });

  const close = useMutation({
    mutationFn: (v: { id: string; status: string }) => setTicketStatus(v.id, v.status),
    onSuccess: refresh,
  });

  const nameOf = (id: string) => salons.data?.find((s) => s.id === id)?.name ?? "—";

  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-4 items-start">
      <div className="space-y-3">
        <div className="rounded-2xl border border-primary/30 bg-card p-4 space-y-2">
          <h2 className="font-bold text-sm inline-flex items-center gap-2">
            <LifeBuoy className="size-4 text-primary" /> فتح تذكرة لمتجر
          </h2>
          <select
            value={newTicket.salonId}
            onChange={(e) => setNewTicket({ ...newTicket, salonId: e.target.value })}
            className="w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
          >
            <option value="">— اختر المتجر —</option>
            {(salons.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input
            value={newTicket.subject}
            onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
            placeholder="الموضوع"
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
          />
          <select
            value={newTicket.priority}
            onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
            className="w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
          >
            {Object.entries(TICKET_PRIORITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <textarea
            value={newTicket.body}
            onChange={(e) => setNewTicket({ ...newTicket, body: e.target.value })}
            rows={3}
            placeholder="نص الرسالة"
            className="w-full rounded-xl border border-input bg-background p-2 text-sm"
          />
          <button
            type="button"
            disabled={!newTicket.salonId || !newTicket.subject.trim() || !newTicket.body.trim() || open.isPending}
            onClick={() => open.mutate()}
            className="w-full h-10 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {open.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            فتح التذكرة
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card divide-y divide-border max-h-[520px] overflow-y-auto">
          {(tickets.data ?? []).length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">لا توجد تذاكر.</p>
          ) : (
            (tickets.data ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "w-full text-right p-3 hover:bg-muted/40 transition",
                  activeId === t.id && "bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm truncate">{t.subject}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted">
                    {TICKET_STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {nameOf(t.salon_id)} · {TICKET_PRIORITY_LABEL[t.priority] ?? t.priority} ·{" "}
                  {new Date(t.created_at).toLocaleDateString("ar-SA")}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 min-h-[320px] flex flex-col">
        {!activeId ? (
          <p className="m-auto text-sm text-muted-foreground">اختر تذكرة لعرض المحادثة.</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
              <div className="font-bold text-sm">
                {(tickets.data ?? []).find((t) => t.id === activeId)?.subject}
              </div>
              <div className="flex gap-1">
                {["open", "pending", "closed"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => close.mutate({ id: activeId, status: s })}
                    className="h-8 px-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted/50"
                  >
                    {TICKET_STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-2 py-3 overflow-y-auto max-h-[380px]">
              {(messages.data ?? []).map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    m.from_platform
                      ? "bg-primary/10 mr-auto"
                      : "bg-muted ml-auto",
                  )}
                >
                  <div className="text-[10px] text-muted-foreground mb-0.5">
                    {m.author_name ?? (m.from_platform ? "الدعم الفني" : "المتجر")} ·{" "}
                    {new Date(m.created_at).toLocaleString("ar-SA")}
                  </div>
                  {m.body}
                </div>
              ))}
              {(messages.data ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">لا توجد رسائل.</p>
              )}
            </div>
            <div className="flex gap-2 pt-2 border-t border-border">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="اكتب ردك للمتجر…"
                className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm"
              />
              <button
                type="button"
                disabled={!reply.trim() || send.isPending}
                onClick={() => send.mutate()}
                className="h-10 px-4 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center gap-2 disabled:opacity-60"
              >
                {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                إرسال
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Plans --------------------------------- */

const EMPTY_PLAN: Omit<PlanRow, "id"> = {
  code: "",
  name: "",
  price_monthly: 0,
  max_branches: 1,
  max_staff: 5,
  max_services: 20,
  max_customers: 500,
  max_invoices: 0,
  has_website: true,
  features: [],
  enabled_modules: MODULE_OPTIONS.map(([k]) => k as string),
  is_active: true,
  sort_order: 0,
};

function PlansTab() {
  const qc = useQueryClient();
  const plans = usePlans();
  const [creating, setCreating] = useState<Omit<PlanRow, "id"> | null>(null);

  const save = useMutation({
    mutationFn: async (payload: Omit<PlanRow, "id">) => {
      const { error } = await supabase.from("platform_plans").insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تمت إضافة الباقة");
      setCreating(null);
      await qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر الحفظ"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreating({ ...EMPTY_PLAN })}
          className="h-10 px-4 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center gap-2"
        >
          <Plus className="size-4" /> باقة جديدة
        </button>
      </div>

      {creating && (
        <PlanForm
          value={creating}
          onChange={setCreating}
          onCancel={() => setCreating(null)}
          onSave={() => save.mutate(creating)}
          busy={save.isPending}
        />
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {(plans.data ?? []).map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: PlanRow }) {
  const qc = useQueryClient();
  const [edit, setEdit] = useState<Omit<PlanRow, "id"> | null>(null);

  const mut = useMutation({
    mutationFn: async (patch: Partial<PlanRow>) => {
      const { error } = await supabase.from("platform_plans").update(patch).eq("id", plan.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تم الحفظ");
      setEdit(null);
      await qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر الحفظ"),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("platform_plans").delete().eq("id", plan.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("تم حذف الباقة");
      await qc.invalidateQueries({ queryKey: ["platform"] });
    },
    onError: () => toast.error("تعذّر الحذف — قد تكون الباقة مرتبطة بمتاجر"),
  });

  if (edit) {
    return (
      <div className="md:col-span-2 xl:col-span-3">
        <PlanForm
          value={edit}
          onChange={setEdit}
          onCancel={() => setEdit(null)}
          onSave={() => mut.mutate(edit)}
          busy={mut.isPending}
        />
      </div>
    );
  }

  const moduleLabels = MODULE_OPTIONS.filter(([k]) => (plan.enabled_modules ?? []).includes(k)).map(
    ([, l]) => l,
  );

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

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Chip label="الفروع" value={plan.max_branches} />
        <Chip label="الموظفون" value={plan.max_staff} />
        <Chip label="الخدمات" value={plan.max_services} />
        <Chip label="العملاء" value={plan.max_customers} />
        <Chip label="الفواتير شهريًا" value={plan.max_invoices > 0 ? plan.max_invoices : "غير محدود"} />
        <Chip label="موقع إلكتروني" value={plan.has_website ? "نعم" : "لا"} />
      </div>

      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-1">
          الأقسام المتاحة ({moduleLabels.length})
        </div>
        <div className="flex flex-wrap gap-1">
          {moduleLabels.map((l) => (
            <span key={l} className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-semibold">
              {l}
            </span>
          ))}
        </div>
      </div>

      {(plan.features ?? []).length > 0 && (
        <ul className="text-xs text-muted-foreground space-y-1">
          {plan.features.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>
      )}

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
          onClick={() => mut.mutate({ is_active: !plan.is_active })}
          className="flex-1 h-9 rounded-lg border border-border text-xs font-semibold hover:bg-muted/50"
        >
          {plan.is_active ? "تعطيل" : "تفعيل"}
        </button>
        <button
          type="button"
          onClick={() => del.mutate()}
          className="size-9 grid place-items-center rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10"
          aria-label="حذف الباقة"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Chip({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border px-2 py-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-bold">{value}</div>
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
        <Field label="الرمز (إنجليزي)" value={value.code} onChange={(v) => set("code", v)} />
        <Field label="اسم الباقة" value={value.name} onChange={(v) => set("name", v)} />
        <Field
          label="السعر الشهري"
          type="number"
          value={String(value.price_monthly)}
          onChange={(v) => set("price_monthly", Number(v) || 0)}
        />
        <Field
          label="ترتيب العرض"
          type="number"
          value={String(value.sort_order)}
          onChange={(v) => set("sort_order", Number(v) || 0)}
        />
        <Field
          label="أقصى عدد فروع"
          type="number"
          value={String(value.max_branches)}
          onChange={(v) => set("max_branches", Number(v) || 0)}
        />
        <Field
          label="أقصى عدد موظفين"
          type="number"
          value={String(value.max_staff)}
          onChange={(v) => set("max_staff", Number(v) || 0)}
        />
        <Field
          label="أقصى عدد خدمات"
          type="number"
          value={String(value.max_services)}
          onChange={(v) => set("max_services", Number(v) || 0)}
        />
        <Field
          label="أقصى عدد عملاء"
          type="number"
          value={String(value.max_customers)}
          onChange={(v) => set("max_customers", Number(v) || 0)}
        />
        <Field
          label="أقصى فواتير شهريًا (0 = غير محدود)"
          type="number"
          value={String(value.max_invoices)}
          onChange={(v) => set("max_invoices", Number(v) || 0)}
        />
        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            checked={value.has_website}
            onChange={(e) => set("has_website", e.target.checked)}
            className="size-4 accent-[hsl(var(--primary))]"
          />
          <span className="text-xs font-semibold">تشمل موقعًا إلكترونيًا</span>
        </label>
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
        <legend className="text-xs font-semibold text-muted-foreground">
          الأقسام المتاحة في الباقة
        </legend>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {MODULE_OPTIONS.map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
            >
              <input
                type="checkbox"
                checked={value.enabled_modules.includes(key)}
                onChange={(e) =>
                  set(
                    "enabled_modules",
                    e.target.checked
                      ? [...value.enabled_modules, key]
                      : value.enabled_modules.filter((item) => item !== key),
                  )
                }
                className="size-4 accent-[hsl(var(--primary))]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-xs font-semibold text-muted-foreground">المزايا (سطر لكل ميزة)</span>
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
