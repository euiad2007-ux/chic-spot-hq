import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Layers, Plus, RefreshCw, Trash2 } from "lucide-react";

import { AppShell } from "@/components/salon/app-shell";
import { AccountingNav } from "@/components/salon/accounting-nav";
import { useAccount } from "@/hooks/use-account";
import { formatSAR } from "@/lib/salon-store";
import { SOURCE_LABEL } from "@/lib/db/journal-repo";
import {
  KIND_LABEL,
  KIND_SIDE,
  deleteAccount,
  listAccounts,
  loadLedger,
  saveAccount,
  seedAccounts,
  type AccountKind,
} from "@/lib/db/coa-repo";

export const Route = createFileRoute("/_authenticated/accounting/accounts")({
  head: () => ({
    meta: [
      { title: "دليل الحسابات ودفتر الأستاذ العام | Salon Flow" },
      {
        name: "description",
        content:
          "شجرة حسابات عربية كاملة للمشغل مع دفتر الأستاذ العام لكل حساب: الحركات، المدين والدائن، والرصيد المتحرك.",
      },
      { property: "og:title", content: "دليل الحسابات ودفتر الأستاذ — Salon Flow" },
      { property: "og:description", content: "إدارة شجرة الحسابات ومتابعة حركة كل حساب." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccountsPage,
});

const KINDS: AccountKind[] = ["asset", "liability", "equity", "revenue", "expense"];
const monthStart = () => new Date().toISOString().slice(0, 8) + "01";
const today = () => new Date().toISOString().slice(0, 10);

function AccountsPage() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const qc = useQueryClient();

  const [tab, setTab] = useState<"tree" | "ledger">("tree");
  const [kind, setKind] = useState<AccountKind | "all">("all");
  const [form, setForm] = useState<{
    id?: string;
    code: string;
    name: string;
    kind: AccountKind;
    parent_code: string;
    note: string;
  } | null>(null);

  const [ledgerCode, setLedgerCode] = useState("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());

  const accounts = useQuery({
    queryKey: ["chart-accounts", salonId],
    queryFn: () => listAccounts(salonId!),
    enabled: !!salonId,
  });

  const rows = useMemo(
    () => (accounts.data ?? []).filter((a) => kind === "all" || a.kind === kind),
    [accounts.data, kind],
  );

  const selected = (accounts.data ?? []).find((a) => a.code === ledgerCode);

  const ledger = useQuery({
    queryKey: ["ledger", salonId, ledgerCode, from, to],
    queryFn: () =>
      loadLedger(salonId!, ledgerCode, from, to, selected ? KIND_SIDE[selected.kind] : "debit"),
    enabled: !!salonId && !!ledgerCode,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["chart-accounts", salonId] });
    void qc.invalidateQueries({ queryKey: ["ledger", salonId] });
  };

  const save = useMutation({
    mutationFn: () =>
      saveAccount(salonId!, {
        id: form?.id,
        code: form!.code,
        name: form!.name,
        kind: form!.kind,
        parent_code: form!.parent_code,
        note: form!.note,
      }),
    onSuccess: () => {
      toast.success("تم حفظ الحساب");
      setForm(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      toast.success("تم حذف الحساب");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const seed = useMutation({
    mutationFn: () => seedAccounts(salonId!),
    onSuccess: (n) => {
      toast.success(n > 0 ? `تمت إضافة ${n} حساب نظامي` : "الحسابات النظامية موجودة بالكامل");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell
      title="دليل الحسابات"
      subtitle="شجرة الحسابات ودفتر الأستاذ العام لكل حساب"
      action={
        <button
          onClick={() =>
            setForm({ code: "", name: "", kind: "expense", parent_code: "", note: "" })
          }
          className="h-11 px-5 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-2"
        >
          <Plus className="size-4" /> حساب جديد
        </button>
      }
    >
      <div className="space-y-4">
        <AccountingNav />
        <nav className="flex flex-wrap gap-2">
          <TabBtn active={tab === "tree"} onClick={() => setTab("tree")} label="شجرة الحسابات" />
          <TabBtn active={tab === "ledger"} onClick={() => setTab("ledger")} label="دفتر الأستاذ العام" />
        </nav>

        {tab === "tree" && (
          <>
            <section className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setKind("all")}
                className={chip(kind === "all")}
              >
                الكل ({accounts.data?.length ?? 0})
              </button>
              {KINDS.map((k) => (
                <button key={k} onClick={() => setKind(k)} className={chip(kind === k)}>
                  {KIND_LABEL[k]}
                </button>
              ))}
              <button
                onClick={() => seed.mutate()}
                disabled={!salonId || seed.isPending}
                className="ms-auto h-10 px-4 rounded-xl border border-border font-bold text-sm inline-flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className="size-4" /> استعادة الحسابات النظامية
              </button>
            </section>

            {form && (
              <section className="rounded-2xl border border-primary/30 bg-card p-4 space-y-3">
                <h2 className="font-bold">{form.id ? "تعديل حساب" : "حساب جديد"}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="رمز الحساب">
                    <input
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="5030"
                      className="input"
                    />
                  </Field>
                  <Field label="اسم الحساب">
                    <input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="إيجار المحل"
                      className="input"
                    />
                  </Field>
                  <Field label="نوع الحساب">
                    <select
                      value={form.kind}
                      onChange={(e) => setForm({ ...form, kind: e.target.value as AccountKind })}
                      className="input"
                    >
                      {KINDS.map((k) => (
                        <option key={k} value={k}>
                          {KIND_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="الحساب الأب (اختياري)">
                    <select
                      value={form.parent_code}
                      onChange={(e) => setForm({ ...form, parent_code: e.target.value })}
                      className="input"
                    >
                      <option value="">— بدون —</option>
                      {(accounts.data ?? [])
                        .filter((a) => !a.parent_code)
                        .map((a) => (
                          <option key={a.code} value={a.code}>
                            {a.code} — {a.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>
                <Field label="ملاحظات">
                  <input
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="input"
                  />
                </Field>
                <div className="flex gap-2">
                  <button
                    onClick={() => save.mutate()}
                    disabled={!form.code.trim() || !form.name.trim() || save.isPending}
                    className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setForm(null)}
                    className="h-11 px-5 rounded-xl border border-border font-bold"
                  >
                    إلغاء
                  </button>
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-border bg-card overflow-x-auto">
              <h2 className="p-4 font-bold flex items-center gap-2">
                <Layers className="size-4 text-primary" /> الحسابات ({rows.length})
              </h2>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3 text-right">الرمز</th>
                    <th className="p-3 text-right">الاسم</th>
                    <th className="p-3 text-right">النوع</th>
                    <th className="p-3 text-right">الأب</th>
                    <th className="p-3 text-right">الحالة</th>
                    <th className="p-3 text-right">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="p-3 font-mono text-xs">{a.code}</td>
                      <td className="p-3 font-semibold">{a.name}</td>
                      <td className="p-3">{KIND_LABEL[a.kind]}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">
                        {a.parent_code ?? "—"}
                      </td>
                      <td className="p-3">
                        {a.is_system ? (
                          <span className="rounded-full border border-primary/30 bg-primary/10 text-primary px-2 py-0.5 text-xs font-bold">
                            نظامي
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">حساب مخصص</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setLedgerCode(a.code);
                              setTab("ledger");
                            }}
                            className="h-9 px-3 rounded-lg border border-border text-xs font-bold"
                          >
                            الأستاذ
                          </button>
                          <button
                            onClick={() =>
                              setForm({
                                id: a.id,
                                code: a.code,
                                name: a.name,
                                kind: a.kind,
                                parent_code: a.parent_code ?? "",
                                note: a.note ?? "",
                              })
                            }
                            className="h-9 px-3 rounded-lg border border-border text-xs font-bold"
                          >
                            تعديل
                          </button>
                          {!a.is_system && (
                            <button
                              onClick={() => {
                                if (confirm(`حذف الحساب ${a.code}؟`)) remove.mutate(a.id);
                              }}
                              aria-label="حذف"
                              className="h-9 w-9 rounded-lg border border-border grid place-items-center text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        لا توجد حسابات بهذا التصنيف.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}

        {tab === "ledger" && (
          <>
            <section className="rounded-2xl border border-border bg-card p-4 grid gap-3 sm:grid-cols-3">
              <Field label="الحساب">
                <select
                  value={ledgerCode}
                  onChange={(e) => setLedgerCode(e.target.value)}
                  className="input"
                >
                  <option value="">— اختر الحساب —</option>
                  {(accounts.data ?? []).map((a) => (
                    <option key={a.code} value={a.code}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="من تاريخ">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input" />
              </Field>
              <Field label="إلى تاريخ">
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input" />
              </Field>
            </section>

            <section className="rounded-2xl border border-border bg-card overflow-x-auto">
              <h2 className="p-4 font-bold flex items-center gap-2">
                <BookOpen className="size-4 text-primary" />
                دفتر الأستاذ {selected ? `— ${selected.code} ${selected.name}` : ""}
              </h2>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3 text-right">التاريخ</th>
                    <th className="p-3 text-right">المصدر</th>
                    <th className="p-3 text-right">البيان</th>
                    <th className="p-3 text-right">مدين</th>
                    <th className="p-3 text-right">دائن</th>
                    <th className="p-3 text-right">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {(ledger.data?.rows ?? []).map((r, i) => (
                    <tr key={`${r.entry_id}-${i}`} className="border-t border-border">
                      <td className="p-3 whitespace-nowrap">{r.entry_date}</td>
                      <td className="p-3 text-xs">{SOURCE_LABEL[r.source] ?? r.source}</td>
                      <td className="p-3 text-muted-foreground">{r.memo ?? "—"}</td>
                      <td className="p-3">{r.debit ? formatSAR(r.debit) : "—"}</td>
                      <td className="p-3">{r.credit ? formatSAR(r.credit) : "—"}</td>
                      <td className="p-3 font-bold">{formatSAR(r.balance)}</td>
                    </tr>
                  ))}
                  {(!ledgerCode || (ledger.data?.rows.length ?? 0) === 0) && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        {ledgerCode ? "لا توجد حركات في هذه الفترة." : "اختر حسابًا لعرض حركاته."}
                      </td>
                    </tr>
                  )}
                </tbody>
                {ledger.data && ledger.data.rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30 font-bold">
                      <td className="p-3" colSpan={3}>
                        الإجمالي / الرصيد الختامي
                      </td>
                      <td className="p-3">{formatSAR(ledger.data.totalDebit)}</td>
                      <td className="p-3">{formatSAR(ledger.data.totalCredit)}</td>
                      <td className="p-3">{formatSAR(ledger.data.closing)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

const chip = (active: boolean) =>
  active
    ? "h-10 px-4 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
    : "h-10 px-4 rounded-xl border border-border font-bold text-sm text-muted-foreground";

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={chip(active)}>
      {label}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
