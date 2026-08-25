import type { PublicBranding } from "@/lib/db/public-hydrate";

/**
 * Salon-branded loading screen: shows the salon's own logo, name and brand
 * colours while the storefront data is being fetched. Never shows platform
 * branding.
 */
export function SalonBrandedLoader({
  branding,
  hidden,
}: {
  branding: PublicBranding | null;
  hidden: boolean;
}) {
  const primary = branding?.primary || "#C9A227";
  const accent = branding?.accent || primary;
  const background = branding?.background || "#FFFFFF";
  const textColor = branding?.textColor || "#1A1A1A";
  const hasBranding = Boolean(branding?.salonName || branding?.logoUrl);

  return (
    <div
      dir="rtl"
      aria-hidden={hidden}
      aria-busy={!hidden}
      className={`fixed inset-0 z-[999] grid place-items-center px-6 transition-opacity duration-700 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{
        background: `radial-gradient(120% 120% at 50% 0%, ${accent}22 0%, ${background} 60%)`,
        color: textColor,
      }}
    >
      <div className="flex flex-col items-center gap-6 text-center animate-[salonLoaderIn_600ms_ease-out]">
        <style>{`@keyframes salonLoaderIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes salonLoaderPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.04);opacity:.85}}`}</style>

        {branding?.logoUrl ? (
          <img
            src={branding.logoUrl}
            alt={branding.salonName}
            className="h-24 w-auto max-w-[240px] object-contain"
            style={{ animation: "salonLoaderPulse 1.8s ease-in-out infinite" }}
          />
        ) : hasBranding ? (
          <div
            className="grid size-20 place-items-center rounded-full text-2xl font-extrabold"
            style={{ background: primary, color: background, animation: "salonLoaderPulse 1.8s ease-in-out infinite" }}
          >
            {branding?.salonName.trim().charAt(0)}
          </div>
        ) : null}

        {branding?.salonName ? (
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{branding.salonName}</h1>
        ) : null}

        <div className="h-1 w-40 overflow-hidden rounded-full" style={{ background: `${primary}22` }}>
          <div
            className="h-full w-1/3 rounded-full"
            style={{ background: primary, animation: "salonLoaderSweep 1.2s ease-in-out infinite" }}
          />
          <style>{`@keyframes salonLoaderSweep{0%{transform:translateX(-120%)}100%{transform:translateX(340%)}}`}</style>
        </div>
      </div>
    </div>
  );
}
