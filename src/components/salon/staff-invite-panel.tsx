import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Mail, UserPlus, X } from "lucide-react";
import { toast } from "sonner";

import {
  cancelStaffInvite,
  createStaffInvite,
  inviteLink,
  listStaffInvites,
} from "@/lib/db/invites-repo";
import { cn } from "@/lib/utils";

export interface InviteBranchOption {
  id: string;
  name: string;
}

const statusLabel: Record<string, string> = {
  pending: "بانتظار القبول",
  accepted: "مقبولة",
  cancelled: "ملغاة",
};

/** Manager-facing dialog to invite a staff member to THIS salon only. */
export function StaffInviteDialog({
  salonId,
  slug,
  branches,
  onClose,
}: {
  salonId: string;
  slug?: string | null;
  branches: InviteBranchOption[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [branchId, setBranchId] = useState("");
  const [busy, setBusy] = useState(false);

  const invitesQuery = useQuery({
    queryKey: ["staff-invites", salonId],
    queryFn: () => listStaffInvites(salonId),
  });
  const invites = invitesQuery.data ?? [];

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("تم النسخ");
    } catch {
      toast.error("تعذّر النسخ");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!name.trim() || !email.trim()) {
      toast.error("الاسم والبريد الإلكتروني مطلوبان");
      return;
    }
    setBusy(true);
    try {
      const inv = await createStaffInvite({
        salonId,
        name,
        email,
        branchId: branchId || null,
        jobTitle: jobTitle || null,
      });
      await qc.invalidateQueries({ queryKey: ["staff-invites", salonId] });
      setName("");
      setEmail("");
      setJobTitle("");
      await copy(inviteLink(inv.code, slug));
      toast.success(`تم إنشاء الدعوة — الرمز ${inv.code}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر إنشاء الدعوة");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    try {
      await cancelStaffInvite(id);
      await qc.invalidateQueries({ queryKey: ["staff-invites", salonId] });
      toast.success("تم إلغاء الدعوة");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تعذّر الإلغاء");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-xl my-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2">
            <UserPlus className="size-4 text-primary" /> دعوة موظف
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted" aria-label="إغلاق">
            <X className="size-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          يُرسل رابط الدعوة لبريد الموظف. عند تسجيل الدخول بنفس البريد وقبول الدعوة يُربط حسابه بهذا
          المشغل فقط، ويمكنه أن يكون عميلاً أو موظفاً في مشاغل أخرى بنفس الحساب.
        </p>

        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <Field label="الاسم" value={name} onChange={setName} />
          <Field label="البريد الإلكتروني" value={email} onChange={setEmail} type="email" />
          <Field label="المسمى الوظيفي" value={jobTitle} onChange={setJobTitle} />
          <label className="text-sm">
            <span className="text-xs font-semibold text-muted-foreground">الفرع</span>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="">كل الفروع</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="sm:col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-l from-primary to-accent text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
            إنشاء الدعوة ونسخ الرابط
          </button>
        </form>

        <div className="mt-5">
          <div className="text-xs font-semibold text-muted-foreground mb-2">الدعوات</div>
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد دعوات بعد.</p>
          ) : (
            <ul className="space-y-2">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{inv.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{inv.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "text-[11px] px-2 py-1 rounded-full",
                        inv.status === "accepted"
                          ? "bg-success/15 text-success"
                          : inv.status === "cancelled"
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/10 text-primary",
                      )}
                    >
                      {statusLabel[inv.status] ?? inv.status}
                    </span>
                    <code className="text-xs font-mono">{inv.code}</code>
                    <button
                      onClick={() => copy(inviteLink(inv.code, slug))}
                      className="rounded-lg border border-border p-1.5 hover:text-primary"
                      aria-label="نسخ رابط الدعوة"
                    >
                      <Copy className="size-3.5" />
                    </button>
                    {inv.status === "pending" && (
                      <button
                        onClick={() => cancel(inv.id)}
                        className="rounded-lg border border-border p-1.5 hover:text-destructive"
                        aria-label="إلغاء الدعوة"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="text-sm">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
      />
    </label>
  );
}
