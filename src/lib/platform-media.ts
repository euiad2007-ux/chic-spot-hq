import { supabase } from "@/integrations/supabase/client";

/** Target geometry for each kind of platform artwork. */
export type MediaPreset = "logo" | "favicon" | "hero" | "wide" | "og";

interface PresetSpec {
  w: number;
  h: number;
  /** contain = keep whole image and pad transparently, cover = crop to fill. */
  fit: "contain" | "cover";
  mime: "image/png" | "image/jpeg";
  quality?: number;
  hint: string;
}

export const MEDIA_PRESETS: Record<MediaPreset, PresetSpec> = {
  logo: { w: 512, h: 512, fit: "contain", mime: "image/png", hint: "شعار مربّع 512×512 بخلفية شفافة" },
  favicon: { w: 128, h: 128, fit: "cover", mime: "image/png", hint: "أيقونة متصفح 128×128" },
  hero: { w: 1920, h: 1080, fit: "cover", mime: "image/jpeg", quality: 0.86, hint: "بانر عريض 1920×1080" },
  wide: { w: 1400, h: 1050, fit: "cover", mime: "image/jpeg", quality: 0.86, hint: "صورة قسم 1400×1050" },
  og: { w: 1200, h: 630, fit: "cover", mime: "image/jpeg", quality: 0.86, hint: "صورة مشاركة 1200×630" },
};

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_SECONDS = 60 * 60 * 24 * 365 * 5;

export class MediaError extends Error {}

async function decode(file: File): Promise<{ width: number; height: number; draw: CanvasImageSource }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { width: bmp.width, height: bmp.height, draw: bmp };
    } catch {
      /* fall back to <img> decoding below */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new MediaError("تعذّر قراءة الصورة — الملف تالف أو غير مدعوم."));
      el.src = url;
    });
    return { width: img.naturalWidth, height: img.naturalHeight, draw: img };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5_000);
  }
}

/** Auto-crops (cover) or pads (contain) the picked file to the preset size. */
export async function processImage(file: File, preset: MediaPreset): Promise<Blob> {
  const spec = MEDIA_PRESETS[preset];
  if (!file.type.startsWith("image/")) throw new MediaError("الملف المختار ليس صورة. اختر صورة PNG أو JPG أو WEBP.");
  if (file.type === "image/svg+xml") throw new MediaError("صور SVG غير مدعومة للقصّ — استخدم PNG أو JPG.");
  if (file.size > MAX_INPUT_BYTES) throw new MediaError("حجم الصورة أكبر من 10 ميجابايت. اختر صورة أصغر.");

  const { width, height, draw } = await decode(file);
  if (!width || !height) throw new MediaError("أبعاد الصورة غير صالحة.");

  const canvas = document.createElement("canvas");
  canvas.width = spec.w;
  canvas.height = spec.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new MediaError("متصفحك لا يدعم معالجة الصور. حدّث المتصفح وحاول مرة أخرى.");
  ctx.imageSmoothingQuality = "high";

  const scale =
    spec.fit === "cover"
      ? Math.max(spec.w / width, spec.h / height)
      : Math.min(spec.w / width, spec.h / height);
  const dw = Math.round(width * scale);
  const dh = Math.round(height * scale);
  ctx.drawImage(draw, Math.round((spec.w - dw) / 2), Math.round((spec.h - dh) / 2), dw, dh);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, spec.mime, spec.quality),
  );
  if (!blob) throw new MediaError("تعذّر إنشاء الصورة بعد القصّ. حاول بصورة أخرى.");
  return blob;
}

/** Resizes then stores the image and returns a long-lived link usable on the public site. */
export async function uploadPlatformImage(file: File, preset: MediaPreset): Promise<string> {
  const blob = await processImage(file, preset);
  const ext = MEDIA_PRESETS[preset].mime === "image/png" ? "png" : "jpg";
  const path = `${preset}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const up = await supabase.storage.from("platform-media").upload(path, blob, {
    contentType: MEDIA_PRESETS[preset].mime,
    upsert: false,
  });
  if (up.error) {
    const msg = up.error.message || "";
    if (/exceeded|too large|size/i.test(msg)) throw new MediaError("الصورة أكبر من الحد المسموح (5 ميجابايت).");
    if (/not authorized|permission|policy|row-level/i.test(msg))
      throw new MediaError("لا تملك صلاحية رفع صور المنصة — الدخول مطلوب بحساب مالك المنصة.");
    throw new MediaError(`فشل رفع الصورة: ${msg || "خطأ غير معروف"}`);
  }

  const signed = await supabase.storage
    .from("platform-media")
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (signed.error || !signed.data?.signedUrl)
    throw new MediaError("تم الرفع لكن تعذّر إنشاء رابط الصورة. حاول مرة أخرى.");
  return signed.data.signedUrl;
}
