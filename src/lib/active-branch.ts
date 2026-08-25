import { useSyncExternalStore } from "react";

/**
 * The branch currently selected in the dashboard header.
 * Everything scoped per branch (services, invoices, POS…) reads this value.
 * `null` means "all branches".
 */
let activeBranchId: string | null = null;
const listeners = new Set<() => void>();

const KEY = "chic-spot:active-branch";

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Restores the stored selection for a salon (call when the account resolves). */
export function restoreActiveBranch(salonId: string | null) {
  if (typeof window === "undefined") return;
  const stored = salonId ? window.localStorage.getItem(`${KEY}:${salonId}`) : null;
  if (stored !== activeBranchId) {
    activeBranchId = stored || null;
    emit();
  }
}

export function setActiveBranch(salonId: string | null, branchId: string | null) {
  activeBranchId = branchId;
  if (typeof window !== "undefined" && salonId) {
    if (branchId) window.localStorage.setItem(`${KEY}:${salonId}`, branchId);
    else window.localStorage.removeItem(`${KEY}:${salonId}`);
  }
  emit();
}

export function getActiveBranch(): string | null {
  return activeBranchId;
}

export function useActiveBranch(): string | null {
  return useSyncExternalStore(subscribe, getActiveBranch, () => null);
}
