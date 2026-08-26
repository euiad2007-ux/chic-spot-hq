import { supabase } from "@/integrations/supabase/client";

export interface PlatformSalonOverview {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  plan: string | null;
  plan_name: string | null;
  plan_price: number | null;
  subscription_status: string;
  trial_ends_at: string | null;
  subscription_ends_at: string | null;
  is_suspended: boolean;
  admin_notes: string | null;
  custom_domain: string | null;
  domain_status: string;
  created_at: string;
  owner_email: string | null;
  owner_name: string | null;
  branches_count: number;
  staff_count: number;
  customers_count: number;
  services_count: number;
  bookings_count: number;
  invoices_count: number;
  invoices_month: number;
  gross_sales: number;
  sub_billed: number;
  sub_paid: number;
  sub_due: number;
  open_tickets: number;
}

export interface SubscriptionInvoiceRow {
  id: string;
  salon_id: string;
  plan_code: string | null;
  period: string;
  period_start: string;
  period_end: string;
  amount: number;
  vat: number;
  total: number;
  paid: number;
  status: string;
  due_date: string | null;
  note: string | null;
  created_at: string;
}

export interface SubscriptionPaymentRow {
  id: string;
  salon_id: string;
  invoice_id: string | null;
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  paid_at: string;
}

export interface SupportTicketRow {
  id: string;
  salon_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  last_reply_at: string | null;
  created_at: string;
}

export interface SupportMessageRow {
  id: string;
  ticket_id: string;
  salon_id: string;
  author_name: string | null;
  from_platform: boolean;
  body: string;
  created_at: string;
}

export const SUB_STATUS_LABEL: Record<string, string> = {
  unpaid: "غير مدفوعة",
  partial: "مدفوعة جزئيًا",
  paid: "مدفوعة",
  void: "ملغاة",
};

export const TICKET_STATUS_LABEL: Record<string, string> = {
  open: "مفتوحة",
  pending: "بانتظار المتجر",
  closed: "مغلقة",
};

export const TICKET_PRIORITY_LABEL: Record<string, string> = {
  low: "منخفضة",
  normal: "عادية",
  high: "عالية",
  urgent: "عاجلة",
};

export async function listSalonsOverview(): Promise<PlatformSalonOverview[]> {
  const { data, error } = await supabase.rpc("platform_salons_overview");
  if (error) throw error;
  return (data ?? []) as unknown as PlatformSalonOverview[];
}

