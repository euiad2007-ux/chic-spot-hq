/**
 * Shift console for the reception / bookings board.
 * - Opens a full-screen, touch friendly dialog when no shift is open for the branch:
 *   cashier (staff)選択, opening cash, opening card-terminal amount, and the date/time stamp.
 * - Shows a live bar with cash / card totals while the shift is open.
 * - On close: prints a closing report (تقرير الإغلاق).
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Banknote, CreditCard, Clock, Lock, LockOpen, Printer, Scale, UserCircle, X, CheckCircle2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAccount } from "@/hooks/use-account";
import { formatSAR, useSalon } from "@/lib/salon-store";
import { useActiveBranch } from "@/lib/active-branch";
import { scopeToBranch } from "@/lib/branch-scope";
import {
  listBranches, listShifts, findOpenShift, openShift as openShiftRpc,
  closeShift as closeShiftRpc, setShiftClosingExtras, shiftTotals,
  type CashShift, type ShiftClosing,
} from "@/lib/db/ops-repo";

const nowStamp = () =>
  new Date().toLocaleString("ar-SA", {
    dateStyle: "full",
    timeStyle: "short",
    calendar: "gregory",
    numberingSystem: "latn",
  });

/* --------------------------------- keypad --------------------------------- */

function MoneyField({
  label, icon: Icon, value, onChange,
}: {
  label: string;
  icon: typeof Banknote;
  value: number;
  onChange: (v: number) => void;
}) {
  const quick = [0, 50, 100, 200, 500, 1000];
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Icon className="size-4 text-primary" /> {label}
      </div>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full h-12 rounded-xl border border-border bg-muted/40 px-4 text-center text-2xl font-black tabular-nums outline-none focus:border-primary"
      />
      <div className="grid grid-cols-3 gap-2">
        {quick.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => onChange(q === 0 ? 0 : value + q)}
            className="h-9 rounded-xl border border-border bg-muted/30 text-xs font-bold active:scale-95 transition hover:border-primary/50"
          >
            {q === 0 ? "تصفير" : `+${q}`}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------- open dialog ------------------------------ */

function OpenShiftDialog({
  branchName, onSubmit, onSkip, pending,
}: {
  branchName?: string;
  onSubmit: (v: { cashierStaffId: string | null; cashierName: string; cash: number; card: number }) => void;
  onSkip: () => void;
  pending: boolean;
}) {
  const allStaff = useSalon((s) => s.staff);
  const branchId = useActiveBranch();
  const staff = useMemo(
    () => scopeToBranch(allStaff, branchId).filter((s) => s.active),
    [allStaff, branchId],
  );
  const [staffId, setStaffId] = useState("");
  const [manualName, setManualName] = useState("");
  const [cash, setCash] = useState(0);
  const [card, setCard] = useState(0);
  const [stamp, setStamp] = useState(nowStamp());

  useEffect(() => {
    const t = setInterval(() => setStamp(nowStamp()), 30_000);
    return () => clearInterval(t);
  }, []);

  const chosenName = staff.find((s) => s.id === staffId)?.name ?? manualName.trim();

  return (
    <div className="fixed inset-0 z-[60] bg-background/85 backdrop-blur-md flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col glass-card m-0 sm:m-3 rounded-none sm:rounded-3xl overflow-hidden">
        <header className="shrink-0 px-5 py-4 border-b border-border flex items-center gap-3 bg-card/95">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center shrink-0">
            <LockOpen className="size-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-lg truncate">بدء وردية الحجوزات</h2>
            <p className="text-xs text-muted-foreground truncate">
              {branchName ? `الفرع: ${branchName} · ` : ""}اختر موظف الاستقبال وأدخل الأرصدة الافتتاحية
            </p>
          </div>
          <button
            onClick={onSkip}
            className="h-9 px-3 rounded-xl border border-border text-xs font-semibold hover:text-primary"
          >
            لاحقاً
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
            <Clock className="size-5 text-primary shrink-0" />
            <div>
              <div className="text-[11px] text-muted-foreground">تاريخ ووقت الفتح (يُسجَّل تلقائياً)</div>
              <div className="font-bold text-sm">{stamp}</div>
            </div>
          </div>

          <section className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <UserCircle className="size-4 text-primary" /> موظف الصندوق / الاستقبال
            </div>
            {staff.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {staff.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setStaffId(s.id); setManualName(""); }}
                    className={cn(
                      "h-16 rounded-xl border p-2.5 text-right transition active:scale-95",
                      staffId === s.id
                        ? "border-primary bg-primary/10 shadow-[var(--shadow-glow)]"
                        : "border-border bg-muted/30 hover:border-primary/40",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="size-9 rounded-full bg-primary/15 grid place-items-center text-primary font-bold shrink-0">
                        {s.name.charAt(0)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-bold text-sm truncate">{s.name}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">{s.role}</span>
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">لا يوجد موظفون لهذا الفرع — اكتب الاسم يدوياً.</p>
            )}
            <input
              value={manualName}
              onChange={(e) => { setManualName(e.target.value); setStaffId(""); }}
              placeholder="أو اكتب اسم الموظف يدوياً"
              className="w-full h-10 rounded-xl border border-border bg-muted/40 px-3 text-sm outline-none focus:border-primary"
            />
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <MoneyField label="قيمة الكاش في الصندوق" icon={Banknote} value={cash} onChange={setCash} />
            <MoneyField label="قيمة المبلغ في الجهاز (الشبكة)" icon={CreditCard} value={card} onChange={setCard} />
          </div>
        </div>

        <footer className="shrink-0 border-t border-border bg-card/95 p-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 text-sm">
            <span className="text-muted-foreground">الإجمالي الافتتاحي: </span>
            <strong className="gradient-text text-lg">{formatSAR(cash + card)}</strong>
          </div>
          <button
            onClick={() => {
              if (!chosenName) return toast.error("اختر موظف الصندوق أو اكتب الاسم");
              onSubmit({ cashierStaffId: staffId || null, cashierName: chosenName, cash, card });
            }}
            disabled={pending}
            className="w-full sm:w-auto h-11 px-6 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition"
          >
            <CheckCircle2 className="size-4" /> بدء الوردية
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------ close + report ----------------------------- */

interface ClosingReport extends ShiftClosing {
  cashierName: string | null;
  branchName?: string;
  openedAt: string;
  closedAt: string;
  openingFloat: number;
  openingCard: number;
  countedCard: number;
  note: string;
}

function CloseShiftDialog({
  shift, branchName, expected, cardSales, cashExpenses, onDone, onCancel,
}: {
  shift: CashShift;
  branchName?: string;
  expected: number;
  cardSales: number;
  cashExpenses: number;
  onDone: (r: ClosingReport) => void;
  onCancel: () => void;
}) {
  const [counted, setCounted] = useState(0);
  const [countedCard, setCountedCard] = useState(0);
  const [note, setNote] = useState("");

  const close = useMutation({
    mutationFn: async () => {
      const res = await closeShiftRpc(shift.id, counted, note || undefined);
      await setShiftClosingExtras(shift.id, {
        countedCard,
        cashDiff: Number(res.counted_cash) - Number(res.expected_cash),
        cardDiff: countedCard - (Number(shift.opening_card ?? 0) + Number(res.card_sales)),
      }).catch(() => undefined);
      return res;
    },
    onSuccess: (res) => {
      onDone({
        ...res,
        cashierName: shift.cashier_name,
        branchName,
        openedAt: shift.opened_at,
        closedAt: new Date().toISOString(),
        openingFloat: Number(shift.opening_float),
        openingCard: Number(shift.opening_card ?? 0),
        countedCard,
        note,
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const diff = counted - expected;

  return (
    <div className="fixed inset-0 z-[60] bg-background/85 backdrop-blur-md flex flex-col">
      <div className="flex-1 min-h-0 flex flex-col glass-card m-0 sm:m-3 rounded-none sm:rounded-3xl overflow-hidden">
        <header className="shrink-0 px-5 py-4 border-b border-border flex items-center gap-3 bg-card/95">
          <div className="size-11 rounded-2xl bg-gradient-to-br from-primary to-accent grid place-items-center shrink-0">
            <Lock className="size-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-lg truncate">إغلاق الحجوزات والوردية</h2>
            <p className="text-xs text-muted-foreground truncate">
              عُدّ النقد والمبلغ في الجهاز ثم أصدر تقرير الإغلاق
            </p>
          </div>
          <button onClick={onCancel} className="size-9 rounded-xl border border-border grid place-items-center hover:text-primary">
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="موظف الوردية" value={shift.cashier_name ?? "—"} />
            <Stat label="العهدة الافتتاحية" value={formatSAR(Number(shift.opening_float))} />
            <Stat label="افتتاحي الجهاز" value={formatSAR(Number(shift.opening_card ?? 0))} />
            <Stat label="مصروفات نقدية" value={formatSAR(cashExpenses)} />
          </div>

          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">النقد المتوقع</span>
              <strong className="text-primary text-lg">{formatSAR(expected)}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">مبيعات الشبكة</span>
              <strong className="text-lg">{formatSAR(cardSales)}</strong>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <MoneyField label="النقد المعدود فعلياً" icon={Banknote} value={counted} onChange={setCounted} />
            <MoneyField label="المبلغ المعدود في الجهاز" icon={CreditCard} value={countedCard} onChange={setCountedCard} />
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold flex items-center gap-2"><Scale className="size-4 text-primary" /> فرق النقد</span>
              <strong className={diff === 0 ? "text-success" : "text-destructive"}>{formatSAR(diff)}</strong>
            </div>
            <p className="text-[11px] text-muted-foreground">
              أي فرق (نقص أو زيادة) يُسجَّل على موظف الوردية: {shift.cashier_name ?? "—"}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="ملاحظة الإغلاق (اختياري)"
              className="w-full rounded-xl border border-border bg-muted/40 p-3 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>

        <footer className="shrink-0 border-t border-border bg-card/95 p-4">
          <button
            onClick={() => close.mutate()}
            disabled={close.isPending}
            className="w-full h-11 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60 active:scale-95 transition"
          >
            <Lock className="size-4" /> إغلاق وإصدار تقرير الإغلاق
          </button>
        </footer>
      </div>
    </div>
  );
}

function ReportDialog({ report, onClose }: { report: ClosingReport; onClose: () => void }) {
  const print = () => {
    document.body.classList.add("printing-shift");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-shift"), 400);
  };
  const fmtDT = (iso: string) =>
    new Date(iso).toLocaleString("ar-SA", { dateStyle: "medium", timeStyle: "short", calendar: "gregory", numberingSystem: "latn" });
  const cardDiff = report.countedCard - (report.openingCard + report.card_sales);

  const rows: [string, string][] = [
    ["موظف الوردية", report.cashierName ?? "—"],
    ["الفرع", report.branchName ?? "—"],
    ["وقت الفتح", fmtDT(report.openedAt)],
    ["وقت الإغلاق", fmtDT(report.closedAt)],
    ["العهدة الافتتاحية (كاش)", formatSAR(report.openingFloat)],
    ["افتتاحي الجهاز (شبكة)", formatSAR(report.openingCard)],
    ["مبيعات نقدية", formatSAR(Number(report.cash_sales))],
    ["مبيعات شبكة", formatSAR(Number(report.card_sales))],
    ["مصروفات نقدية", formatSAR(Number(report.cash_expenses))],
    ["النقد المتوقع", formatSAR(Number(report.expected_cash))],
    ["النقد المعدود", formatSAR(Number(report.counted_cash))],
    ["فرق النقد", formatSAR(Number(report.difference))],
    ["المعدود في الجهاز", formatSAR(report.countedCard)],
    ["فرق الجهاز", formatSAR(cardDiff)],
    ["الفرق مسجّل على", report.cashierName ?? "—"],
    ["ملاحظة", report.note || "—"],
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-background/85 backdrop-blur-md flex items-center justify-center p-3">
      <div className="glass-card w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl shift-print">
        <div className="p-6 space-y-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black">تقرير إغلاق الوردية</h2>
            <p className="text-xs text-muted-foreground">Shift Closing Report</p>
          </div>
          <div className="rounded-2xl border border-border divide-y divide-border">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">{k}</span>
                <strong className="tabular-nums">{v}</strong>
              </div>
            ))}
          </div>
          <div className="flex gap-2 print:hidden">
            <button onClick={print} className="flex-1 h-10 rounded-xl border border-border text-sm font-bold inline-flex items-center justify-center gap-2 hover:text-primary">
              <Printer className="size-4" /> طباعة / PDF
            </button>
            <button onClick={onClose} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold">
              تم
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/20 p-3">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="font-bold text-sm truncate">{value}</div>
    </div>
  );
}

/* ------------------------------- main console ------------------------------ */

export function ShiftConsole() {
  const { data: account } = useAccount();
  const salonId = account?.salonId ?? null;
  const branchId = useActiveBranch();
  const qc = useQueryClient();
  const [skipped, setSkipped] = useState(false);
  const [closing, setClosing] = useState(false);
  const [report, setReport] = useState<ClosingReport | null>(null);

  const branches = useQuery({
    queryKey: ["branches", salonId],
    queryFn: () => listBranches(salonId!),
    enabled: !!salonId,
  });
  const shifts = useQuery({
    queryKey: ["shifts", salonId],
    queryFn: () => listShifts(salonId!),
    enabled: !!salonId,
  });

  const activeBranch = branchId ?? branches.data?.[0]?.id ?? null;
  const branchName = branches.data?.find((b) => b.id === activeBranch)?.name;
  const current = useMemo(
    () => (shifts.data ? findOpenShift(shifts.data, activeBranch) : null),
    [shifts.data, activeBranch],
  );

  const totals = useQuery({
    queryKey: ["shift-totals", current?.id],
    queryFn: () => shiftTotals(current!.id),
    enabled: !!current,
    refetchInterval: 30_000,
  });

  const expected =
    (current ? Number(current.opening_float) : 0) +
    (totals.data?.cash ?? 0) -
    (totals.data?.cashExpenses ?? 0);

  const open = useMutation({
    mutationFn: (v: { cashierStaffId: string | null; cashierName: string; cash: number; card: number }) =>
      openShiftRpc(salonId!, activeBranch, v.cash, {
        cashierStaffId: v.cashierStaffId,
        cashierName: v.cashierName,
        openingCard: v.card,
      }),
    onSuccess: () => {
      toast.success("تم بدء الوردية");
      void qc.invalidateQueries({ queryKey: ["shifts", salonId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const showOpen = !!salonId && !shifts.isLoading && !current && !skipped;

  return (
    <>
      <div className="rounded-2xl border border-border bg-card/60 px-4 py-3 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold border",
            current ? "bg-success/10 text-success border-success/30" : "bg-muted/40 text-muted-foreground border-border",
          )}
        >
          {current ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
          {current ? "وردية مفتوحة" : "لا توجد وردية"}
        </span>
        {current && (
          <>
            <Chip icon={UserCircle} label={current.cashier_name ?? "—"} />
            <Chip icon={Clock} label={new Date(current.opened_at).toLocaleString("ar-SA", { dateStyle: "short", timeStyle: "short", calendar: "gregory", numberingSystem: "latn" })} />
            <Chip icon={Banknote} label={`نقد متوقع ${formatSAR(expected)}`} />
            <Chip icon={CreditCard} label={`شبكة ${formatSAR((current ? Number(current.opening_card ?? 0) : 0) + (totals.data?.card ?? 0))}`} />
          </>
        )}
        <div className="ms-auto flex items-center gap-2">
          {current ? (
            <button
              onClick={() => setClosing(true)}
              className="h-9 px-3 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground text-xs font-bold inline-flex items-center gap-2 active:scale-95 transition"
            >
              <Lock className="size-3.5" /> إغلاق الحجوزات
            </button>
          ) : (
            <button
              onClick={() => setSkipped(false)}
              className="h-9 px-3 rounded-xl border border-border text-xs font-bold inline-flex items-center gap-2 hover:text-primary"
            >
              <LockOpen className="size-3.5" /> بدء وردية
            </button>
          )}
        </div>
      </div>

      {showOpen && (
        <OpenShiftDialog
          branchName={branchName}
          pending={open.isPending}
          onSkip={() => setSkipped(true)}
          onSubmit={(v) => open.mutate(v)}
        />
      )}

      {closing && current && (
        <CloseShiftDialog
          shift={current}
          branchName={branchName}
          expected={expected}
          cardSales={totals.data?.card ?? 0}
          cashExpenses={totals.data?.cashExpenses ?? 0}
          onCancel={() => setClosing(false)}
          onDone={(r) => {
            setClosing(false);
            setReport(r);
            setSkipped(true);
            void qc.invalidateQueries({ queryKey: ["shifts", salonId] });
          }}
        />
      )}

      {report && <ReportDialog report={report} onClose={() => setReport(null)} />}
    </>
  );
}

function Chip({ icon: Icon, label }: { icon: typeof Banknote; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs font-semibold">
      <Icon className="size-3.5 text-primary" /> {label}
    </span>
  );
}
