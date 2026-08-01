import { useQuery, useQueryClient } from "@tanstack/react-query";

import { loadAccount, type Account } from "@/lib/account";

export const ACCOUNT_KEY = ["account"] as const;

export function useAccount() {
  return useQuery<Account | null>({
    queryKey: ACCOUNT_KEY,
    queryFn: loadAccount,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useRefreshAccount() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ACCOUNT_KEY });
}
