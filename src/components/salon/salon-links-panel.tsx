import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Globe, Link2, LogIn, ShoppingCart, ShieldCheck, Clock, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  loadSalonDomain,
  requestCustomDomain,
  removeCustomDomain,
  normalizeDomain,
} from "@/lib/db/domain-repo";

const DOMAIN_STATUS: Record<string, { label: string; tone: string }> = {
  none: { label: "غير مربوط", tone: "text-muted-foreground border-border" },
  pending: { label: "بانتظار التحقق", tone: "text-warning border-warning/40 bg-warning/10" },
  verified: { label: "مُوثّق ويعمل", tone: "text-success border-success/40 bg-success/10" },
  failed: { label: "فشل التحقق", tone: "text-destructive border-destructive/40 bg-destructive/10" },
};

function CopyRow({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Link2 }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
        <Icon className="size-3.5" aria-hidden /> {label}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate text-xs font-semibold" dir="ltr">{value}</code>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(value);
            toast.success("تم نسخ الرابط");
          }}
          className="size-8 shrink-0 grid place-items-center rounded-lg border border-border hover:bg-muted"
          aria-label={`نسخ ${label}`}
        >
          <Copy className="size-3.5" />
        </button>
        <a
          href={value}
          target="_blank"
          rel="noreferrer"
          className="size-8 shrink-0 grid place-items-center rounded-lg border border-border hover:bg-muted"
          aria-label={`فتح ${label}`}
        >
          <ExternalLink className="size-3.5" />
        </a>
      </div>
    </div>
  );
}

/** Public links of the salon (page + login) plus custom-domain buy/connect. */
export function SalonLinksPanel({ salonId }: { salonId: string | null }) {
  const qc = useQueryClient();
  const [origin, setOrigin] = useState("");
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const info = useQuery({
    queryKey: ["salon-domain", salonId],
    queryFn: () => loadSalonDomain(salonId!),
    enabled: !!salonId,
  });

  const slug = info.data?.slug ?? "";
  const links = useMemo(
    () => ({
      site: slug && origin ? `${origin}/salon/${slug}` : "",
      login: slug && origin ? `${origin}/salon/${slug}/login` : "",
    }),
    [slug, origin],
  );

  const status = DOMAIN_STATUS[info.data?.domainStatus ?? "none"] ?? DOMAIN_STATUS["none"]!;
  const searchTerm = normalizeDomain(domain) || slug || "mysalon.com";
  const platformHost = origin.replace(/^https?:\/\//, "");

  async function connect() {
    if (!salonId || busy) return;
    setBusy(true);
    try {
      await requestCustomDomain(salonId, domain);
      toast.success("تم حفظ النطاق — أضف سجلات DNS ثم سيتم تحقيقه");
      setDomain("");
      await qc.invalidateQueries({ queryKey: ["salon-domain", salonId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر حفظ النطاق");
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    if (!salonId || busy) return;
    if (!confirm("إلغاء ربط النطاق الحالي؟")) return;
    setBusy(true);
    try {
      await removeCustomDomain(salonId);
      toast.success("تم إلغاء ربط النطاق");
      await qc.invalidateQueries({ queryKey: ["salon-domain", salonId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "تعذّر إلغاء الربط");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 items-start">
      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-bold flex items-center gap-2">
          <Link2 className="size-4 text-primary" aria-hidden /> روابط المشغل الخاصة
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          لكل مشغل رابط عام خاص به وصفحة دخول مستقلة للموظفين والعميلات — شاركيهما في وسائل التواصل والفواتير.
        </p>
        {!slug ? (
          <p className="text-sm text-muted-foreground">جارٍ تحميل بيانات المشغل…</p>
        ) : (
          <div className="space-y-2">
            <CopyRow label="رابط صفحة المشغل" value={links.site} icon={Globe} />
            <CopyRow label="رابط الدخول الخاص بالمشغل" value={links.login} icon={LogIn} />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-bold flex items-center gap-2">
            <Globe className="size-4 text-primary" aria-hidden /> نطاق خاص (دومين)
          </h2>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${status.tone}`}>
            {info.data?.domainStatus === "verified" ? (
              <ShieldCheck className="inline size-3 ml-1" aria-hidden />
            ) : info.data?.domainStatus === "pending" ? (
              <Clock className="inline size-3 ml-1" aria-hidden />
            ) : null}
            {status.label}
          </span>
        </div>

        {info.data?.customDomain ? (
          <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
            <code className="text-sm font-bold" dir="ltr">{info.data.customDomain}</code>
            <div className="text-[11px] text-muted-foreground leading-relaxed">
              أضف هذين السجلين عند مزوّد النطاق ليعمل الرابط:
              <div className="mt-2 grid gap-1 font-mono text-[11px]" dir="ltr">
                <span>CNAME&nbsp;&nbsp;www&nbsp;&nbsp;→&nbsp;&nbsp;{platformHost}</span>
                <span>ALIAS/ANAME&nbsp;&nbsp;@&nbsp;&nbsp;→&nbsp;&nbsp;{platformHost}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={unlink}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive hover:underline disabled:opacity-60"
            >
              <Trash2 className="size-3.5" aria-hidden /> إلغاء الربط
            </button>
          </div>
        ) : null}

        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">اربط نطاقًا تملكه</span>
          <div className="mt-1 flex items-center gap-2">
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="mysalon.com"
              dir="ltr"
              className="flex-1 h-11 rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={connect}
              disabled={busy || !domain.trim() || !salonId}
              className="h-11 px-4 rounded-xl bg-gradient-to-l from-primary to-accent text-primary-foreground text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"
            >
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />} ربط
            </button>
          </div>
        </label>

        <div className="rounded-xl border border-border p-3 space-y-2">
          <div className="text-xs font-bold flex items-center gap-1.5">
            <ShoppingCart className="size-3.5 text-primary" aria-hidden /> لا تملكين نطاقًا؟ اشترِ واحدًا
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(searchTerm)}`}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3 rounded-lg border border-border text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-muted"
            >
              Namecheap <ExternalLink className="size-3" aria-hidden />
            </a>
            <a
              href={`https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(searchTerm)}`}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3 rounded-lg border border-border text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-muted"
            >
              GoDaddy <ExternalLink className="size-3" aria-hidden />
            </a>
            <a
              href={`https://sa.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(searchTerm)}`}
              target="_blank"
              rel="noreferrer"
              className="h-9 px-3 rounded-lg border border-border text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-muted"
            >
              نطاقات .sa <ExternalLink className="size-3" aria-hidden />
            </a>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            بعد الشراء، أدخل النطاق في الحقل أعلاه وأضف سجلات DNS — يصبح موقع مشغلك على نطاقك الخاص.
          </p>
        </div>
      </section>
    </div>
  );
}