export async function listSubscriptionInvoices(salonId?: string | null) {
  let q = supabase
    .from("subscription_invoices")
    .select(
      "id, salon_id, plan_code, period, period_start, period_end, amount, vat, total, paid, status, due_date, note, created_at",
    )
    .order("period_start", { ascending: false })
    .limit(500);
  if (salonId) q = q.eq("salon_id", salonId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SubscriptionInvoiceRow[];
}

export async function listSubscriptionPayments(salonId?: string | null) {
  let q = supabase
    .from("subscription_payments")
    .select("id, salon_id, invoice_id, amount, method, reference, note, paid_at")
    .order("paid_at", { ascending: false })
    .limit(500);
  if (salonId) q = q.eq("salon_id", salonId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SubscriptionPaymentRow[];
}

export async function createSubscriptionInvoice(input: {
  salonId: string;
  planCode: string | null;
  periodStart: string;
  months: number;
  amount: number;
  vatRate: number;
  dueDate: string | null;
  note: string | null;
}) {
  const start = new Date(input.periodStart);
  const end = new Date(start);
  end.setMonth(end.getMonth() + Math.max(1, input.months));
  end.setDate(end.getDate() - 1);
  const amount = Number(input.amount) || 0;
  const vat = Math.round(amount * (input.vatRate / 100) * 100) / 100;
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("subscription_invoices").insert({
    salon_id: input.salonId,
    plan_code: input.planCode,
    period: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    period_start: input.periodStart,
    period_end: end.toISOString().slice(0, 10),
    amount,
    vat,
    total: amount + vat,
    status: "unpaid",
    due_date: input.dueDate,
    note: input.note,
    created_by: auth.user?.id ?? null,
  });
  if (error) throw error;
}

export async function recordSubscriptionPayment(input: {
  salonId: string;
  invoiceId: string;
  amount: number;
  method: string;
  reference: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("subscription_payments").insert({
    salon_id: input.salonId,
    invoice_id: input.invoiceId,
    amount: Number(input.amount) || 0,
    method: input.method,
    reference: input.reference,
    created_by: auth.user?.id ?? null,
  });
  if (error) throw error;
}

export async function setSubscriptionInvoiceStatus(id: string, status: string) {
  const { error } = await supabase.from("subscription_invoices").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteSubscriptionInvoice(id: string) {
  const { error } = await supabase.from("subscription_invoices").delete().eq("id", id);
  if (error) throw error;
}

export async function listSupportTickets(salonId?: string | null) {
  let q = supabase
    .from("support_tickets")
    .select("id, salon_id, subject, category, priority, status, last_reply_at, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (salonId) q = q.eq("salon_id", salonId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SupportTicketRow[];
}

export async function listSupportMessages(ticketId: string) {
  const { data, error } = await supabase
    .from("support_messages")
    .select("id, ticket_id, salon_id, author_name, from_platform, body, created_at")
    .eq("ticket_id", ticketId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as SupportMessageRow[];
}

export async function createSupportTicket(input: {
  salonId: string;
  subject: string;
  category: string;
  priority: string;
  body: string;
  fromPlatform: boolean;
  authorName: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id ?? null;
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      salon_id: input.salonId,
      subject: input.subject,
      category: input.category,
      priority: input.priority,
      status: "open",
      created_by: userId,
      last_reply_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  await addSupportMessage({
    ticketId: ticket.id,
    salonId: input.salonId,
    body: input.body,
    fromPlatform: input.fromPlatform,
    authorName: input.authorName,
  });
  return ticket.id;
}

export async function addSupportMessage(input: {
  ticketId: string;
  salonId: string;
  body: string;
  fromPlatform: boolean;
  authorName: string;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase.from("support_messages").insert({
    ticket_id: input.ticketId,
    salon_id: input.salonId,
    body: input.body,
    from_platform: input.fromPlatform,
    author_name: input.authorName,
    author_id: auth.user?.id ?? null,
  });
  if (error) throw error;
  await supabase
    .from("support_tickets")
    .update({
      last_reply_at: new Date().toISOString(),
      status: input.fromPlatform ? "pending" : "open",
    })
    .eq("id", input.ticketId);
}

export async function setTicketStatus(id: string, status: string) {
  const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
  if (error) throw error;
}

/* --------------------- owner-only cross-tenant reports --------------------- */

export interface PlatformCustomerRow {
  id: string;
  salon_id: string;
  salon_name: string;
  name: string;
  phone: string;
  email: string | null;
  visits: number;
  total_spent: number;
  wallet_balance: number;
  loyalty_points: number;
  created_at: string;
  salons_count: number;
  invoices_count: number;
  last_visit: string | null;
}

export interface SalonStorageRow {
  salon_id: string;
  salon_name: string;
  rows_total: number;
  est_bytes: number;
  tables: Record<string, number>;
}

export interface TableSizeRow {
  table_name: string;
  row_estimate: number;
  total_bytes: number;
}

export interface PlatformNotificationRow {
  id: string;
  salon_id: string | null;
  kind: "subscription_expiring" | "subscription_expired";
  title: string;
  body: string;
  due_at: string | null;
  read_at: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface PlatformAuditRow {
  id: string;
  salon_id: string | null;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
}

/** Every customer of every salon (platform owner only). */
export async function listPlatformCustomers(): Promise<PlatformCustomerRow[]> {
  const { data, error } = await supabase.rpc("platform_customers_overview");
  if (error) throw error;
  return (data ?? []) as unknown as PlatformCustomerRow[];
}

/** Data volume held by each salon (platform owner only). */
export async function listSalonStorage(): Promise<SalonStorageRow[]> {
  const { data, error } = await supabase.rpc("platform_storage_overview");
  if (error) throw error;
  return (data ?? []) as unknown as SalonStorageRow[];
}

/** Physical size of every table in the platform database (owner only). */
export async function listTableSizes(): Promise<TableSizeRow[]> {
  const { data, error } = await supabase.rpc("platform_table_sizes");
  if (error) throw error;
  return (data ?? []) as unknown as TableSizeRow[];
}

/** Subscription alerts visible only to the platform owner through RLS. */
export async function listPlatformNotifications(): Promise<PlatformNotificationRow[]> {
  const { data, error } = await supabase
    .from("platform_notifications")
    .select("id, salon_id, kind, title, body, due_at, read_at, meta, created_at")
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data ?? []) as PlatformNotificationRow[];
}

export async function markPlatformNotificationRead(id: string, read: boolean): Promise<void> {
  const { error } = await supabase
    .from("platform_notifications")
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

/** Cross-store change history visible only to the platform owner through RLS. */
export async function listPlatformAudit(): Promise<PlatformAuditRow[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, salon_id, user_id, action, entity, entity_id, before, after, created_at")
    .in("entity", [
      "salons",
      "platform_plans",
      "subscription_invoices",
      "subscription_payments",
      "platform_settings",
    ])
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as PlatformAuditRow[];
}
