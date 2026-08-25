import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "platform_owner"
  | "salon_owner"
  | "branch_manager"
  | "staff"
  | "client";

export const ROLE_LABEL: Record<AppRole, string> = {
  platform_owner: "مالك المنصة",
  salon_owner: "مالك المشغل",
  branch_manager: "مدير الفرع",
  staff: "موظف",
  client: "عميل",
};

export interface Membership {
  salon_id: string | null;
  branch_id: string | null;
  role: AppRole;
}

export interface Account {
  userId: string;
  email: string;
  fullName: string;
  memberships: Membership[];
  role: AppRole;
  salonId: string | null;
  salonName: string | null;
  staffId: string | null;
  customerId: string | null;
  enabledModules: string[];
}

export const ALL_MODULES = [
  "bookings",
  "calendar",
  "services",
  "inventory",
  "staff",
  "payroll",
  "attendance",
  "customers",
  "coupons",
  "invoices",
  "booking_settings",
  "site_settings",
] as const;

const ROLE_RANK: Record<AppRole, number> = {
  platform_owner: 5,
  salon_owner: 4,
  branch_manager: 3,
  staff: 2,
  client: 1,
};

export function homeForRole(role: AppRole): string {
  if (role === "platform_owner") return "/platform";
  if (role === "staff") return "/specialist";
  if (role === "client") return "/client";
  return "/dashboard";
}

export function canManage(role: AppRole | null | undefined): boolean {
  return role === "platform_owner" || role === "salon_owner" || role === "branch_manager";
}

function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0621-\u064A]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const rand = crypto.randomUUID().slice(0, 6);
  return `${base || "salon"}-${rand}`;
}

/** Loads the signed-in user together with tenant membership and role. */
export async function loadAccount(): Promise<Account | null> {
  const { data: userRes, error } = await supabase.auth.getUser();
  if (error || !userRes.user) return null;
  const user = userRes.user;

  const { data: rows } = await supabase
    .from("salon_members")
    .select("salon_id, branch_id, role")
    .eq("user_id", user.id);

  let memberships = (rows ?? []) as Membership[];

  // First sign-in after an owner signup: provision the salon now.
  const pendingSalon = (user.user_metadata?.["salon_name"] as string | undefined) ?? "";
  if (memberships.length === 0 && pendingSalon) {
    const { data: newId, error: rpcErr } = await supabase.rpc("create_salon", {
      _name: pendingSalon,
      _slug: slugify(pendingSalon),
      _phone: (user.user_metadata?.["phone"] as string | undefined) ?? undefined,
    });
    if (!rpcErr && newId) {
      memberships = [{ salon_id: newId as string, branch_id: null, role: "salon_owner" }];
    }
  }

  const primary = [...memberships].sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role])[0];
  const role: AppRole = primary?.role ?? "client";
  const salonId = primary?.salon_id ?? null;

  let salonName: string | null = null;
  let enabledModules: string[] = [...ALL_MODULES];
  if (salonId) {
    const { data: salon } = await supabase
      .from("salons")
      .select("name, plan")
      .eq("id", salonId)
      .maybeSingle();
    salonName = salon?.name ?? null;
    if (salon?.plan) {
      const { data: plan } = await supabase
        .from("platform_plans")
        .select("enabled_modules")
        .eq("code", salon.plan)
        .maybeSingle();
      if (plan?.enabled_modules) enabledModules = plan.enabled_modules;
    }
  }

  // Staff and customer records belong to a single salon; scope the lookup to the
  // active tenant so a person may also be staff/client at other salons.
  const staffQuery = supabase.from("staff").select("id").eq("user_id", user.id);
  if (salonId) staffQuery.eq("salon_id", salonId);
  const { data: staffRows } = await staffQuery.limit(1);
  const staffRow = staffRows?.[0] ?? null;

  const customerQuery = supabase.from("customers").select("id").eq("user_id", user.id);
  if (salonId) customerQuery.eq("salon_id", salonId);
  const { data: customerRows } = await customerQuery.limit(1);
  let customerRow: { id: string } | null = customerRows?.[0] ?? null;


  // No membership and no client profile yet (e.g. first Google sign-in):
  // provision the client profile so their dashboard has real data to show.
  if (role === "client" && !salonId && !customerRow) {
    const { data: newCustomerId } = await supabase.rpc("ensure_client_profile");
    if (newCustomerId) customerRow = { id: newCustomerId as string };
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName:
      (user.user_metadata?.["full_name"] as string | undefined) ?? user.email?.split("@")[0] ?? "",
    memberships,
    role,
    salonId,
    salonName,
    staffId: staffRow?.id ?? null,
    customerId: customerRow?.id ?? null,
    enabledModules,
  };
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(translateAuthError(error.message));
}

export interface SignUpInput {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  /** When present the account is provisioned as a salon owner. */
  salonName?: string;
}

export async function signUp(input: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      emailRedirectTo: window.location.origin + "/auth",
      data: {
        full_name: input.fullName,
        phone: input.phone ?? "",
        salon_name: input.salonName ?? "",
      },
    },
  });
  if (error) throw new Error(translateAuthError(error.message));
  return { needsConfirmation: data.session === null };
}

export async function signOutAccount() {
  await supabase.auth.signOut();
}

/** Resends the sign-up confirmation email. */
export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin + "/auth" },
  });
  if (error) throw new Error(translateAuthError(error.message));
}

/** Creates a salon for the signed-in user and makes them its owner. */
export async function createSalonForCurrentUser(name: string, phone?: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_salon", {
    _name: name.trim(),
    _slug: slugify(name),
    _phone: phone?.trim() || undefined,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

/**
 * Creates the client profile for the signed-in user in one salon.
 * A person may hold a separate client profile at every salon they visit.
 */
export async function ensureClientProfile(salonId?: string | null): Promise<string | null> {
  const { data, error } = await supabase.rpc("ensure_client_profile", 
    salonId ? { _salon: salonId } : {});
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
}


export function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "البريد الإلكتروني أو كلمة المرور غير صحيحة";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "هذا البريد مسجل مسبقًا، جرّب تسجيل الدخول";
  if (m.includes("weak") || m.includes("pwned"))
    return "كلمة المرور مستخدمة في تسريبات معروفة أو ضعيفة جدًا، اختر كلمة مرور أقوى";
  if (m.includes("password")) return "كلمة المرور ضعيفة أو غير مطابقة للشروط (6 أحرف على الأقل)";
  if (m.includes("email not confirmed")) return "لم يتم تأكيد البريد الإلكتروني بعد، تحقق من بريدك";
  if (m.includes("rate limit")) return "عدد المحاولات كبير، حاول بعد قليل";
  return message;
}

/** Sends the password-reset email; the link lands on /reset-password. */
export async function sendPasswordReset(email: string, redirectPath = "/reset-password") {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin + redirectPath,
  });
  if (error) throw new Error(translateAuthError(error.message));
}

/** Sets a new password for the signed-in (or recovery-link) session. */
export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(translateAuthError(error.message));
}
