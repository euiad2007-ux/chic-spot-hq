import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/salon/app-shell";
import { useSalon, formatSAR, formatDate } from "@/lib/salon-store";
import { useAttendance } from "@/lib/attendance-store";
import {
  usePayroll, payrollActions, computeStaffPayroll, hourlyRateFor, fmtHours,
  type Shift, type OvertimeMode,
} from "@/lib/payroll-store";
import { WEEKDAYS, dayLabel, type Weekday } from "@/lib/booking-settings";
import { useSiteSettings } from "@/lib/site-settings";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Settings2, Wallet, Plus, Trash2, Clock, TrendingUp,
  Calendar, DollarSign, CheckCircle2, AlertCircle, X, Timer, ChevronDown, ChevronUp,
  Printer, FileDown, Search,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/payroll")({
  head: () => ({
    meta: [
      { title: "الرواتب — لمسة" },
      { name: "description", content: "ضبط ساعات الدوام والشفتات وحساب رواتب الموظفين تلقائياً من سجل الحضور." },
      { property: "og:title", content: "الرواتب" },
      { property: "og:description", content: "احتساب الرواتب من الحضور مع الأوفر تايم والمدفوعات." },
    ],
  }),
  component: PayrollPage,
});

function PayrollPage() {
  const { staff } = useSalon((s) => s);
  const { records } = useAttendance((s) => s);
  const { settings, payments } = usePayroll((s) => s);
  const [tab, setTab] = useState<"ledger" | "settings">("ledger");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payslipId, setPayslipId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const activeStaff = useMemo(() => staff.filter((s) => s.active), [staff]);

  const totals = useMemo(() => {
    let earned = 0, paid = 0, balance = 0, minutes = 0;
    for (const s of activeStaff) {
      const r = computeStaffPayroll(s, records, payments, settings);
      earned += r.totalEarned; paid += r.totalPaid; balance += r.balance; minutes += r.totalMinutes;
    }
    return { earned, paid, balance, minutes };
  }, [activeStaff, records, payments, settings]);

  return (
    <AppShell
      title="الرواتب"
      subtitle="حساب تلقائي من سجل الحضور — من تاريخ التعيين حتى اليوم"
    >
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SummaryCard icon={<Timer className="size-5" />} label="إجمالي ساعات الحضور" value={fmtHours(totals.minutes)} tone="primary" />
        <SummaryCard icon={<TrendingUp className="size-5" />} label="مستحق" value={formatSAR(totals.earned)} tone="accent" />
        <SummaryCard icon={<CheckCircle2 className="size-5" />} label="مدفوع" value={formatSAR(totals.paid)} tone="success" />
        <SummaryCard icon={<DollarSign className="size-5" />} label="الرصيد" value={formatSAR(totals.balance)} tone="gradient" />
      </div>

      {/* Tabs */}
      <div className="glass-card rounded-2xl p-1.5 inline-flex gap-1 mb-6">
        {([
          ["ledger", "كشف الرواتب", Wallet],
          ["settings", "الإعدادات", Settings2],
        ] as const).map(([k, label, Icon]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "px-4 h-10 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition",
              tab === k
                ? "bg-gradient-to-l from-primary to-accent text-primary-foreground shadow-[var(--shadow-glow)]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "settings" && <SettingsPanel />}

      {tab === "ledger" && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="glass-card rounded-2xl p-3 flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="size-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن موظف..."
                className="w-full h-10 rounded-lg bg-muted/40 border border-border pr-9 pl-3 text-sm"
              />
            </div>
            <button
              onClick={() => exportPayrollCSV(activeStaff, records, payments, settings)}
              className="h-10 px-3 rounded-lg border border-border text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-muted/50"
            >
              <FileDown className="size-4" /> تصدير CSV
            </button>
            <button
              onClick={() => printFullLedger()}
              className="h-10 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Printer className="size-4" /> طباعة القائمة الكاملة
            </button>
          </div>

          {activeStaff.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center text-muted-foreground">لا يوجد موظفون نشطون</div>
          ) : activeStaff
              .filter((s) => !query || s.name.includes(query) || s.role.includes(query))
              .map((s) => {
            const rep = computeStaffPayroll(s, records, payments, settings);
            const isOpen = expanded === s.id;
            const myPayments = payments.filter((p) => p.staffId === s.id)
              .sort((a, b) => a.paidAt.localeCompare(b.paidAt));
            // Running balance oldest -> newest based on earned per month cumulative
            let runningPaid = 0;
            const paymentsWithBalance = myPayments.map((p) => {
              runningPaid += p.amount;
              return { ...p, cumulativePaid: runningPaid };
            }).reverse();
            const missingHire = !s.hireDate;
            return (
              <div key={s.id} className="glass-card rounded-2xl overflow-hidden">
                <div className="p-4 md:p-5 flex items-center gap-4 flex-wrap">
                  <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-accent grid place-items-center text-primary-foreground font-bold shrink-0">
                    {s.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-bold flex items-center gap-2">
                      {s.name}
                      {missingHire && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30">
                          <AlertCircle className="size-3" /> تاريخ التعيين غير محدد
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {s.role} • تعيين: {s.hireDate ? formatDate(s.hireDate) : "—"}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      قيمة الساعة: <b className="text-foreground">{formatSAR(rep.rate)}</b>
                      {settings.hourlyOverrides[s.id] ? " (يدوي)" : " (من الراتب)"}
                    </div>
                  </div>
                  <MiniStat label="الساعات" value={fmtHours(rep.totalMinutes)} />
                  <MiniStat label="مستحق" value={formatSAR(rep.totalEarned)} />
                  <MiniStat label="مدفوع" value={formatSAR(rep.totalPaid)} />
                  <MiniStat label="الرصيد" value={formatSAR(rep.balance)} highlight />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setPayingId(s.id)}
                      className="h-9 px-3 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      <Plus className="size-3.5" /> صرف
                    </button>
                    <button
                      onClick={() => setPayslipId(s.id)}
                      className="h-9 px-3 rounded-lg border border-primary/40 text-primary text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-primary/10"
                    >
                      <Printer className="size-3.5" /> كشف
                    </button>
                    <button
                      onClick={() => setExpanded(isOpen ? null : s.id)}
                      className="h-9 px-3 rounded-lg border border-border text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      {isOpen ? <><ChevronUp className="size-3.5" /> إخفاء</> : <><ChevronDown className="size-3.5" /> التفاصيل</>}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-border p-4 md:p-5 bg-muted/10 space-y-4">
                    {/* Hourly override */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-semibold text-muted-foreground">قيمة الساعة (يدوي):</span>
                      <input
                        type="number" min={0} step="0.5"
                        defaultValue={settings.hourlyOverrides[s.id] ?? ""}
                        placeholder={String(hourlyRateFor(s, { ...settings, hourlyOverrides: {} }))}
                        onBlur={(e) => payrollActions.setHourlyOverride(s.id, e.target.value === "" ? null : Number(e.target.value))}
                        className="h-9 w-32 rounded-lg bg-background/60 border border-border px-2 text-sm font-semibold"
                      />
                      <span className="text-[11px] text-muted-foreground">اتركه فارغاً لاحتسابه من الراتب ÷ ساعات الشهر</span>
                    </div>

                    {/* Months breakdown */}
                    <div className="rounded-xl border border-border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                          <tr>
                            <th className="text-right py-2 px-3 font-semibold">الشهر</th>
                            <th className="text-right py-2 px-3 font-semibold">الساعات</th>
                            <th className="text-right py-2 px-3 font-semibold">عادي</th>
                            <th className="text-right py-2 px-3 font-semibold">إضافي</th>
                            <th className="text-right py-2 px-3 font-semibold">الأجر</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rep.months.map((m) => (
                            <tr key={m.key} className="border-t border-border">
                              <td className="py-2 px-3 font-semibold">{m.label}</td>
                              <td className="py-2 px-3 font-mono text-xs">{fmtHours(m.minutes)}</td>
                              <td className="py-2 px-3 text-xs text-muted-foreground">{fmtHours(m.regularMin)} · {formatSAR(m.regularPay)}</td>
                              <td className="py-2 px-3 text-xs">
                                {m.overtimeMin > 0
                                  ? <span className="text-accent">{fmtHours(m.overtimeMin)} · {formatSAR(m.overtimePay)}</span>
                                  : <span className="text-muted-foreground">—</span>}
                              </td>
                              <td className="py-2 px-3 font-bold">{formatSAR(m.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-muted/20 text-xs">
                          <tr className="border-t border-border font-bold">
                            <td className="py-2 px-3">الإجمالي</td>
                            <td className="py-2 px-3 font-mono">{fmtHours(rep.totalMinutes)}</td>
                            <td className="py-2 px-3" colSpan={2}></td>
                            <td className="py-2 px-3">{formatSAR(rep.totalEarned)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Payments log */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-semibold text-muted-foreground">سجل المدفوعات ({myPayments.length})</div>
                        <div className="text-[11px] text-muted-foreground">
                          مستحق: <b className="text-foreground">{formatSAR(rep.totalEarned)}</b> ·
                          مدفوع: <b className="text-foreground">{formatSAR(rep.totalPaid)}</b> ·
                          الرصيد: <b className={cn(rep.balance > 0 ? "text-accent" : "text-success")}>{formatSAR(rep.balance)}</b>
                        </div>
                      </div>
                      {paymentsWithBalance.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                          لا توجد دفعات مسجلة بعد
                        </div>
                      ) : (
                        <div className="rounded-xl border border-border overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/40 text-muted-foreground">
                              <tr>
                                <th className="text-right py-2 px-3 font-semibold">#</th>
                                <th className="text-right py-2 px-3 font-semibold">التاريخ</th>
                                <th className="text-right py-2 px-3 font-semibold">الفترة</th>
                                <th className="text-right py-2 px-3 font-semibold">المبلغ</th>
                                <th className="text-right py-2 px-3 font-semibold">تراكمي</th>
                                <th className="text-right py-2 px-3 font-semibold">ملاحظة</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {paymentsWithBalance.map((p, i) => (
                                <tr key={p.id} className="border-t border-border">
                                  <td className="py-2 px-3 font-mono text-muted-foreground">{String(paymentsWithBalance.length - i).padStart(3, "0")}</td>
                                  <td className="py-2 px-3">{formatDate(p.paidAt)}</td>
                                  <td className="py-2 px-3 text-muted-foreground">
                                    {p.periodFrom || p.periodTo ? `${p.periodFrom ?? "—"} → ${p.periodTo ?? "—"}` : "—"}
                                  </td>
                                  <td className="py-2 px-3 font-bold text-success">{formatSAR(p.amount)}</td>
                                  <td className="py-2 px-3 font-mono">{formatSAR(p.cumulativePaid)}</td>
                                  <td className="py-2 px-3 text-muted-foreground max-w-[200px] truncate">{p.note ?? "—"}</td>
                                  <td className="py-2 px-2 text-left">
                                    <button
                                      onClick={() => { if (confirm("حذف الدفعة؟")) { payrollActions.removePayment(p.id); toast.success("تم الحذف"); } }}
                                      className="size-7 rounded-md hover:bg-destructive/10 hover:text-destructive grid place-items-center inline-flex"
                                    >
                                      <Trash2 className="size-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}



      {payingId && (
        <PaymentDialog
          staff={staff.find((s) => s.id === payingId)!}
          suggested={(() => {
            const s = staff.find((x) => x.id === payingId)!;
            return computeStaffPayroll(s, records, payments, settings).balance;
          })()}
          onClose={() => setPayingId(null)}
        />
      )}

      {payslipId && (() => {
        const s = staff.find((x) => x.id === payslipId);
        if (!s) return null;
        const rep = computeStaffPayroll(s, records, payments, settings);
        const myPayments = payments.filter((p) => p.staffId === s.id)
          .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
        return (
          <PayslipDialog
            staff={s}
            rep={rep}
            payments={myPayments}
            onClose={() => setPayslipId(null)}
          />
        );
      })()}

    </AppShell>
  );
}

function SettingsPanel() {
  const { settings } = usePayroll((s) => s);
  const [customMult, setCustomMult] = useState(settings.overtimeMultiplier);

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Clock className="size-4" /> ساعات العمل المستهدفة</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <FieldNum label="ساعات يومية" value={settings.dailyHours} onChange={(v) => payrollActions.setSettings({ dailyHours: v })} />
          <FieldNum label="ساعات أسبوعية" value={settings.weeklyHours} onChange={(v) => payrollActions.setSettings({ weeklyHours: v })} />
          <FieldNum label="ساعات شهرية" value={settings.monthlyHours} onChange={(v) => payrollActions.setSettings({ monthlyHours: v })} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          قيمة الساعة تُحسب افتراضياً كـ (الراتب الأساسي ÷ الساعات الشهرية). يمكنك إدخالها يدوياً لكل موظف من كشف الرواتب.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Calendar className="size-4" /> شفتات الأسبوع</h3>
        <div className="grid gap-2">
          {WEEKDAYS.map((d) => <DayShiftEditor key={d} day={d} />)}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><TrendingUp className="size-4" /> ساعات إضافية (Overtime)</h3>
        <label className="inline-flex items-center gap-2 text-sm font-semibold mb-3">
          <input
            type="checkbox"
            checked={settings.overtimeEnabled}
            onChange={(e) => payrollActions.toggleOvertime(e.target.checked)}
            className="size-4 accent-primary"
          />
          تفعيل احتساب الأوفر تايم للساعات الزائدة عن الساعات الشهرية
        </label>
        {settings.overtimeEnabled && (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              {([
                ["x1", "×1 (نفس القيمة)"],
                ["x1_5", "×1.5"],
                ["custom", "قيمة مخصصة"],
              ] as [OvertimeMode, string][]).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => payrollActions.setOvertime(m, m === "custom" ? customMult : undefined)}
                  className={cn(
                    "h-9 px-3 rounded-lg text-xs font-semibold border transition",
                    settings.overtimeMode === m
                      ? "bg-gradient-to-l from-primary to-accent text-primary-foreground border-transparent shadow-[var(--shadow-glow)]"
                      : "border-border hover:bg-muted/50",
                  )}
                >{label}</button>
              ))}
            </div>
            {settings.overtimeMode === "custom" && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">المعامل:</span>
                <input
                  type="number" min={0.1} step={0.1}
                  value={customMult}
                  onChange={(e) => { const v = Number(e.target.value); setCustomMult(v); payrollActions.setOvertime("custom", v); }}
                  className="h-9 w-24 rounded-lg bg-background/60 border border-border px-2 text-sm font-semibold"
                />
                <span className="text-xs text-muted-foreground">× قيمة الساعة</span>
              </div>
            )}
            <div className="rounded-lg border border-warning/40 bg-warning/5 text-warning text-[11px] p-3 inline-flex items-center gap-2">
              <AlertCircle className="size-3.5" /> يُطبَّق المعامل على الساعات التي تتجاوز الحد الشهري ({settings.monthlyHours}س) لكل موظف.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DayShiftEditor({ day }: { day: Weekday }) {
  const { settings } = usePayroll((s) => s);
  const d = settings.workDays[day];
  const setShift = (idx: number, patch: Partial<Shift>) => {
    const next = d.shifts.map((s, i) => i === idx ? { ...s, ...patch } : s);
    payrollActions.setShifts(day, next);
  };
  const addShift = () => {
    if (d.shifts.length >= 3) return;
    payrollActions.setShifts(day, [...d.shifts, { start: "18:00", end: "22:00" }]);
  };
  const removeShift = (idx: number) => {
    payrollActions.setShifts(day, d.shifts.filter((_, i) => i !== idx));
  };

  return (
    <div className={cn(
      "rounded-xl border p-3",
      d.open ? "border-border bg-muted/10" : "border-border bg-muted/5 opacity-70",
    )}>
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <label className="inline-flex items-center gap-2 text-sm font-bold min-w-[80px]">
          <input type="checkbox" checked={d.open} onChange={(e) => payrollActions.setDay(day, { open: e.target.checked })} className="size-4 accent-primary" />
          {dayLabel(day)}
        </label>
        {d.open && (
          <>
            <span className="text-[11px] text-muted-foreground">{d.shifts.length} شفت</span>
            <button
              onClick={addShift}
              disabled={d.shifts.length >= 3}
              className="ms-auto h-8 px-2 rounded-md border border-border text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-40"
            >
              <Plus className="size-3" /> إضافة شفت
            </button>
          </>
        )}
      </div>
      {d.open && (
        <div className="grid gap-2 md:grid-cols-3">
          {d.shifts.map((sh, i) => (
            <div key={i} className="rounded-lg border border-border bg-background/40 p-2 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-10">شفت {i + 1}</span>
              <input type="time" value={sh.start} onChange={(e) => setShift(i, { start: e.target.value })} className="flex-1 h-8 rounded-md bg-muted/40 border border-border px-2 text-xs font-mono" />
              <span className="text-xs">—</span>
              <input type="time" value={sh.end} onChange={(e) => setShift(i, { end: e.target.value })} className="flex-1 h-8 rounded-md bg-muted/40 border border-border px-2 text-xs font-mono" />
              {d.shifts.length > 1 && (
                <button onClick={() => removeShift(i)} className="size-7 rounded-md hover:bg-destructive/10 hover:text-destructive grid place-items-center">
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentDialog({ staff, suggested, onClose }: { staff: { id: string; name: string }; suggested: number; onClose: () => void }) {
  const [amount, setAmount] = useState(Math.max(0, suggested));
  const [note, setNote] = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");

  const submit = () => {
    if (!amount || amount <= 0) return toast.error("أدخل مبلغاً صحيحاً");
    payrollActions.addPayment({
      staffId: staff.id,
      amount,
      paidAt: new Date().toISOString(),
      note: note || undefined,
      periodFrom: periodFrom || undefined,
      periodTo: periodTo || undefined,
    });
    toast.success("تم تسجيل الدفعة");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">صرف راتب</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{staff.name}</p>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-muted grid place-items-center"><X className="size-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">المبلغ</label>
            <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full h-11 rounded-lg bg-muted/40 border border-border px-3 text-lg font-bold" />
            <div className="text-[11px] text-muted-foreground mt-1">المقترح (الرصيد الحالي): {formatSAR(Math.max(0, suggested))}</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">من شهر</label>
              <input type="month" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">إلى شهر</label>
              <input type="month" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1 block">ملاحظة</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm" placeholder="اختياري" />
          </div>
        </div>
        <div className="p-5 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 h-10 rounded-lg border border-border text-sm">إلغاء</button>
          <button onClick={submit} className="px-6 h-10 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-bold">حفظ الدفعة</button>
        </div>
      </div>
    </div>
  );
}

function FieldNum({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      <input
        type="number" min={0} step={1}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="mt-1 w-full h-10 rounded-lg bg-muted/40 border border-border px-3 text-sm font-semibold"
      />
    </label>
  );
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "primary" | "success" | "accent" | "gradient" }) {
  const cls = {
    primary: "text-primary bg-primary/10 border-primary/20",
    success: "text-success bg-success/10 border-success/20",
    accent: "text-accent bg-accent/10 border-accent/20",
    gradient: "border-primary/20 bg-gradient-to-br from-primary/20 to-accent/20 text-primary-foreground",
  }[tone];
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className={cn("size-10 rounded-xl grid place-items-center border", cls)}>{icon}</div>
      <div className="mt-3 text-[11px] text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-xl font-bold", tone === "gradient" && "gradient-text")}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      "rounded-lg px-3 py-2 min-w-[100px]",
      highlight ? "bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/25" : "bg-muted/30 border border-border",
    )}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={cn("font-bold text-sm", highlight && "gradient-text")}>{value}</div>
    </div>
  );
}

// ============= Payslip printable =============

function PayslipDialog({
  staff, rep, payments, onClose,
}: {
  staff: import("@/lib/salon-store").Staff;
  rep: ReturnType<typeof computeStaffPayroll>;
  payments: import("@/lib/payroll-store").PayrollPayment[];
  onClose: () => void;
}) {
  const { settings } = usePayroll((s) => s);
  const site = useSiteSettings();
  const doPrint = () => {
    document.body.classList.add("printing-payslip");
    window.print();
    setTimeout(() => document.body.classList.remove("printing-payslip"), 300);
  };
  const allowancesTotal = (staff.allowances ?? []).reduce((a, x) => a + x.amount, 0);
  const now = new Date();
  const issued = new Intl.DateTimeFormat("ar-SA", { dateStyle: "long", timeStyle: "short" }).format(now);
  const receiptId = `PS-${staff.id.slice(0, 4).toUpperCase()}-${Date.now().toString(36).slice(-5).toUpperCase()}`;

  return (
    <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-start p-4 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-3xl mx-auto my-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3 no-print">
          <h3 className="font-bold text-lg text-foreground">كشف راتب</h3>
          <div className="flex gap-2">
            <button onClick={doPrint} className="h-10 px-4 rounded-lg bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-bold inline-flex items-center gap-2">
              <Printer className="size-4" /> طباعة
            </button>
            <button onClick={onClose} className="h-10 px-4 rounded-lg border border-border text-sm inline-flex items-center gap-2">
              <X className="size-4" /> إغلاق
            </button>
          </div>
        </div>

        <div className="payslip-print bg-white text-neutral-900 rounded-2xl shadow-xl p-8" dir="rtl">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-neutral-200 pb-5">
            <div>
              <div className="text-2xl font-black">{site.salonName}</div>
              <div className="text-xs text-neutral-500 mt-1">كشف راتب موظف</div>
            </div>
            <div className="text-left text-xs">
              <div><b>رقم الكشف:</b> <span className="font-mono">{receiptId}</span></div>
              <div className="text-neutral-500 mt-0.5">{issued}</div>
            </div>
          </div>

          {/* Employee info */}
          <div className="grid grid-cols-2 gap-4 mt-5 text-sm">
            <div className="space-y-1">
              <div className="text-[11px] text-neutral-500">الموظف</div>
              <div className="font-bold text-base">{staff.name}</div>
              <div className="text-xs text-neutral-600">{staff.role}</div>
              <div className="text-xs text-neutral-600">جوال: {staff.phone}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[11px] text-neutral-500">فترة الاحتساب</div>
              <div className="text-sm"><b>من:</b> {staff.hireDate ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "long" }).format(new Date(staff.hireDate)) : "غير محدد"}</div>
              <div className="text-sm"><b>إلى:</b> {new Intl.DateTimeFormat("ar-SA", { dateStyle: "long" }).format(now)}</div>
              <div className="text-xs text-neutral-600">
                قيمة الساعة: <b>{formatSAR(rep.rate)}</b> · الحد الشهري: <b>{settings.monthlyHours}س</b>
                {settings.overtimeEnabled ? ` · أوفر تايم ×${settings.overtimeMultiplier}` : ""}
              </div>
            </div>
          </div>

          {/* Monthly breakdown */}
          <div className="mt-5">
            <div className="text-xs font-bold text-neutral-700 mb-2">تفصيل الأشهر</div>
            <table className="w-full text-xs border border-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="text-right p-2 border-b border-neutral-200">الشهر</th>
                  <th className="text-right p-2 border-b border-neutral-200">الساعات</th>
                  <th className="text-right p-2 border-b border-neutral-200">عادي</th>
                  <th className="text-right p-2 border-b border-neutral-200">إضافي</th>
                  <th className="text-right p-2 border-b border-neutral-200">الأجر</th>
                </tr>
              </thead>
              <tbody>
                {rep.months.map((m) => (
                  <tr key={m.key} className="border-b border-neutral-100">
                    <td className="p-2 font-semibold">{m.label}</td>
                    <td className="p-2 font-mono">{fmtHours(m.minutes)}</td>
                    <td className="p-2 text-neutral-600">{formatSAR(m.regularPay)}</td>
                    <td className="p-2 text-neutral-600">{m.overtimeMin > 0 ? formatSAR(m.overtimePay) : "—"}</td>
                    <td className="p-2 font-bold">{formatSAR(m.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-50 font-bold">
                <tr>
                  <td className="p-2">الإجمالي</td>
                  <td className="p-2 font-mono">{fmtHours(rep.totalMinutes)}</td>
                  <td className="p-2" colSpan={2}></td>
                  <td className="p-2">{formatSAR(rep.totalEarned)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payments */}
          <div className="mt-5">
            <div className="text-xs font-bold text-neutral-700 mb-2">المدفوعات المستلمة ({payments.length})</div>
            {payments.length === 0 ? (
              <div className="text-xs text-neutral-500 border border-dashed border-neutral-300 p-3 rounded">لا توجد دفعات</div>
            ) : (
              <table className="w-full text-xs border border-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="text-right p-2 border-b border-neutral-200">التاريخ</th>
                    <th className="text-right p-2 border-b border-neutral-200">الفترة</th>
                    <th className="text-right p-2 border-b border-neutral-200">ملاحظة</th>
                    <th className="text-right p-2 border-b border-neutral-200">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-neutral-100">
                      <td className="p-2">{formatDate(p.paidAt)}</td>
                      <td className="p-2 text-neutral-600">{p.periodFrom || p.periodTo ? `${p.periodFrom ?? "—"} → ${p.periodTo ?? "—"}` : "—"}</td>
                      <td className="p-2 text-neutral-600">{p.note ?? "—"}</td>
                      <td className="p-2 font-bold">{formatSAR(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Totals */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="space-y-1 text-xs">
              <div>الراتب الأساسي: <b>{formatSAR(staff.salary ?? 0)}</b></div>
              <div>البدلات: <b>{formatSAR(allowancesTotal)}</b></div>
              {(staff.allowances ?? []).map((a) => (
                <div key={a.id} className="text-neutral-500 pr-3">• {a.label}: {formatSAR(a.amount)}</div>
              ))}
            </div>
            <div className="rounded-xl border-2 border-neutral-800 p-4 text-sm space-y-2">
              <div className="flex items-center justify-between"><span>إجمالي المستحق</span><b>{formatSAR(rep.totalEarned)}</b></div>
              <div className="flex items-center justify-between"><span>إجمالي المدفوع</span><b>{formatSAR(rep.totalPaid)}</b></div>
              <div className="h-px bg-neutral-300" />
              <div className="flex items-center justify-between text-base"><span className="font-bold">صافي الرصيد</span><b className="text-lg">{formatSAR(rep.balance)}</b></div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-8 grid grid-cols-2 gap-6 text-xs">
            <div className="text-center">
              <div className="border-t border-neutral-400 pt-2">توقيع الموظف</div>
            </div>
            <div className="text-center">
              <div className="border-t border-neutral-400 pt-2">توقيع الإدارة / الختم</div>
            </div>
          </div>

          <div className="mt-6 text-center text-[10px] text-neutral-400">
            كشف مُولَّد آلياً من نظام لمسة — {issued}
          </div>
        </div>
      </div>
    </div>
  );
}

function exportPayrollCSV(
  staffList: import("@/lib/salon-store").Staff[],
  records: import("@/lib/attendance-store").AttendanceRecord[],
  payments: import("@/lib/payroll-store").PayrollPayment[],
  settings: import("@/lib/payroll-store").PayrollSettings,
) {
  const rows = [["الموظف", "المسمى", "تاريخ التعيين", "قيمة الساعة", "الساعات", "المستحق", "المدفوع", "الرصيد"]];
  for (const s of staffList) {
    const r = computeStaffPayroll(s, records, payments, settings);
    rows.push([
      s.name, s.role, s.hireDate ?? "—",
      String(r.rate), fmtHours(r.totalMinutes),
      String(r.totalEarned), String(r.totalPaid), String(r.balance),
    ]);
  }
  const csv = "\uFEFF" + rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payroll-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("تم تصدير الملف");
}

function printFullLedger() {
  document.body.classList.add("printing-payslip");
  // Temporarily promote the ledger area if present
  window.print();
  setTimeout(() => document.body.classList.remove("printing-payslip"), 300);
}

