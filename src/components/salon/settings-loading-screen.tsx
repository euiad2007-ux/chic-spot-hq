import { LoaderCircle } from "lucide-react";

/** Neutral loading state that never exposes default or previously cached design values. */
export function SettingsLoadingScreen({ label = "جاري تحميل التصميم المحفوظ…" }: { label?: string }) {
  return (
    <div className="min-h-screen grid place-items-center bg-background px-6" dir="rtl">
      <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin text-primary" />
        <span>{label}</span>
      </div>
    </div>
  );
}