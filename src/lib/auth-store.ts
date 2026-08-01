import { useAccount } from "@/hooks/use-account";
import { signOutAccount } from "@/lib/account";
import { supabase } from "@/integrations/supabase/client";

/**
 * Compatibility layer over the real Supabase-backed account.
 * Roles are derived from the database (salon_members), never from localStorage.
 */
export type Role = "client" | "staff" | "owner";

export interface Session {
  role: Role;
  id: string; // customer id or staff id
  name: string;
}

/** `undefined` while the account is loading, `null` when signed out. */
export function useSession(): Session | null | undefined {
  const { data, isLoading } = useAccount();
  if (isLoading) return undefined;
  if (!data) return null;
  if (data.role === "client") {
    return { role: "client", id: data.customerId ?? "", name: data.fullName };
  }
  if (data.role === "staff") {
    return { role: "staff", id: data.staffId ?? "", name: data.fullName };
  }
  return { role: "owner", id: data.userId, name: data.fullName };
}

export const auth = {
  async signOut() {
    await signOutAccount();
  },
  async currentUserId() {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  },
};
