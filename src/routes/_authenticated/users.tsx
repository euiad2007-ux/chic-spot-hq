import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ShieldCheck, Trash2 } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useAccount } from "@/hooks/use-account";
import { ROLE_LABEL, type AppRole } from "@/lib/account";
import { listMembers, removeMember, updateMemberBranch, updateMemberRole } from "@/lib/db/members-repo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "المستخدمون والصلاحيات | Salon Flow" },
      {
        name: "description",
        content:
          "إدارة مستخدمي المشغل وصلاحياتهم: مالك، مدير فرع، أخصائي، عميل — مع ربط كل مستخدم بفرعه.",
      },
      { property: "og:title", content: "المستخدمون والصلاحيات — Salon Flow" },
      { property: "og:description", content: "تحكم كامل في أدوار المستخدمين وصلاحيات الوصول." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});

const ASSIGNABLE: AppRole[] = ["salon_owner", "branch_manager", "staff", "client"];

const PERMISSIONS: { role: AppRole; areas: string }[] = [
  { role: "salon_owner", areas: "كل الأقسام: المحاسبة، الرواتب، الفروع، الاشتراك، الصلاحيات" },
  { role: "branch_manager", areas: "التشغيل والحجوزات ونقطة البيع والمخزون والتقارير (بدون الاشتراك)" },
  { role: "staff", areas: "لوحته الشخصية، الحجوزات المخصصة له، الحضور والانصراف" },
  { role: "client", areas: "لوحة العميل: حجوزاته، محفظته، نقاط الولاء" },
];

function UsersPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const qc = useQueryClient();

  const members = useQuery({
    queryKey: ["salon-members", salonId],
    queryFn: () => listMembers(salonId!),
    enabled: !!salonId,
  });

  const branches = useQuery({
    queryKey: ["branches-lite", salonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id,name")
        .eq("salon_id", salonId!)
        .order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!salonId,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["salon-members", salonId] });

  const setRole = useMutation({
    mutationFn: (v: { id: string; role: AppRole }) => updateMemberRole(v.id, v.role),
    onSuccess: () => {
      toast.success("تم تحديث الصلاحية");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setBranch = useMutation({
    mutationFn: (v: { id: string; branchId: string | null }) => updateMemberBranch(v.id, v.branchId),
    onSuccess: () => {
      toast.success("تم تحديث الفرع");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeMember(id),
    onSuccess: () => {
      toast.success("تم إزالة المستخدم من المشغل");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="المستخدمون والصلاحيات" subtitle="أدوار الوصول وربط المستخدمين بالفروع">
      <div className="space-y-4">
        <section className="rounded-2xl border border-border bg-card overflow-x-auto">
          <h2 className="p-4 font-bold flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" /> مستخدمو المشغل ({members.data?.length ?? 0})
          </h2>
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-3 text-right">المستخدم</th>
                <th className="p-3 text-right">الجوال</th>
                <th className="p-3 text-right">الصلاحية</th>
                <th className="p-3 text-right">الفرع</th>
                <th className="p-3 text-right">تاريخ الإضافة</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {(members.data ?? []).map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="p-3 font-semibold">{m.full_name ?? "مستخدم بدون اسم"}</td>
                  <td className="p-3 text-muted-foreground">{m.phone ?? "—"}</td>
                  <td className="p-3">
                    {m.role === "platform_owner" ? (
                      <span className="rounded-full border border-primary/30 bg-primary/10 text-primary px-2 py-0.5 text-xs font-bold">
                        {ROLE_LABEL[m.role]}
                      </span>
                    ) : (
                      <select
                        value={m.role}
                        onChange={(e) => setRole.mutate({ id: m.id, role: e.target.value as AppRole })}
                        className="input h-10"
                      >
                        {ASSIGNABLE.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="p-3">
                    <select
                      value={m.branch_id ?? ""}
                      onChange={(e) =>
                        setBranch.mutate({ id: m.id, branchId: e.target.value || null })
                      }
                      className="input h-10"
                    >
                      <option value="">كل الفروع</option>
                      {(branches.data ?? []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 whitespace-nowrap text-muted-foreground">
                    {m.created_at.slice(0, 10)}
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => {
                        if (confirm("إزالة هذا المستخدم من المشغل؟")) remove.mutate(m.id);
                      }}
                      aria-label="إزالة"
                      className="h-9 w-9 rounded-lg border border-border grid place-items-center text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {(members.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    لا يوجد مستخدمون مرتبطون بهذا المشغل بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 space-y-2">
          <h2 className="font-bold">مصفوفة الصلاحيات</h2>
          {PERMISSIONS.map((p) => (
            <div key={p.role} className="flex flex-wrap gap-2 items-baseline text-sm py-1 border-t border-border pt-2">
              <span className="font-bold min-w-28">{ROLE_LABEL[p.role]}</span>
              <span className="text-muted-foreground">{p.areas}</span>
            </div>
          ))}
        </section>
      </div>
    </AppShell>
  );
}
