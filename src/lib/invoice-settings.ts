import { useSyncExternalStore } from "react";

/** Paper format of the printed/generated invoice. */
export type InvoicePaper = "thermal" | "a4";

export interface InvoiceSettings {
  paper: InvoicePaper;
  thermalWidthMm: 58 | 80;
  /** Content toggles */
  showLogo: boolean;
  showDateTime: boolean;
  showSalonName: boolean;
  showBranch: boolean;
  showStaff: boolean;
  showCustomer: boolean;
  showQr: boolean;
  showBarcode: boolean;
  showVatBreakdown: boolean;
  /** Identity printed on the invoice */
  vatNumber: string;
  crNumber: string;
  invoiceTitle: string;
  footerNote: string;
  /** Automatic delivery */
  autoEmail: boolean;
  autoWhatsapp: boolean;
  emailSubject: string;
  waTemplate: string;
}

const defaults: InvoiceSettings = {
  paper: "thermal",
  thermalWidthMm: 80,
  showLogo: true,
  showDateTime: true,
  showSalonName: true,
  showBranch: true,
  showStaff: true,
  showCustomer: true,
  showQr: true,
  showBarcode: true,
  showVatBreakdown: true,
  vatNumber: "300000000000003",
  crNumber: "",
  invoiceTitle: "فاتورة ضريبية مبسطة",
  footerNote: "شكراً لزيارتك ✦ نراك قريباً",
  autoEmail: true,
  autoWhatsapp: true,
  emailSubject: "فاتورتك من {salon} — {number}",
  waTemplate:
    "مرحباً {customer} 🌸\nفاتورتك رقم {number} من {salon}\nالإجمالي: {total}\nنسخة PDF: {pdf}",
};

let state: InvoiceSettings = defaults;
let hydrated = false;
const listeners = new Set<() => void>();

function persist() {
  listeners.forEach((l) => l());
  if (typeof window === "undefined") return;
  void import("@/lib/db/settings-repo").then((m) => m.scheduleSettingsSave("invoice", state));
}

/** Called once by the data layer with the salon's stored invoice document. */
export function hydrateInvoiceSettings(doc: Record<string, unknown> | null) {
  state = doc ? { ...defaults, ...(doc as Partial<InvoiceSettings>) } : defaults;
  hydrated = true;
  listeners.forEach((l) => l());
}

export function useInvoiceSettings(): InvoiceSettings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => (hydrated ? state : defaults),
    () => defaults,
  );
}

export function getInvoiceSettings(): InvoiceSettings {
  return state;
}

export const invoiceSettingsActions = {
  update(patch: Partial<InvoiceSettings>) {
    state = { ...state, ...patch };
    persist();
  },
  reset() {
    state = defaults;
    persist();
  },
  async saveNow() {
    const m = await import("@/lib/db/settings-repo");
    await m.saveSettingsNow("invoice", state);
  },
};

export const INVOICE_DEFAULTS = defaults;

/** Fills {placeholders} in email/WhatsApp templates. */
export function fillInvoiceTemplate(tpl: string, vars: Record<string, string>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
