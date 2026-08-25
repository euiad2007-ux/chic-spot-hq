import { initDataContext, getDataContext } from "@/lib/db/context";
import { loadSalonState } from "@/lib/db/salon-repo";
import { loadSettingsBundle } from "@/lib/db/settings-repo";
import { loadAttendanceRecords } from "@/lib/db/attendance-repo";
import { loadCoupons } from "@/lib/db/coupons-repo";
import { loadPayrollPayments } from "@/lib/db/payroll-repo";

import { hydrateSalonStore } from "@/lib/salon-store";
import { hydrateAttendanceStore } from "@/lib/attendance-store";
import { hydratePayrollStore } from "@/lib/payroll-store";
import { hydrateCouponStore } from "@/lib/coupon-store";
import { hydrateSiteSettings } from "@/lib/site-settings";
import { hydrateBookingSettings } from "@/lib/booking-settings";
import { hydrateRewardsSettings } from "@/lib/rewards-settings";
import { hydrateInvoiceSettings } from "@/lib/invoice-settings";

let started = false;
let done: Promise<void> | null = null;

/**
 * Loads every workspace store from the database. Safe to call repeatedly —
 * the work happens once per page load.
 */
export function hydrateAll(force = false): Promise<void> {
  if (done && !force) return done;
  if (started && !force) return done ?? Promise.resolve();
  started = true;
  done = (async () => {
    const ctx = await initDataContext(force);
    if (!ctx?.salonId) {
      // Signed out or not attached to a salon yet: mark stores as loaded/empty.
      hydrateSalonStore(null);
      hydrateAttendanceStore({ records: [] });
      hydratePayrollStore({ payments: [] });
      hydrateCouponStore([]);
      hydrateSiteSettings(null);
      hydrateBookingSettings(null);
      hydrateRewardsSettings(null);
      hydrateInvoiceSettings(null);
      return;
    }
    const salonId = ctx.salonId;
    const [state, settings, attendance, coupons, payments] = await Promise.all([
      loadSalonState(salonId),
      loadSettingsBundle(salonId),
      loadAttendanceRecords(salonId),
      loadCoupons(salonId),
      loadPayrollPayments(salonId),
    ]);

    hydrateSalonStore(state);
    hydrateSiteSettings(settings.site);
    hydrateRewardsSettings(settings.rewards);
    hydrateInvoiceSettings(settings.invoice);

    const bookingDoc = (settings.booking ?? {}) as Record<string, unknown>;
    const attendanceSettings = bookingDoc["attendance"] as Record<string, unknown> | undefined;
    hydrateBookingSettings(bookingDoc);
    hydrateAttendanceStore({ settings: attendanceSettings, records: attendance });

    const payrollDoc = (settings.payroll ?? {}) as Record<string, unknown>;
    hydratePayrollStore({ settings: payrollDoc, payments });

    hydrateCouponStore(coupons);
  })();
  return done;
}

export function currentSalonId(): string | null {
  return getDataContext()?.salonId ?? null;
}

export function resetHydration() {
  started = false;
  done = null;
}
