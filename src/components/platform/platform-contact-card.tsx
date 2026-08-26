import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  Copy,
  Facebook,
  Ghost,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  MessageCircle,
  Music2,
  Phone,
  Twitter,
  Youtube,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

import {
  loadPlatformSettings,
  type PlatformSettings,
  type PlatformSocials,
} from "@/lib/db/platform-settings-repo";

export const PLATFORM_SETTINGS_KEY = ["platform-settings"] as const;

export function usePlatformSettings(initialData?: PlatformSettings, requireFresh = false) {
  return useQuery({
    queryKey: PLATFORM_SETTINGS_KEY,
    queryFn: loadPlatformSettings,
    initialData,
    staleTime: requireFresh ? 0 : 5 * 60_000,
    refetchOnMount: requireFresh ? "always" : true,
    retry: requireFresh ? 3 : 1,
  });
}

export const SOCIAL_META: {
  key: keyof PlatformSocials;
  label: string;
  icon: typeof Instagram;
}[] = [
  { key: "instagram", label: "انستقرام", icon: Instagram },
  { key: "snapchat", label: "سناب شات", icon: Ghost },
  { key: "tiktok", label: "تيك توك", icon: Music2 },
  { key: "x", label: "منصة X", icon: Twitter },
  { key: "facebook", label: "فيسبوك", icon: Facebook },
  { key: "linkedin", label: "لينكدإن", icon: Linkedin },
  { key: "youtube", label: "يوتيوب", icon: Youtube },
  { key: "website", label: "الموقع", icon: Globe },
];

export function SocialIconRow({ socials }: { socials: PlatformSocials }) {
  const items = SOCIAL_META.filter((s) => (socials[s.key] ?? "").trim());
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s) => (
        <a
          key={s.key}
          href={socials[s.key]}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={s.label}
          title={s.label}
          className="size-10 rounded-xl border border-border bg-card flex items-center justify-center text-primary hover:bg-primary/10 transition"
        >
          <s.icon className="size-4" />
        </a>
      ))}
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-bold truncate" dir="ltr">
          {value}
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          toast.success("تم النسخ");
        }}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted"
      >
        <Copy className="size-3.5" /> نسخ
      </button>
    </div>
  );
}

/** Bank details, support numbers and social links of the platform. */
export function PlatformContactCard({
  settings,
  compact,
}: {
  settings: PlatformSettings;
  compact?: boolean;
}) {
  const s = settings;
  const wa = s.whatsapp.replace(/[^\d]/g, "");
  return (
    <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
      <h2 className="font-bold flex items-center gap-2">
        <Banknote className="size-4 text-primary" /> بيانات السداد والتواصل
      </h2>

      <div className="grid gap-2 sm:grid-cols-2">
        <CopyRow label="اسم البنك" value={s.bankName} />
        <CopyRow label="اسم صاحب الحساب" value={s.bankAccountName} />
        <CopyRow label="رقم الآيبان (IBAN)" value={s.iban} />
        <CopyRow label="رقم الحساب" value={s.accountNumber} />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {s.phone && (
          <a
            href={`tel:${s.phone}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted"
          >
            <Phone className="size-4 text-primary" /> <span dir="ltr">{s.phone}</span>
          </a>
        )}
        {wa && (
          <a
            href={`https://wa.me/${wa}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted"
          >
            <MessageCircle className="size-4 text-primary" /> واتساب
          </a>
        )}
        {s.email && (
          <a
            href={`mailto:${s.email}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted"
          >
            <Mail className="size-4 text-primary" /> {s.email}
          </a>
        )}
        {s.supportHours && (
          <span className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-muted-foreground">
            <Clock className="size-4" /> {s.supportHours}
          </span>
        )}
      </div>

      <SocialIconRow socials={s.socials} />

      {!compact && (
        <p className="text-xs text-muted-foreground">
          بعد التحويل أرسل صورة الإيصال على الواتساب أو البريد لتفعيل الاشتراك أو ترقية الباقة.
        </p>
      )}
    </section>
  );
}
