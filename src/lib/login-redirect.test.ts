import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * End-to-end guarantee for the login flow: a successful sign-in must never
 * bounce the user back to /auth, even when the Auth revalidation call fails
 * because of a weak or flaky network.
 */

type AuthResult = { data: { user: unknown; session?: unknown }; error: unknown };

const state = {
  /** Queued `getUser()` results, consumed in order (last one repeats). */
  getUser: [] as AuthResult[],
  session: null as null | { user: { id: string }; expires_at?: number },
  signInError: null as null | { message: string },
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getUser: async () => {
        const next = state.getUser.length > 1 ? state.getUser.shift()! : state.getUser[0]!;
        return next;
      },
      getSession: async () => ({ data: { session: state.session }, error: null }),
      signInWithPassword: async () => ({
        data: { session: state.signInError ? null : state.session },
        error: state.signInError,
      }),
    },
  },
}));

const netError = { message: "TypeError: Failed to fetch" };
const authError = { message: "Invalid login credentials" };
const user = { id: "user-1", email: "owner@example.com" };

async function guardRedirectsToAuth() {
  const { resolveUserResilient } = await import("@/lib/auth-session");
  const { user: resolved } = await resolveUserResilient();
  return !resolved; // mirrors `if (!user) throw redirect({ to: "/auth" })`
}

describe("login never bounces back to /auth on success", () => {
  beforeEach(() => {
    vi.resetModules();
    state.getUser = [{ data: { user }, error: null }];
    state.session = { user, expires_at: Math.floor(Date.now() / 1000) + 3600 };
    state.signInError = null;
  });

  it("keeps the user in the app on a healthy network", async () => {
    expect(await guardRedirectsToAuth()).toBe(false);
  });

  it("keeps the user in the app when the first revalidation attempts time out", async () => {
    state.getUser = [
      { data: { user: null }, error: netError },
      { data: { user: null }, error: { message: "network request failed" } },
      { data: { user }, error: null },
    ];
    expect(await guardRedirectsToAuth()).toBe(false);
  });

  it("falls back to the stored session when Auth stays unreachable", async () => {
    state.getUser = [{ data: { user: null }, error: netError }];
    const { resolveUserResilient } = await import("@/lib/auth-session");
    const result = await resolveUserResilient();
    expect(result.user?.id).toBe("user-1");
    expect(result.degraded).toBe(true);
  });

  it("still redirects when the stored session is expired and Auth is unreachable", async () => {
    state.getUser = [{ data: { user: null }, error: netError }];
    state.session = { user, expires_at: Math.floor(Date.now() / 1000) - 60 };
    expect(await guardRedirectsToAuth()).toBe(true);
  });

  it("redirects a genuinely signed-out visitor without retrying", async () => {
    state.getUser = [{ data: { user: null }, error: { message: "Auth session missing!" } }];
    state.session = null;
    expect(await guardRedirectsToAuth()).toBe(true);
  });

  it("sign-in resolves (no bounce) even if revalidation is flaky", async () => {
    state.getUser = [
      { data: { user: null }, error: netError },
      { data: { user }, error: null },
    ];
    const { signIn } = await import("@/lib/account");
    const session = await signIn("owner@example.com", "secret123");
    expect(session).toBeTruthy();
    expect(await guardRedirectsToAuth()).toBe(false);
  });

  it("sign-in rejects wrong credentials instead of entering the app", async () => {
    state.signInError = authError;
    state.getUser = [{ data: { user: null }, error: { message: "Auth session missing!" } }];
    state.session = null;
    const { signIn } = await import("@/lib/account");
    await expect(signIn("owner@example.com", "bad")).rejects.toThrow();
    expect(await guardRedirectsToAuth()).toBe(true);
  });
});
