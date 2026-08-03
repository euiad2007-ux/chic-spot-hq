import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/account";

export interface MemberRow {
  id: string;
  user_id: string;
  role: AppRole;
  branch_id: string | null;
  created_at: string;
  full_name: string | null;
  phone: string | null;
}

/** Members of a salon with their profile details. */
export async function listMembers(salonId: string): Promise<MemberRow[]> {
  const { data, error } = await supabase
    .from("salon_members")
    .select("id,user_id,role,branch_id,created_at")
    .eq("salon_id", salonId)
    .order("created_at");
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,full_name,phone")
    .in("id", rows.map((r) => r.user_id));
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  return rows.map((r) => ({
    ...r,
    role: r.role as AppRole,
    full_name: byId.get(r.user_id)?.full_name ?? null,
    phone: byId.get(r.user_id)?.phone ?? null,
  }));
}

export async function updateMemberRole(id: string, role: AppRole): Promise<void> {
  const { error } = await supabase.from("salon_members").update({ role }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateMemberBranch(id: string, branchId: string | null): Promise<void> {
  const { error } = await supabase.from("salon_members").update({ branch_id: branchId }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeMember(id: string): Promise<void> {
  const { error } = await supabase.from("salon_members").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
