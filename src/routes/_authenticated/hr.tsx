import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users2,
  Wallet,
  Fingerprint,
  UserPlus,
  AlarmClock,
  ArrowLeft,
} from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { useSalon } from "@/lib/salon-store";
import { listJoinRequests } from "@/lib/db/join-requests-repo";
import { currentSalonId } from "@/lib/db/hydrate";

export const Route = createFileRoute("/_authenticated/hr")({
  head: () => ({
    meta: [
      { title: "الموارد البشرية — لمسة" },
      { name: "description", content: "مركز الموارد البشرية: الموظفون، الرواتب، الحضور والانصراف، وطلبات الانضمام." },
      { property: "og:title", content: "الموارد البشرية" },
      { property: "og:description", content: "إدارة الموظفين والرواتب والحضور وطلبات الانضمام في مكان واحد." },
    ],
  }),
  component: HrPage,
});

const CARDS = [
  {
    to: "/staff",
    label: "الموظفون",
    desc: "بطاقات الموظفين، العقود، الرواتب، النقاط والملاحظات",
    icon: Users2,
  },
  {
    to: "/payroll",
    label: "الرواتب والعمولات",
    desc: "احتساب الرواتب والبدلات والعمولات وإصدار المسيرات",
    icon: Wallet,
  },
  {
    to: "/attendance",
    label: "الحضور والانصراف",
    desc: "تسجيل الحضور بالموقع الجغرافي ومتابعة الدوام",
    icon: Fingerprint,
  },
  {
    to: "/join-requests",
    label: "طلبات الانضمام والتسجيلات",
    desc: "مراجعة طلبات الموظفين الجدد والتسجيلات الواردة",
    icon: UserPlus,
  },
] as const;

function HrPage() {
  const staff = useSalon((s) => s.staff);
  const activeStaff = staff.filter((s) => s.active).length;
  const salonId = currentSalonId();
  const requests = useQuery({
    queryKey: ["join-requests", "hr", salonId],
    enabled: !!salonId,
    queryFn: () => listJoinRequests(salonId as string),
  });
  const pending = (requests.data ?? []).filter((r) => r.status === "pending").length;

  return (
    <AppShell title="الموارد البشرية" subtitle="كل ما يتعلق بالموظفين في مكان واحد">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="إجمالي الموظفين" value={String(staff.length)} />
        <Stat label="على رأس العمل" value={String(activeStaff)} />
        <Stat label="طلبات قيد المراجعة" value={String(pending)} />
        <Stat label="غير نشطين" value={String(staff.length - activeStaff)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARDS.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="glass-card rounded-2xl p-5 flex items-start gap-4 border border-border hover:border-primary/40 transition group"
          >
            <div className="size-12 rounded-xl bg-primary/15 text-primary grid place-items-center shrink-0">
              <c.icon className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold flex items-center gap-2">
                {c.label}
                <ArrowLeft className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 glass-card rounded-2xl p-5">
        <div className="font-bold mb-1 inline-flex items-center gap-2">
          <AlarmClock className="size-4 text-primary" /> ملاحظة
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          يتم تسجيل حالات التأخر عن الحجوزات وفروقات ورديات الصندوق تلقائيًا في ملف الموظف داخل صفحة
          الموظفين.
        </p>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
