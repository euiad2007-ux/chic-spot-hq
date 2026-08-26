import { useRef, useState } from "react";
import { ImageUp, Loader2, Trash2, AlertCircle } from "lucide-react";

import { MEDIA_PRESETS, uploadPlatformImage, type MediaPreset } from "@/lib/platform-media";

interface Props {
  label: string;
  value: string;
  preset: MediaPreset;
  onChange: (url: string) => void;
  /** Rendered on a checkerboard-free light tile (logos with transparency). */
  contain?: boolean;
}

/** Picks a local image, auto-crops/resizes it to the preset, uploads it, and stores the link. */
export function ImageUploadField({ label, value, preset, onChange, contain }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spec = MEDIA_PRESETS[preset];

  const pick = async (file?: File) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await uploadPlatformImage(file, preset));
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل رفع الصورة.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="rounded-xl border border-border p-3 space-y-2">
        {value && (
          <div className="rounded-lg border border-border bg-muted/40 overflow-hidden">
            <img
              src={value}
              alt={`معاينة ${label}`}
              className={contain ? "h-20 w-full object-contain p-2" : "h-28 w-full object-cover"}
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ImageUp className="size-3.5" />}
            {busy ? "جارٍ الرفع…" : value ? "تغيير الصورة" : "رفع صورة"}
          </button>
          {value && !busy && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                onChange("");
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" /> إزالة
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          className="hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="أو الصق رابط صورة"
          className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          يتم القصّ والتحجيم تلقائيًا إلى {spec.hint}.
        </p>
        {error && (
          <p className="flex items-start gap-1.5 text-[11px] text-destructive">
            <AlertCircle className="size-3.5 mt-px shrink-0" /> {error}
          </p>
        )}
      </div>
    </div>
  );
}
