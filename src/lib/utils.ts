import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const AR_WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

/** تنسيق تاريخ ثابت (يعطي نفس النتيجة على الخادم والمتصفح) */
export function fmtDay(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** تنسيق تاريخ طويل بالعربية بدون الاعتماد على Intl */
export function fmtLongDay(input: string | number | Date): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return `${AR_WEEKDAYS[d.getDay()]} ${d.getDate()} ${AR_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
