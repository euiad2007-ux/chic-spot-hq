import { supabase } from "@/integrations/supabase/client";

/* ---------------------------------- types --------------------------------- */

export interface SaleProduct {
  id: string;
  name: string;
  unit: string;
  stock: number;
  cost_per_unit: number;
  is_for_sale: boolean;
  sale_price: number;
  sku: string | null;
}

export interface Branch {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  active: boolean;
  geofence_m: number;
  created_at: string;
  lat: number | null;
  lng: number | null;
  maps_url: string | null;
  email: string | null;
  whatsapp: string | null;
  hours: string | null;
  manager_staff_id: string | null;
}

export interface BranchInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  geofence_m?: number;
  lat?: number | null;
  lng?: number | null;
  maps_url?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  hours?: string | null;
  manager_staff_id?: string | null;
  active?: boolean;
}

/** Google Maps link for a branch: explicit link first, then coordinates, then address. */
export function branchMapsUrl(b: {
  maps_url?: string | null;
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  name?: string;
}): string | null {
  if (b.maps_url) return b.maps_url;
  if (b.lat != null && b.lng != null)
    return `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`;
  const q = b.address || b.name;
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

/** Extracts coordinates from a pasted Google Maps link, when present. */
export function parseMapsCoords(url: string): { lat: number; lng: number } | null {
  const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const q = url.match(/[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const m = at ?? q;
  if (!m) return null;
  return { lat: Number(m[1]), lng: Number(m[2]) };
}


export interface CashShift {
  id: string;
  salon_id: string;
  branch_id: string | null;
  opened_at: string;
  opening_float: number;
  closed_at: string | null;
  counted_cash: number | null;
  expected_cash: number | null;
  difference: number | null;
  cash_sales: number;
  card_sales: number;
  cash_expenses: number;
  status: string;
  note: string | null;
  cashier_staff_id: string | null;
  cashier_name: string | null;
  opening_card: number;
  counted_card: number | null;
}

export interface Expense {
  id: string;
  branch_id: string | null;
  shift_id: string | null;
  category: string;
  amount: number;
  method: string;
  spent_on: string;
  vendor: string | null;
  note: string | null;
  created_at: string;
}

export interface CartLine {
  kind: "service" | "product";
  id: string;
  name: string;
  qty: number;
  unit_price: number;
}

export const EXPENSE_CATEGORIES: { code: string; label: string }[] = [
  { code: "rent", label: "إيجار" },
  { code: "salaries", label: "رواتب" },
  { code: "supplies", label: "مستلزمات ومواد" },
  { code: "utilities", label: "كهرباء وماء واتصالات" },
  { code: "marketing", label: "تسويق" },
  { code: "maintenance", label: "صيانة" },
  { code: "government", label: "رسوم حكومية" },
  { code: "other", label: "أخرى" },
];

export const expenseCategoryLabel = (code: string) =>
  EXPENSE_CATEGORIES.find((c) => c.code === code)?.label ?? code;

export const PAY_METHODS: { code: string; label: string }[] = [
  { code: "cash", label: "نقدًا (كاش)" },
  { code: "card", label: "شبكة / مدى (جهاز نقاط البيع)" },
  { code: "transfer", label: "تحويل بنكي" },
];

export const payMethodLabel = (code: string) =>
  PAY_METHODS.find((m) => m.code === code)?.label ?? code;

/* --------------------------------- products -------------------------------- */

export async function listProducts(salonId: string): Promise<SaleProduct[]> {
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, name, unit, stock, cost_per_unit, is_for_sale, sale_price, sku")
    .eq("salon_id", salonId)
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? []) as SaleProduct[];
}

export async function updateProductSale(
  id: string,
  patch: { is_for_sale?: boolean; sale_price?: number; sku?: string | null },
) {
  const { error } = await supabase.from("inventory_items").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

/* --------------------------------- branches -------------------------------- */

export async function listBranches(salonId: string): Promise<Branch[]> {
  const { data, error } = await supabase
    .from("branches")
    .select(
      "id, name, phone, address, active, geofence_m, created_at, lat, lng, maps_url, email, whatsapp, hours, manager_staff_id",
    )
    .eq("salon_id", salonId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as Branch[];
}

export async function createBranch(salonId: string, input: BranchInput) {
  const { error } = await supabase.from("branches").insert({
    salon_id: salonId,
    name: input.name,
    phone: input.phone || null,
    address: input.address || null,
    geofence_m: input.geofence_m ?? 150,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
    maps_url: input.maps_url || null,
    email: input.email || null,
    whatsapp: input.whatsapp || null,
    hours: input.hours || null,
    manager_staff_id: input.manager_staff_id || null,
  });
  if (error) throw new Error(error.message);
}

export async function updateBranch(id: string, patch: Partial<BranchInput>) {
  const { error } = await supabase.from("branches").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}


/* ---------------------------------- shifts --------------------------------- */

export async function listShifts(salonId: string, limit = 30): Promise<CashShift[]> {
  const { data, error } = await supabase
    .from("cash_shifts")
    .select("*")
    .eq("salon_id", salonId)
    .order("opened_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as CashShift[];
}

export function findOpenShift(shifts: CashShift[], branchId: string | null): CashShift | null {
  return (
    shifts.find((s) => s.status === "open" && (s.branch_id ?? null) === (branchId ?? null)) ?? null
  );
}

export interface ShiftOpenExtras {
  cashierStaffId?: string | null;
  cashierName?: string | null;
  /** Opening balance already sitting on the card terminal (جهاز الشبكة). */
  openingCard?: number;
}

export async function openShift(
  salonId: string,
  branchId: string | null,
  openingFloat: number,
  extras?: ShiftOpenExtras,
) {
  const { data, error } = await supabase.rpc("open_shift", {
    _salon: salonId,
    _branch: branchId,
    _opening_float: openingFloat,
  } as never);
  if (error) throw new Error(error.message);
  const id = data as string;
  if (extras && (extras.cashierName || extras.cashierStaffId || extras.openingCard)) {
    await supabase
      .from("cash_shifts")
      .update({
        cashier_staff_id: extras.cashierStaffId ?? null,
        cashier_name: extras.cashierName ?? null,
        opening_card: extras.openingCard ?? 0,
      } as never)
      .eq("id", id);
  }
  return id;
}

/** Stores the counted card-terminal amount alongside the standard cash closing. */
export async function setShiftCountedCard(shiftId: string, countedCard: number) {
  const { error } = await supabase
    .from("cash_shifts")
    .update({ counted_card: countedCard } as never)
    .eq("id", shiftId);
  if (error) throw new Error(error.message);
}

export interface ShiftClosing {
  expected_cash: number;
  counted_cash: number;
  difference: number;
  cash_sales: number;
  card_sales: number;
  cash_expenses: number;
}

export async function closeShift(shiftId: string, counted: number, note?: string) {
  const { data, error } = await supabase.rpc("close_shift", {
    _shift: shiftId,
    _counted: counted,
    _note: note ?? null,
  } as never);
  if (error) throw new Error(error.message);
  return data as unknown as ShiftClosing;
}

/** Live cash position of an open shift (payments + cash expenses recorded so far). */
export async function shiftTotals(shiftId: string) {
  const [payments, expenses] = await Promise.all([
    supabase.from("invoice_payments").select("amount, method, is_refund").eq("shift_id", shiftId),
    supabase.from("expenses").select("amount, method").eq("shift_id", shiftId),
  ]);
  let cash = 0;
  let card = 0;
  for (const p of payments.data ?? []) {
    const signed = p.is_refund ? -Number(p.amount) : Number(p.amount);
    if (p.method === "cash") cash += signed;
    else card += signed;
  }
  const cashExpenses = (expenses.data ?? [])
    .filter((e) => e.method === "cash")
    .reduce((a, e) => a + Number(e.amount), 0);
  return { cash, card, cashExpenses };
}

/* --------------------------------- expenses -------------------------------- */

export async function listExpenses(salonId: string, from?: string, to?: string): Promise<Expense[]> {
  let q = supabase
    .from("expenses")
    .select("id, branch_id, shift_id, category, amount, method, spent_on, vendor, note, created_at")
    .eq("salon_id", salonId);
  if (from) q = q.gte("spent_on", from);
  if (to) q = q.lte("spent_on", to);
  const { data, error } = await q.order("spent_on", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Expense[];
}

export async function addExpense(
  salonId: string,
  input: {
    category: string;
    amount: number;
    method: string;
    spent_on: string;
    vendor?: string;
    note?: string;
    branch_id?: string | null;
    shift_id?: string | null;
  },
) {
  const { data: userRes } = await supabase.auth.getUser();
  const { error } = await supabase.from("expenses").insert({
    salon_id: salonId,
    category: input.category,
    amount: input.amount,
    method: input.method,
    spent_on: input.spent_on,
    vendor: input.vendor || null,
    note: input.note || null,
    branch_id: input.branch_id ?? null,
    shift_id: input.shift_id ?? null,
    created_by: userRes.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ----------------------------------- POS ---------------------------------- */

export interface CheckoutResult {
  invoice_id: string;
  number: string;
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
}

export async function posCheckout(args: {
  salonId: string;
  branchId: string | null;
  customerId: string | null;
  items: CartLine[];
  method: string;
  discount: number;
  shiftId: string | null;
}) {
  const { data, error } = await supabase.rpc("pos_checkout", {
    _salon: args.salonId,
    _branch: args.branchId,
    _customer: args.customerId,
    _items: args.items,
    _method: args.method,
    _discount: args.discount,
    _shift: args.shiftId,
  } as never);
  if (error) throw new Error(error.message);
  return data as unknown as CheckoutResult;
}

/* --------------------------------- reports -------------------------------- */

export interface ReportData {
  revenue: number;
  vat: number;
  discounts: number;
  collected: number;
  refunded: number;
  expenses: number;
  net: number;
  invoiceCount: number;
  bookingCount: number;
  byMethod: { method: string; amount: number }[];
  byExpenseCategory: { category: string; amount: number }[];
  topItems: { name: string; qty: number; total: number }[];
  posSales: number;
  bookingSales: number;
}

export async function loadReport(salonId: string, from: string, to: string): Promise<ReportData> {
  const fromIso = `${from}T00:00:00.000Z`;
  const toIso = `${to}T23:59:59.999Z`;

  const [invoicesRes, paymentsRes, expensesRes, bookingsRes, itemsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, subtotal, discount, vat, total, source, created_at")
      .eq("salon_id", salonId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("invoice_payments")
      .select("amount, method, is_refund, created_at")
      .eq("salon_id", salonId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
    supabase
      .from("expenses")
      .select("amount, category, spent_on")
      .eq("salon_id", salonId)
      .gte("spent_on", from)
      .lte("spent_on", to),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("salon_id", salonId)
      .gte("booking_date", from)
      .lte("booking_date", to),
    supabase
      .from("invoice_items")
      .select("name, qty, total, created_at")
      .eq("salon_id", salonId)
      .gte("created_at", fromIso)
      .lte("created_at", toIso),
  ]);

  const invoices = invoicesRes.data ?? [];
  const revenue = invoices.reduce((a, i) => a + Number(i.total), 0);
  const vat = invoices.reduce((a, i) => a + Number(i.vat), 0);
  const discounts = invoices.reduce((a, i) => a + Number(i.discount), 0);
  const posSales = invoices
    .filter((i) => i.source === "pos")
    .reduce((a, i) => a + Number(i.total), 0);

  let collected = 0;
  let refunded = 0;
  const methodMap = new Map<string, number>();
  for (const p of paymentsRes.data ?? []) {
    const amt = Number(p.amount);
    if (p.is_refund) refunded += amt;
    else {
      collected += amt;
      methodMap.set(p.method, (methodMap.get(p.method) ?? 0) + amt);
    }
  }

  const expenseMap = new Map<string, number>();
  let expenses = 0;
  for (const e of expensesRes.data ?? []) {
    expenses += Number(e.amount);
    expenseMap.set(e.category, (expenseMap.get(e.category) ?? 0) + Number(e.amount));
  }

  const itemMap = new Map<string, { qty: number; total: number }>();
  for (const it of itemsRes.data ?? []) {
    const prev = itemMap.get(it.name) ?? { qty: 0, total: 0 };
    itemMap.set(it.name, { qty: prev.qty + Number(it.qty), total: prev.total + Number(it.total) });
  }

  return {
    revenue,
    vat,
    discounts,
    collected,
    refunded,
    expenses,
    net: collected - refunded - expenses,
    invoiceCount: invoices.length,
    bookingCount: bookingsRes.count ?? 0,
    byMethod: [...methodMap.entries()]
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount),
    byExpenseCategory: [...expenseMap.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    topItems: [...itemMap.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
    posSales,
    bookingSales: revenue - posSales,
  };
}

/* ------------------------------- subscription ------------------------------ */

export interface SubscriptionInfo {
  salon: {
    id: string;
    name: string;
    plan: string;
    subscription_status: string;
    trial_ends_at: string | null;
    subscription_ends_at: string | null;
    is_suspended: boolean;
    currency: string;
  };
  plan: {
    code: string;
    name: string;
    price_monthly: number;
    max_branches: number;
    max_staff: number;
    max_services: number;
    max_customers: number;
    features: string[];
    enabled_modules: string[];
  } | null;
  plans: {
    code: string;
    name: string;
    price_monthly: number;
    max_branches: number;
    max_staff: number;
    max_services: number;
    max_customers: number;
    features: string[];
  }[];
  usage: { branches: number; staff: number; services: number; customers: number };
}

export async function loadSubscription(salonId: string): Promise<SubscriptionInfo> {
  const [salonRes, plansRes, b, st, sv, cu] = await Promise.all([
    supabase
      .from("salons")
      .select(
        "id, name, plan, subscription_status, trial_ends_at, subscription_ends_at, is_suspended, currency",
      )
      .eq("id", salonId)
      .maybeSingle(),
    supabase
      .from("platform_plans")
      .select(
        "code, name, price_monthly, max_branches, max_staff, max_services, max_customers, features, enabled_modules, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("branches").select("id", { count: "exact", head: true }).eq("salon_id", salonId),
    supabase.from("staff").select("id", { count: "exact", head: true }).eq("salon_id", salonId),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("salon_id", salonId),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("salon_id", salonId),
  ]);

  const plans = (plansRes.data ?? []) as SubscriptionInfo["plans"];
  const salon = salonRes.data as SubscriptionInfo["salon"];
  const plan =
    ((plansRes.data ?? []) as SubscriptionInfo["plan"][]).find((p) => p?.code === salon?.plan) ??
    null;

  return {
    salon,
    plan,
    plans,
    usage: {
      branches: b.count ?? 0,
      staff: st.count ?? 0,
      services: sv.count ?? 0,
      customers: cu.count ?? 0,
    },
  };
}

/* -------------------------------- audit log ------------------------------- */

export interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
  after: unknown;
  before?: unknown;
  user_id?: string | null;
}

export interface AuditFilter {
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
  limit?: number;
}

/** Full audit trail with before/after snapshots, filterable by action, table and date. */
export async function listAuditTrail(salonId: string, f: AuditFilter = {}): Promise<AuditEntry[]> {
  let q = supabase
    .from("audit_log")
    .select("id, action, entity, entity_id, created_at, before, after, user_id")
    .eq("salon_id", salonId);
  if (f.action) q = q.eq("action", f.action);
  if (f.entity) q = q.eq("entity", f.entity);
  if (f.from) q = q.gte("created_at", `${f.from}T00:00:00`);
  if (f.to) q = q.lte("created_at", `${f.to}T23:59:59`);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(f.limit ?? 500);
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditEntry[];
}

export async function listAudit(salonId: string, limit = 50): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, action, entity, entity_id, created_at, after")
    .eq("salon_id", salonId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as AuditEntry[];
}

/* --------------------------- branch switch trail -------------------------- */

/**
 * Records who switched the dashboard branch scope and when. Written to the
 * shared audit log so owners can trace which branch a user was working in.
 */
export interface BranchSwitchEntry {
  id: string;
  created_at: string;
  userId: string | null;
  userName: string;
  fromBranchId: string | null;
  fromBranchName: string;
  toBranchId: string | null;
  toBranchName: string;
}

export async function logBranchSwitch(input: {
  salonId: string;
  userId: string;
  userName?: string | null;
  fromBranchId: string | null;
  fromBranchName: string | null;
  toBranchId: string | null;
  toBranchName: string | null;
}): Promise<void> {
  const { error } = await supabase.from("audit_log").insert({
    salon_id: input.salonId,
    user_id: input.userId,
    action: "branch_switch",
    entity: "branches",
    entity_id: input.toBranchId,
    // The actor name is stored inline: profiles are readable only by their owner,
    // so the trail must be self-describing for managers reading it later.
    before: { branch_id: input.fromBranchId, branch_name: input.fromBranchName ?? ALL_BRANCHES },
    after: {
      branch_id: input.toBranchId,
      branch_name: input.toBranchName ?? ALL_BRANCHES,
      user_name: input.userName ?? null,
    },
  });
  // A failed trail entry must never block the user from switching branches.
  if (error) console.warn("branch switch not logged:", error.message);
}

const ALL_BRANCHES = "كل الفروع";

/** Branch scope switches (from/to, time, user) for the audit page. */
export async function listBranchSwitches(
  salonId: string,
  f: { from?: string; to?: string; limit?: number } = {},
): Promise<BranchSwitchEntry[]> {
  let q = supabase
    .from("audit_log")
    .select("id, created_at, user_id, before, after")
    .eq("salon_id", salonId)
    .eq("action", "branch_switch");
  if (f.from) q = q.gte("created_at", `${f.from}T00:00:00`);
  if (f.to) q = q.lte("created_at", `${f.to}T23:59:59`);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(f.limit ?? 500);
  if (error) throw new Error(error.message);
  const pick = (v: unknown, k: string): string | null => {
    const o = (v ?? {}) as Record<string, unknown>;
    const val = o[k];
    return typeof val === "string" && val ? val : null;
  };
  return (data ?? []).map((r) => ({
    id: r.id as string,
    created_at: r.created_at as string,
    userId: (r.user_id as string | null) ?? null,
    userName:
      pick(r.after, "user_name") ??
      (r.user_id ? `مستخدم ${(r.user_id as string).slice(0, 8)}` : "غير معروف"),
    fromBranchId: pick(r.before, "branch_id"),
    fromBranchName: pick(r.before, "branch_name") ?? ALL_BRANCHES,
    toBranchId: pick(r.after, "branch_id"),
    toBranchName: pick(r.after, "branch_name") ?? ALL_BRANCHES,
  }));
}
