import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Check, Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import { useAccount } from "@/hooks/use-account";
import { listBranches } from "@/lib/db/ops-repo";
import {
  listJoinRequests,
  listSignupNotifications,
  markSignupsSeen,
  reviewJoinRequest,
} from "@/lib/db/join-requests-repo";

export const Route = createFileRoute("/_authenticated/join-requests")({
  head: () => ({
    meta: [
      { title: "طلبات الانضمام والتسجيلات — Salon Flow" },
      {
        name: "description",
        content:
          "راجع طلبات الموظفين الجدد ووافق عليها، وتابع إشعارات تسجيل العميلات الجديدة في مشغلك.",
      },
      { property: "og:title", content: "طلبات الانضمام والتسجيلات — Salon Flow" },
      { property: "og:description", content: "الموافقة على الموظفين الجدد ومتابعة التسجيلات." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: JoinRequestsPage,
});

const KIND_LABEL: Record<string, string> = {
  client_signup: "تسجيل عميلة جديدة",
  staff_join_request: "طلب انضمام موظف",
  staff_join_approved: "تم قبول موظف",
  staff_join_rejected: "تم رفض طلب موظف",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short" });
}

function JoinRequestsPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const qc = useQueryClient();
  const [branchByReq, setBranchByReq] = useState<Record<string, string>>({});

  const requests = useQuery({
    queryKey: ["join-requests", salonId],
    queryFn: () => listJoinRequests(salonId as string),
    enabled: !!salonId,
  });
  const notifications = useQuery({
    queryKey: ["signup-notifications", salonId],
    queryFn: () => listSignupNotifications(salonId as string),
    enabled: !!salonId,
  });
  const branches = useQuery({
    queryKey: ["branches", salonId],
    queryFn: () => listBranches(salonId as string),
    enabled: !!salonId,
  });

  useEffect(() => {
    if (notifications.data) markSignupsSeen();
  }, [notifications.data]);

  const review = useMutation({
    mutationFn: (v: { id: string; approve: boolean }) =>
      reviewJoinRequest(v.id, v.approve, branchByReq[v.id] ?? null),
    onSuccess: (_d, v) => {
      toast.success(v.approve ? "تم قبول الموظف وربط حسابه بالمشغل" : "تم رفض الطلب");
      void qc.invalidateQueries({ queryKey: ["join-requests", salonId] });
      void qc.invalidateQueries({ queryKey: ["signup-notifications", salonId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر تنفيذ الإجراء"),
  });

  const pending = useMemo(
    () => (requests.data ?? []).filter((r) => r.status === "pending"),
    [requests.data],
  );
  const history = useMemo(
    () => (requests.data ?? []).filter((r) => r.status !== "pending"),
    [requests.data],
  );

  return (
    <div dir="rtl" className="space-y-6">
      <header>
        <h1 className="text-xl font-bold">طلبات الانضمام والتسجيلات</h1>
        <p className="text-sm text-muted-foreground mt-1">
          الموظف الذي يسجّل بنفسه لا يدخل لوحة العمل قبل موافقتك، والعميلات يظهرن هنا كإشعار
          تسجيل جديد.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold flex items-center gap-2">
          <UserPlus className="size-4 text-primary" aria-hidden />
          طلبات موظفين بانتظار الموافقة
          <span className="text-xs font-semibold rounded-full bg-primary/10 text-primary px-2 py-0.5">
            {pending.length}
          </span>
        </h2>

        {requests.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> جارٍ التحميل…
          </p>
        ) : pending.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">لا توجد طلبات بانتظار المراجعة.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-border bg-muted/30 p-4 flex flex-wrap items-center gap-3"
              >
                <div className="min-w-[180px] flex-1">
                  <div className="font-semibold text-sm">{r.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {r.email ?? "—"} · {r.phone ?? "بدون جوال"}
                    {r.job_title ? ` · ${r.job_title}` : ""}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{fmt(r.created_at)}</div>
                </div>

                <select
                  value={branchByReq[r.id] ?? ""}
                  onChange={(e) => setBranchByReq((p) => ({ ...p, [r.id]: e.target.value }))}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                  aria-label="الفرع"
                >
                  <option value="">اختر الفرع (اختياري)</option>
                  {(branches.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: r.id, approve: true })}
                    className="h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <Check className="size-4" aria-hidden /> موافقة
                  </button>
                  <button
                    type="button"
                    disabled={review.isPending}
                    onClick={() => review.mutate({ id: r.id, approve: false })}
                    className="h-10 px-4 rounded-xl border border-border text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
                  >
                    <X className="size-4" aria-hidden /> رفض
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-bold flex items-center gap-2">
          <BellRing className="size-4 text-primary" aria-hidden /> إشعارات التسجيلات الجديدة
        </h2>
        {notifications.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> جارٍ التحميل…
          </p>
        ) : (notifications.data ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">لا توجد إشعارات بعد.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {(notifications.data ?? []).map((n) => (
              <li key={n.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{n.title ?? KIND_LABEL[n.kind] ?? n.kind}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {fmt(n.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-bold">سجل الطلبات المراجعة</h2>
          <ul className="mt-3 divide-y divide-border">
            {history.map((r) => (
              <li key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold">{r.name}</span>
                <span
                  className={
                    "text-xs font-bold rounded-full px-2 py-0.5 " +
                    (r.status === "approved"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-destructive/10 text-destructive")
                  }
                >
                  {r.status === "approved" ? "مقبول" : "مرفوض"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
