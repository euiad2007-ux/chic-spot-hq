import { supabase } from "@/integrations/supabase/client";

export interface JoinRequest {
  id: string;
  salon_id: string;
  branch_id: string | null;
  user_id: string;
  kind: "staff" | "client";
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  note: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  created_at: string;
}

export interface SignupNotification {
  id: string;
  kind: string;
  title: string | null;
  body: string | null;
  created_at: string;
}

/** Self sign-up: clients activate at once, staff wait for manager approval. */
export async function requestJoinSalon(input: {
  salonId: string;
  kind: "staff" | "client";
  name?: string;
  phone?: string;
  jobTitle?: string;
  note?: string;
}): Promise<{ status: "active" | "pending" | "member"; customer_id?: string; request_id?: string }> {
  const { data, error } = await supabase.rpc("request_join_salon", {
    _salon: input.salonId,
    _kind: input.kind,
    _name: input.name || undefined,
    _phone: input.phone || undefined,
    _job_title: input.jobTitle || undefined,
    _note: input.note || undefined,
  });
  if (error) throw new Error(error.message);
  return data as unknown as { status: "active" | "pending" | "member" };
}

/** Requests of one salon only — never crosses tenants. */
export async function listJoinRequests(salonId: string): Promise<JoinRequest[]> {
  const { data, error } = await supabase
    .from("join_requests")
    .select(
      "id, salon_id, branch_id, user_id, kind, name, email, phone, job_title, note, status, reviewed_at, created_at",
    )
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as JoinRequest[];
}

export async function reviewJoinRequest(
  requestId: string,
  approve: boolean,
  branchId?: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("review_join_request", {
    _request: requestId,
    _approve: approve,
    _branch: branchId || undefined,
  });
  if (error) throw new Error(error.message);
}

/** New-registration notifications raised for the merchant. */
export async function listSignupNotifications(salonId: string): Promise<SignupNotification[]> {
  const { data, error } = await supabase
    .from("notification_events")
    .select("id, kind, title, body, created_at")
    .eq("salon_id", salonId)
    .in("kind", ["client_signup", "staff_join_request", "staff_join_approved", "staff_join_rejected"])
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as SignupNotification[];
}

const SEEN_KEY = "salonflow.signups.seenAt";

export function lastSeenSignups(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SEEN_KEY);
}

export function markSignupsSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SEEN_KEY, new Date().toISOString());
}
