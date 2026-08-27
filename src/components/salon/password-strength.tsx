import { Check, X } from "lucide-react";

export interface PasswordRule {
  label: string;
  ok: boolean;
}

/** Live rules used both for the meter and for blocking submit. */
export function passwordRules(password: string, confirm?: string): PasswordRule[] {
  const rules: PasswordRule[] = [
    { label: "٨ أحرف على الأقل", ok: password.length >= 8 },
    { label: "حرف إنجليزي كبير (A-Z)", ok: /[A-Z]/.test(password) },
    { label: "حرف إنجليزي صغير (a-z)", ok: /[a-z]/.test(password) },
    { label: "رقم واحد على الأقل", ok: /[0-9]/.test(password) },
    { label: "رمز خاص مثل !@#$", ok: /[^A-Za-z0-9]/.test(password) },
  ];
  if (confirm !== undefined)
    rules.push({
      label: "التأكيد مطابق لكلمة المرور",
      ok: password.length > 0 && password === confirm,
    });
  return rules;
}

const LEVELS = [
  { label: "ضعيفة جدًا", bar: "bg-destructive", text: "text-destructive" },
  { label: "ضعيفة", bar: "bg-destructive", text: "text-destructive" },
  { label: "متوسطة", bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { label: "جيدة", bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { label: "قوية", bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  { label: "قوية جدًا", bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
];

/** 0..5 score derived from the satisfied rules plus a bonus for length. */
export function passwordScore(password: string): number {
  if (!password) return 0;
  const base = passwordRules(password).filter((r) => r.ok).length;
  const bonus = password.length >= 14 ? 1 : 0;
  return Math.min(5, base + bonus);
}

/** Strength meter + checklist that updates on every keystroke. */
export function PasswordStrength({
  password,
  confirm,
}: {
  password: string;
  confirm?: string;
}) {
  const rules = passwordRules(password, confirm);
  const score = passwordScore(password);
  const level = LEVELS[score] ?? LEVELS[0]!;

  return (
    <div className="rounded-2xl border border-border bg-muted/30 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-muted-foreground">قوة كلمة المرور</span>
        <span className={`text-[11px] font-bold ${password ? level.text : "text-muted-foreground"}`}>
          {password ? level.label : "اكتب كلمة المرور"}
        </span>
      </div>
      <div
        className="mt-2 flex gap-1"
        role="progressbar"
        aria-label="قوة كلمة المرور"
        aria-valuemin={0}
        aria-valuemax={5}
        aria-valuenow={score}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={
              "h-1.5 flex-1 rounded-full transition-colors " +
              (i < score ? level.bar : "bg-muted")
            }
          />
        ))}
      </div>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {rules.map((r) => (
          <li
            key={r.label}
            className={
              "flex items-center gap-1.5 text-[11px] font-semibold transition-colors " +
              (r.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")
            }
          >
            {r.ok ? (
              <Check className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <X className="size-3.5 shrink-0 opacity-60" aria-hidden />
            )}
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
