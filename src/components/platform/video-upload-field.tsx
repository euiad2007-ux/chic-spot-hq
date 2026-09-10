import { useRef, useState } from "react";
import { AlertCircle, Loader2, Trash2, Video } from "lucide-react";

import { uploadPlatformVideo } from "@/lib/platform-media";

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}

/** Picks a local video file, uploads it, and stores the playable link. */
export function VideoUploadField({ label, value, onChange, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file?: File) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await uploadPlatformVideo(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : "فشل رفع الفيديو.");
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
            <video
              src={value}
              muted
              loop
              playsInline
              controls
              className="h-32 w-full object-cover"
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
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Video className="size-3.5" />}
            {busy ? "جارٍ الرفع…" : value ? "تغيير الفيديو" : "رفع فيديو"}
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
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => void pick(e.target.files?.[0])}
        />
        <input
          value={value}
          dir="ltr"
          onChange={(e) => onChange(e.target.value)}
          placeholder="أو الصق رابط فيديو"
          className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs"
        />
        <p className="text-[11px] text-muted-foreground">
          {hint || "MP4 أو WEBM بحد أقصى 80 ميجابايت. الأفضل مقطع قصير متكرر بدون صوت."}
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
