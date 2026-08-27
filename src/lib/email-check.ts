/**
 * Precise, Arabic-language email diagnostics for the signup/login form.
 *
 * Instead of a single "invalid email" message, each failure names the exact
 * reason and — when possible — offers a one-tap corrected value.
 */

export type EmailIssue = {
  /** Arabic explanation of what exactly is wrong. */
  message: string;
  /** Corrected address the user can apply with one tap. */
  suggestion?: string;
  /** true when the value is merely incomplete (do not shout at the user yet). */
  incomplete?: boolean;
};

/** Common typos of popular mail providers → the intended domain. */
const DOMAIN_FIXES: Record<string, string> = {
  "gmai.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmaill.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.om": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.co": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "outlok.com": "outlook.com",
  "outlook.co": "outlook.com",
  "yahoo.co": "yahoo.com",
  "yaho.com": "yahoo.com",
  "yahou.com": "yahoo.com",
  "icloud.co": "icloud.com",
  "iclod.com": "icloud.com",
};

const ARABIC_RE = /[\u0600-\u06FF]/;

/** Returns null when the address is valid, otherwise a precise issue. */
export function checkEmail(raw: string): EmailIssue | null {
  const value = raw.trim();
  if (!value) return { message: "البريد الإلكتروني مطلوب", incomplete: true };

  if (/\s/.test(value))
    return {
      message: "البريد الإلكتروني يحتوي على مسافات — احذف المسافات",
      suggestion: value.replace(/\s+/g, ""),
    };

  if (ARABIC_RE.test(value))
    return { message: "البريد الإلكتروني يجب أن يُكتب بحروف إنجليزية وأرقام فقط" };

  const at = value.split("@");
  if (at.length === 1)
    return {
      message: "علامة @ ناقصة — مثال: name@example.com",
      incomplete: true,
    };
  if (at.length > 2)
    return { message: "لا يمكن استخدام علامة @ أكثر من مرة في البريد الإلكتروني" };

  const [local, domainRaw] = [at[0] ?? "", (at[1] ?? "").toLowerCase()];

  if (!local)
    return { message: "اكتب الاسم قبل علامة @ — مثال: name@example.com", incomplete: true };
  if (/[^A-Za-z0-9._%+-]/.test(local))
    return {
      message: "الجزء قبل @ يحتوي على رموز غير مسموحة (المسموح: حروف، أرقام، . _ % + -)",
      suggestion: `${local.replace(/[^A-Za-z0-9._%+-]/g, "")}@${domainRaw}`,
    };
  if (local.startsWith(".") || local.endsWith("."))
    return {
      message: "لا يمكن أن يبدأ أو ينتهي الجزء قبل @ بنقطة",
      suggestion: `${local.replace(/^\.+|\.+$/g, "")}@${domainRaw}`,
    };

  if (!domainRaw)
    return { message: "اكتب اسم النطاق بعد @ — مثال: gmail.com", incomplete: true };

  const fixed = DOMAIN_FIXES[domainRaw];
  if (fixed)
    return {
      message: `يبدو أن هناك خطأ مطبعي في «${domainRaw}» — هل تقصد «${fixed}»؟`,
      suggestion: `${local}@${fixed}`,
    };

  if (!domainRaw.includes("."))
    return {
      message: "اسم النطاق ناقص الامتداد — مثال: example.com",
      incomplete: true,
    };
  if (domainRaw.endsWith("."))
    return { message: "امتداد النطاق ناقص بعد النقطة — مثال: .com", incomplete: true };
  if (domainRaw.includes(".."))
    return {
      message: "يوجد نقطتان متتاليتان في اسم النطاق",
      suggestion: `${local}@${domainRaw.replace(/\.{2,}/g, ".")}`,
    };
  if (/[^a-z0-9.-]/.test(domainRaw))
    return { message: "اسم النطاق يحتوي على رموز غير مسموحة بعد علامة @" };

  const tld = domainRaw.split(".").pop() ?? "";
  if (tld.length < 2)
    return { message: "امتداد النطاق قصير جدًا — مثال: .com أو .sa", incomplete: true };
  if (!/^[a-z]{2,}$/.test(tld))
    return { message: "امتداد النطاق يجب أن يتكون من حروف فقط — مثال: .com" };

  return null;
}
