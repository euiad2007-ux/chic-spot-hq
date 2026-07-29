import { useSyncExternalStore } from "react";

export interface RewardsSettings {
  // Loyalty
  loyaltyRate: number;           // points earned per SAR spent (e.g. 0.1)
  loyaltyRedeemRate: number;     // SAR value per point (e.g. 1)
  loyaltyMinRedeem: number;      // minimum points to redeem at once
  loyaltyEnabled: boolean;
  // Referral
  referralEnabled: boolean;
  referralCommissionPct: number; // % of invoice total → referrer's wallet
  referralWelcomeBonus: number;  // SAR credited to new referee's wallet on signup
  referralCouponCode?: string;   // optional coupon code auto-associated with referrals
}

const KEY = "lamsa_rewards_v1";

const defaults: RewardsSettings = {
  loyaltyRate: 0.1,
  loyaltyRedeemRate: 1,
  loyaltyMinRedeem: 10,
  loyaltyEnabled: true,
  referralEnabled: true,
  referralCommissionPct: 5,
  referralWelcomeBonus: 20,
  referralCouponCode: "",
};

let state: RewardsSettings = defaults;
let initialized = false;
let hydrated = false;
const listeners = new Set<() => void>();

function ensure() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...defaults, ...JSON.parse(raw) };
  } catch {}
}

function persist() {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}

export function useRewardsSettings(): RewardsSettings {
  return useSyncExternalStore(
    (l) => {
      ensure();
      listeners.add(l);
      if (!hydrated) {
        hydrated = true;
        queueMicrotask(() => listeners.forEach((x) => x()));
      }
      return () => listeners.delete(l);
    },
    () => (hydrated ? state : defaults),
    () => defaults,
  );
}

export function getRewardsSettings(): RewardsSettings {
  ensure();
  return state;
}

export const rewardsActions = {
  update(patch: Partial<RewardsSettings>) {
    state = { ...state, ...patch };
    persist();
  },
  reset() { state = defaults; persist(); },
};
