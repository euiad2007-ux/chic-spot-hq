import type { User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";

/** Errors that mean "the request never reached Auth", not "you are signed out". */
function isNetworkish(message?: string) {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("network request failed") ||
    m.includes("load failed") ||
    m.includes("timeout") ||
    m.includes("timed out") ||
    m.includes("aborted") ||
    m.includes("fetch failed") ||
    m.includes("upstream") ||
    m.includes("502") ||
    m.includes("503") ||
    m.includes("504")
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolve the current user without punishing a slow or flaky connection.
 *
 * `getUser()` revalidates with the Auth server, so on weak networks it can fail
 * even though a perfectly valid session is stored locally. Retrying and then
 * falling back to the locally persisted (non-expired) session keeps a
 * successful login from bouncing back to the sign-in page.
 */
export async function resolveUserResilient(
  attempts = 3,
): Promise<{ user: User | null; degraded: boolean }> {
  let lastNetworkish = false;

  for (let i = 0; i < attempts; i += 1) {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) return { user: data.user, degraded: false };

    lastNetworkish = isNetworkish(error?.message);
    if (!lastNetworkish) break; // a real auth failure: stop retrying
    if (i < attempts - 1) await delay(400 * (i + 1));
  }

  if (lastNetworkish) {
    // Trust the locally stored session while Auth is unreachable.
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const stillValid =
      session?.user &&
      (!session.expires_at || session.expires_at * 1000 > Date.now());
    if (stillValid) return { user: session!.user, degraded: true };
  }

  return { user: null, degraded: false };
}
