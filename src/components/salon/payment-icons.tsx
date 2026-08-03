import { cn } from "@/lib/utils";

export type PaymentMethodId =
  | "visa"
  | "mastercard"
  | "mada"
  | "applepay"
  | "googlepay"
  | "amex"
  | "stcpay"
  | "cash";

export interface PaymentMethodDef {
  id: PaymentMethodId;
  label: string;
  labelAr: string;
}

export const PAYMENT_METHODS: PaymentMethodDef[] = [
  { id: "visa", label: "Visa", labelAr: "فيزا" },
  { id: "mastercard", label: "Mastercard", labelAr: "ماستركارد" },
  { id: "mada", label: "mada", labelAr: "مدى" },
  { id: "applepay", label: "Apple Pay", labelAr: "أبل باي" },
  { id: "googlepay", label: "Google Pay", labelAr: "قوقل باي" },
  { id: "amex", label: "American Express", labelAr: "أميكس" },
  { id: "stcpay", label: "STC Pay", labelAr: "STC Pay" },
  { id: "cash", label: "Cash", labelAr: "نقدًا" },
];

/** Payment brand badges rendered as inline SVG — no external assets. */
export function PaymentIcon({ id, className }: { id: PaymentMethodId; className?: string }) {
  const base = cn("h-8 w-14 rounded-md bg-white shadow-sm border border-black/5 shrink-0", className);
  switch (id) {
    case "visa":
      return (
        <svg viewBox="0 0 56 32" className={base} aria-label="Visa">
          <rect width="56" height="32" rx="4" fill="#ffffff" />
          <text x="28" y="22" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontStyle="italic" fontWeight="900" fontSize="14" fill="#1A1F71" letterSpacing="1">VISA</text>
        </svg>
      );
    case "mastercard":
      return (
        <svg viewBox="0 0 56 32" className={base} aria-label="Mastercard">
          <rect width="56" height="32" rx="4" fill="#ffffff" />
          <circle cx="23" cy="16" r="8" fill="#EB001B" />
          <circle cx="33" cy="16" r="8" fill="#F79E1B" />
          <path d="M28 10a8 8 0 0 1 0 12 8 8 0 0 1 0-12z" fill="#FF5F00" />
        </svg>
      );
    case "amex":
      return (
        <svg viewBox="0 0 56 32" className={base} aria-label="Amex">
          <rect width="56" height="32" rx="4" fill="#2E77BC" />
          <text x="28" y="14" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="6" fill="#fff">AMERICAN</text>
          <text x="28" y="22" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="6" fill="#fff">EXPRESS</text>
        </svg>
      );
    case "mada":
      return (
        <svg viewBox="0 0 56 32" className={base} aria-label="mada">
          <rect width="56" height="32" rx="4" fill="#ffffff" />
          <rect x="6" y="6" width="44" height="4" fill="#84B740" />
          <rect x="6" y="22" width="44" height="4" fill="#231F20" />
          <text x="28" y="20" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="9" fill="#231F20">mada</text>
        </svg>
      );
    case "applepay":
      return (
        <svg viewBox="0 0 56 32" className={base} aria-label="Apple Pay">
          <rect width="56" height="32" rx="4" fill="#000000" />
          <path d="M15.5 12.4c-.4.5-1 .9-1.6.8-.1-.6.2-1.2.6-1.6.4-.5 1-.8 1.6-.9.1.6-.2 1.2-.6 1.7zm.6.9c-.9-.1-1.6.5-2 .5-.4 0-1-.5-1.7-.5-.9 0-1.7.5-2.1 1.3-.9 1.6-.2 3.9.7 5.2.4.6.9 1.3 1.6 1.3.6 0 .9-.4 1.7-.4.8 0 1 .4 1.7.4.7 0 1.2-.6 1.6-1.3.5-.7.7-1.4.7-1.4-.1 0-1.3-.5-1.3-2 0-1.2 1-1.8 1.1-1.8-.6-.9-1.5-1-1.8-1zm7.2-2v10.1h1.6v-3.4h2.2c2 0 3.4-1.4 3.4-3.4s-1.4-3.3-3.4-3.3zm1.6 1.4h1.8c1.4 0 2.2.7 2.2 2s-.8 2-2.2 2h-1.8zm9.5 8.8c1 0 1.9-.5 2.3-1.3v1.2h1.5v-5.1c0-1.5-1.2-2.5-3-2.5-1.7 0-2.9 1-3 2.3h1.4c.1-.6.7-1 1.5-1 1 0 1.6.5 1.6 1.3v.6l-2 .1c-1.9.1-2.9.9-2.9 2.2 0 1.4 1 2.2 2.6 2.2zm.4-1.2c-.9 0-1.4-.4-1.4-1.1s.5-1 1.6-1.1l1.8-.1v.6c0 1-.9 1.7-2 1.7zm5.4 3.9c1.5 0 2.2-.6 2.9-2.4l2.6-7.2H45l-1.7 5.6-1.7-5.6h-1.7l2.5 7-.1.4c-.2.7-.6.9-1.3.9h-.4v1.2c.1 0 .4.1.6.1z" fill="#fff"/>
        </svg>
      );
    case "googlepay":
      return (
        <svg viewBox="0 0 56 32" className={base} aria-label="Google Pay">
          <rect width="56" height="32" rx="4" fill="#ffffff" />
          <text x="16" y="20" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="9">
            <tspan fill="#4285F4">G</tspan>
            <tspan fill="#EA4335">o</tspan>
            <tspan fill="#FBBC04">o</tspan>
            <tspan fill="#4285F4">g</tspan>
            <tspan fill="#34A853">l</tspan>
            <tspan fill="#EA4335">e</tspan>
          </text>
          <text x="41" y="20" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="9" fill="#5F6368">Pay</text>
        </svg>
      );
    case "stcpay":
      return (
        <svg viewBox="0 0 56 32" className={base} aria-label="STC Pay">
          <rect width="56" height="32" rx="4" fill="#4F008C" />
          <text x="28" y="20" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="900" fontSize="10" fill="#fff">stc pay</text>
        </svg>
      );
    case "cash":
      return (
        <svg viewBox="0 0 56 32" className={base} aria-label="Cash">
          <rect width="56" height="32" rx="4" fill="#F0FDF4" />
          <rect x="8" y="10" width="40" height="12" rx="2" fill="none" stroke="#16A34A" strokeWidth="1.5" />
          <circle cx="28" cy="16" r="3" fill="none" stroke="#16A34A" strokeWidth="1.5" />
          <text x="28" y="30" textAnchor="middle" fontFamily="Arial" fontSize="0" fill="#16A34A">Cash</text>
        </svg>
      );
  }
}
