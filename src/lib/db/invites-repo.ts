import { supabase } from "@/integrations/supabase/client";

export interface StaffInvite {
  id: string;
  salon_id: string;
  branch_id: string | null;
  staff_id: string | null;
  email: string;
  name: string;
  job_title: string | null;
  code: string;
  status: string;
  expires_at: string;
  created_at: string;
}

/** Invites listed for one salon only — invites never cross tenants. */
export async function listStaffInvites(salonId: string): Promise<StaffInvite[]> {
  const { data, error } = await supabase
    .from("staff_invites")
    .select("id, salon_id, branch_id, staff_id, email, name, job_title, code, status, expires_at, created_at")
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as StaffInvite[];
}

export async function createStaffInvite(input: {
  salonId: string;
  name: string;
  email: string;
  branchId?: string | null;
  jobTitle?: string | null;
  staffId?: string | null;
}): Promise<StaffInvite> {
  const { data, error } = await supabase.rpc("create_staff_invite", {
    _salon: input.salonId,
    _name: input.name,
    _email: input.email,
    _branch: input.branchId || undefined,
    _job_title: input.jobTitle || undefined,
    _staff: input.staffId || undefined,
  });
  if (error) throw new Error(error.message);
  return data as unknown as StaffInvite;
}

export async function cancelStaffInvite(id: string) {
  const { error } = await supabase
    .from("staff_invites")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Called by the invited person after signing in with the invited email. */
export async function acceptStaffInvite(code: string): Promise<{ salon_id: string; staff_id: string }> {
  const { data, error } = await supabase.rpc("accept_staff_invite", { _code: code.trim() });
  if (error) throw new Error(error.message);
  return data as unknown as { salon_id: string; staff_id: string };
}

export function inviteLink(code: string, _slug?: string | null): string {
  const base = typeof window === "undefined" ? "" : window.location.origin;
  return `${base}/onboarding?invite=${encodeURIComponent(code)}`;
}
