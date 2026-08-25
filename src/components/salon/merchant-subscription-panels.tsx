import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ReceiptText, LifeBuoy, Loader2, Plus, Send } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/use-account";
import { cn } from "@/lib/utils";
import {
  listSubscriptionInvoices,
  listSupportTickets,
  listSupportMessages,
  addSupportMessage,
  createSupportTicket,
  SUB_STATUS_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_PRIORITY_LABEL,
} from "@/lib/db/platform-repo";

const money = (v: number) =>
  `${Number(v || 0).toLocaleString("ar-SA", { maximumFractionDigits: 2 })} ر.س`;

export function MerchantSubscriptionInvoices({ salonId }: { salonId: string | null }) {
  const invoices = useQuery({
    queryKey: ["merchant", "sub-invoices", salonId],
    queryFn: () => listSubscriptionInvoices(salonId),
    enabled: !!salonId,
  });

  const monthInvoices = useQuery({
    queryKey: ["merchant", "invoices-month", salonId],
    queryFn: async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("salon_id", salonId!)
        .gte("created_at", start.toISOString());
      return count ?? 0;
    },
    enabled: !!salonId,
  });

  const rows = invoices.data ?? [];
  const due = rows
    .filter((i) => i.status !== "void")
    .reduce((s, i) => s + (Number(i.total) - Number(i.paid)), 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
      <h2 className="font-bold inline-flex items-center gap-2">
        <ReceiptText className="size-4 text-primary" /> فواتير الاشتراك
      </h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-border p-3">
          <div className="text-xs text-muted-foreground">فواتير المتجر هذا الشهر</div>
          <div className="font-bold mt-1">{monthInvoices.data ?? 0}</div>
        </div>
        <div
          className={cn(
            "rounded-xl border p-3",
            due > 0 ? "border-destructive/40 bg-destructive/5" : "border-border",
          )}
        >
          <div className="text-xs text-muted-foreground">المستحق عليك</div>
          <div className="font-bold mt-1">{money(due)}</div>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">لا توجد فواتير اشتراك بعد.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-right">الفترة</th>
                <th className="p-2 text-right">الإجمالي</th>
                <th className="p-2 text-right">المدفوع</th>
                <th className="p-2 text-right">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="border-t border-border">
                  <td className="p-2 text-xs">
                    {i.period_start} → {i.period_end}
                  </td>
                  <td className="p-2">{money(Number(i.total))}</td>
                  <td className="p-2">{money(Number(i.paid))}</td>
                  <td className="p-2 text-xs">{SUB_STATUS_LABEL[i.status] ?? i.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function MerchantSupport({ salonId }: { salonId: string | null }) {
  const qc = useQueryClient();
  const { data: account } = useAccount();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [form, setForm] = useState({ subject: "", body: "", priority: "normal" });

  const tickets = useQuery({
    queryKey: ["merchant", "tickets", salonId],
    queryFn: () => listSupportTickets(salonId),
    enabled: !!salonId,
  });
  const messages = useQuery({
    queryKey: ["merchant", "ticket-messages", activeId],
    queryFn: () => listSupportMessages(activeId!),
    enabled: !!activeId,
  });

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["merchant"] });
  };

  const open = useMutation({
    mutationFn: () =>
      createSupportTicket({
        salonId: salonId!,
        subject: form.subject.trim(),
        category: "general",
        priority: form.priority,
        body: form.body.trim(),
        fromPlatform: false,
        authorName: account?.fullName ?? "المتجر",
      }),
    onSuccess: async () => {
      toast.success("تم إرسال طلب الدعم");
      setForm({ subject: "", body: "", priority: "normal" });
      await refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر الإرسال"),
  });

  const send = useMutation({
    mutationFn: async () => {
      const t = (tickets.data ?? []).find((x) => x.id === activeId);
      if (!t) throw new Error("اختر تذكرة");
      await addSupportMessage({
        ticketId: t.id,
        salonId: t.salon_id,
        body: reply.trim(),
        fromPlatform: false,
        authorName: account?.fullName ?? "المتجر",
      });
    },
    onSuccess: async () => {
      setReply("");
      await refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "تعذّر الإرسال"),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h2 className="font-bold inline-flex items-center gap-2">
        <LifeBuoy className="size-4 text-primary" /> الدعم الفني
      </h2>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <input
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="موضوع المشكلة"
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm"
          />
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="w-full h-10 rounded-xl border border-input bg-background px-2 text-sm"
          >
            {Object.entries(TICKET_PRIORITY_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={3}
            placeholder="اشرح المشكلة بالتفصيل"
            className="w-full rounded-xl border border-input bg-background p-2 text-sm"
          />
          <button
            type="button"
            disabled={!salonId || !form.subject.trim() || !form.body.trim() || open.isPending}
            onClick={() => open.mutate()}
            className="w-full h-10 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {open.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            إرسال طلب دعم
          </button>
        </div>

        <div className="rounded-xl border border-border divide-y divide-border max-h-64 overflow-y-auto">
          {(tickets.data ?? []).length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground">لا توجد تذاكر.</p>
          ) : (
            (tickets.data ?? []).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "w-full text-right p-3 hover:bg-muted/40",
                  activeId === t.id && "bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold truncate">{t.subject}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-bold">
                    {TICKET_STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(t.created_at).toLocaleDateString("ar-SA")}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {activeId && (
        <div className="space-y-2 border-t border-border pt-3">
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {(messages.data ?? []).map((m) => (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                  m.from_platform ? "bg-primary/10 mr-auto" : "bg-muted ml-auto",
                )}
              >
                <div className="text-[10px] text-muted-foreground mb-0.5">
                  {m.author_name ?? (m.from_platform ? "الدعم الفني" : "المتجر")} ·{" "}
                  {new Date(m.created_at).toLocaleString("ar-SA")}
                </div>
                {m.body}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="اكتب رسالتك…"
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
        </div>
      )}
    </section>
  );
}
