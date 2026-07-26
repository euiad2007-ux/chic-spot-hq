import { useSyncExternalStore } from "react";

export type Role = "client" | "staff" | "owner";

export interface Session {
  role: Role;
  id: string; // customer id or staff id
  name: string;
}

const KEY = "lamsa_session_v1";
let session: Session | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function ensure() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) session = JSON.parse(raw);
  } catch {}
}

function emit() {
  if (typeof window !== "undefined") {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  }
  listeners.forEach((l) => l());
}

export function useSession(): Session | null {
  ensure();
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session,
    () => session,
  );
}

export const auth = {
  signIn(s: Session) {
    session = s;
    emit();
  },
  signOut() {
    session = null;
    emit();
  },
  get current() {
    ensure();
    return session;
  },
};
