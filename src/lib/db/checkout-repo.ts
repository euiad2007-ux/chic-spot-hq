import { supabase } from "@/integrations/supabase/client";
import { flushSalonSave } from "@/lib/db/salon-repo";
import { hydrateAll } from "@/lib/db/hydrate";
import { getRewardsSettings } from "@/lib/rewards-settings";

export interface CheckoutResult {
  invoiceId: string;
  number: string;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  walletUsed: number;
  points: number;
}

export interface CheckoutInput {
  bookingId: string;
  method: string;
  /** Amount to take from the customer's wallet. The server caps it by the real balance. */
  walletUsed?: number;
  couponCode?: string;
}

/**
 * Issues the booking invoice on the server: totals, VAT, coupon validation,
 * stock deduction, wallet spend, loyalty points and referral commission all
 * happen inside one database transaction — never in the browser.
 */
export async function checkoutBookingOnServer(input: CheckoutInput): Promise<CheckoutResult> {
  // Make sure the booking (and its service lines) already exist server-side.
  await flushSalonSave();
  const rewards = getRewardsSettings();

  const { data, error } = await supabase.rpc("checkout_booking", {
    _booking: input.bookingId,
    _method: input.method,
    _wallet_used: input.walletUsed ?? 0,
    _coupon: input.couponCode ?? undefined,
    _loyalty_rate: rewards.loyaltyRate,
    _referral_pct: rewards.referralCommissionPct,
  });
  if (error) throw new Error(error.message);

  const r = (data ?? {}) as Record<string, unknown>;
  await hydrateAll(true);
  return {
    invoiceId: String(r["invoice_id"] ?? ""),
    number: String(r["number"] ?? ""),
    subtotal: Number(r["subtotal"] ?? 0),
    discount: Number(r["discount"] ?? 0),
    vat: Number(r["vat"] ?? 0),
    total: Number(r["total"] ?? 0),
    walletUsed: Number(r["wallet_used"] ?? 0),
    points: Number(r["points"] ?? 0),
  };
}

/** Converts loyalty points into wallet credit through a recorded server ledger. */
export async function redeemLoyaltyOnServer(customerId: string, points: number): Promise<number> {
  await flushSalonSave();
  const rewards = getRewardsSettings();
  const { data, error } = await supabase.rpc("redeem_loyalty", {
    _customer: customerId,
    _points: points,
    _rate: rewards.loyaltyRedeemRate,
  });
  if (error) throw new Error(error.message);
  await hydrateAll(true);
  return Number(data ?? 0);
}

/** Cancels bookings whose payment hold has expired (server-side, no stock impact). */
export async function cancelExpiredHoldsOnServer(salonId: string): Promise<number> {
  const { data, error } = await supabase.rpc("cancel_expired_holds", { _salon: salonId });
  if (error) throw new Error(error.message);
  const n = Number(data ?? 0);
  if (n > 0) await hydrateAll(true);
  return n;
}
