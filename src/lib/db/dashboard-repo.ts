import { supabase } from "@/integrations/supabase/client";

/**
 * Live operational snapshot for the merchant dashboard: today's bookings,
 * revenue split by payment method, shift/cashier state, staff on duty and
 * the alerts an owner must react to before closing the day.
 */

export interface TodayBooking {
  id: string;
  code: string;
  starts_at: string;
  duration_min: number;
  status: string;
  price: number;
  discount: number;
  customer_name: string | null;
  staff_name: string | null;
  services: string[];
}

export interface LedgerRow {
  id: string;
  at: string;
  kind: "invoice" | "refund" | "expense";
  label: string;
  method: string | null;
  amount: number; // signed
}

export interface StaffToday {
  id: string;
  name: string;
  job_title: string | null;
  checked_in: boolean;
  bookings: number;
  revenue: number;
}

export interface ShiftStatus {
  id: string;
  opened_at: string;
  opening_float: number;
  opened_by_name: string | null;
  branch_name: string | null;
  cash: number;
  card: number;
  cash_expenses: number;
  expected_cash: number;
}

export interface DashboardOverview {
  bookingsToday: TodayBooking[];
  upcoming: TodayBooking[];
  customersToday: number;
  newCustomersToday: number;
  invoiceCount: number;
  revenueToday: number;
  cashToday: number;
  cardToday: number;
  refundsToday: number;
  expensesToday: number;
  netToday: number;
  vatToday: number;
  avgTicket: number;
  activeStaff: StaffToday[];
  topStaff: StaffToday | null;
  topServices: { name: string; count: number; revenue: number }[];
  ledger: LedgerRow[];
  shift: ShiftStatus | null;
  alerts: { tone: "warn" | "bad" | "info"; text: string }[];
}

const num = (v: unknown) => Number(v ?? 0);
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Local calendar day boundaries as ISO strings, so "today" matches the salon's clock. */
function dayBounds(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const day = `${y}-${m}-${d}`;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { day, startIso: start.toISOString(), endIso: end.toISOString() };
}

export async function loadDashboardOverview(
  salonId: string,
  branchId: string | null = null,
): Promise<DashboardOverview> {
  const { day, startIso, endIso } = dayBounds();

  let bookingsQ = supabase
    .from("bookings")
    .select(
      "id, code, starts_at, duration_min, status, price, discount, customer_id, staff_id, booking_date, customers(name), staff(name), booking_services(service_id, price, services(name))",
    )
    .eq("salon_id", salonId)
    .eq("booking_date", day)
    .order("starts_at");
  if (branchId) bookingsQ = bookingsQ.eq("branch_id", branchId);

  const [
    bookingsRes,
    invoicesRes,
    paymentsRes,
    expensesRes,
    shiftsRes,
    staffRes,
    attendanceRes,
    newCustomersRes,
    lowStockRes,
  ] = await Promise.all([
    bookingsQ,
    supabase
      .from("invoices")
      .select("id, number, total, vat, payment_method, created_at, customers(name)")
      .eq("salon_id", salonId)
      .gte("created_at", startIso)
      .lte("created_at", endIso)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoice_payments")
      .select("id, amount, method, is_refund, created_at")
      .eq("salon_id", salonId)
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    supabase
      .from("expenses")
      .select("id, category, amount, method, created_at, vendor")
      .eq("salon_id", salonId)
      .eq("spent_on", day),
    supabase
      .from("cash_shifts")
      .select("id, opened_at, opening_float, status, branch_id, branches(name)")
      .eq("salon_id", salonId)
      .eq("status", "open")
      .order("opened_at", { ascending: false })
      .limit(1),
    supabase
      .from("staff")
      .select("id, name, job_title, active")
      .eq("salon_id", salonId)
      .eq("active", true)
      .order("name"),
    supabase
      .from("attendance")
      .select("staff_id, check_in, check_out")
      .eq("salon_id", salonId)
      .eq("work_date", day),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("salon_id", salonId)
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    supabase
      .from("inventory_items")
      .select("id, name, stock, min_stock")
      .eq("salon_id", salonId)
      .limit(200),
  ]);

  const firstError =
    bookingsRes.error ||
    invoicesRes.error ||
    paymentsRes.error ||
    expensesRes.error ||
    shiftsRes.error ||
    staffRes.error ||
    attendanceRes.error;
  if (firstError) throw new Error(firstError.message);

  type RawBooking = {
    id: string;
    code: string;
    starts_at: string;
    duration_min: number;
    status: string;
    price: number | string;
    discount: number | string;
    customer_id: string | null;
    staff_id: string | null;
    customers: { name: string } | null;
    staff: { name: string } | null;
    booking_services: { service_id: string; price: number | string; services: { name: string } | null }[] | null;
  };

  const raw = (bookingsRes.data ?? []) as unknown as RawBooking[];
  const bookingsToday: TodayBooking[] = raw.map((b) => ({
    id: b.id,
    code: b.code,
    starts_at: b.starts_at,
    duration_min: b.duration_min,
    status: b.status,
    price: num(b.price),
    discount: num(b.discount),
    customer_name: b.customers?.name ?? null,
    staff_name: b.staff?.name ?? null,
    services: (b.booking_services ?? []).map((s) => s.services?.name ?? "خدمة"),
  }));

  const nowIso = new Date().toISOString();
  const upcoming = bookingsToday.filter(
    (b) => ["new", "confirmed", "checked_in", "in_progress"].includes(b.status) && b.starts_at >= nowIso,
  );

  const invoices = (invoicesRes.data ?? []) as unknown as {
    id: string;
    number: string;
    total: number | string;
    vat: number | string;
    payment_method: string | null;
    created_at: string;
    customers: { name: string } | null;
  }[];

  let cashToday = 0;
  let cardToday = 0;
  let refundsToday = 0;
  for (const p of paymentsRes.data ?? []) {
    const amount = num(p.amount);
    if (p.is_refund) {
      refundsToday += amount;
      continue;
    }
    if (p.method === "cash") cashToday += amount;
    else cardToday += amount;
  }

  const expenses = (expensesRes.data ?? []) as unknown as {
    id: string;
    category: string;
    amount: number | string;
    method: string;
    created_at: string;
    vendor: string | null;
  }[];
  const expensesToday = expenses.reduce((a, e) => a + num(e.amount), 0);

  const revenueToday = invoices.reduce((a, i) => a + num(i.total), 0);
  const vatToday = invoices.reduce((a, i) => a + num(i.vat), 0);

  // Per-employee performance for the day, from completed bookings.
  const staffStats = new Map<string, { bookings: number; revenue: number }>();
  for (const b of raw) {
    if (!b.staff_id) continue;
    const cur = staffStats.get(b.staff_id) ?? { bookings: 0, revenue: 0 };
    cur.bookings += 1;
    cur.revenue += num(b.price) - num(b.discount);
    staffStats.set(b.staff_id, cur);
  }

  const checkedIn = new Set(
    (attendanceRes.data ?? []).filter((a) => a.check_in && !a.check_out).map((a) => a.staff_id),
  );

  const activeStaff: StaffToday[] = (staffRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    job_title: s.job_title ?? null,
    checked_in: checkedIn.has(s.id),
    bookings: staffStats.get(s.id)?.bookings ?? 0,
    revenue: r2(staffStats.get(s.id)?.revenue ?? 0),
  }));
  const topStaff =
    [...activeStaff].sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)[0] ?? null;

  // Most requested services today.
  const svcMap = new Map<string, { count: number; revenue: number }>();
  for (const b of raw) {
    for (const line of b.booking_services ?? []) {
      const name = line.services?.name ?? "خدمة";
      const cur = svcMap.get(name) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += num(line.price);
      svcMap.set(name, cur);
    }
  }
  const topServices = [...svcMap.entries()]
    .map(([name, v]) => ({ name, count: v.count, revenue: r2(v.revenue) }))
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
    .slice(0, 5);

  // Unified ledger feed for the day.
  const ledger: LedgerRow[] = [
    ...invoices.map((i) => ({
      id: i.id,
      at: i.created_at,
      kind: "invoice" as const,
      label: `فاتورة ${i.number}${i.customers?.name ? ` — ${i.customers.name}` : ""}`,
      method: i.payment_method,
      amount: num(i.total),
    })),
    ...expenses.map((e) => ({
      id: e.id,
      at: e.created_at,
      kind: "expense" as const,
      label: `مصروف${e.vendor ? ` — ${e.vendor}` : ""}`,
      method: e.method,
      amount: -num(e.amount),
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);

  // Open cashier session with its live cash position.
  const openShift = (shiftsRes.data ?? [])[0] as unknown as
    | { id: string; opened_at: string; opening_float: number | string; branches: { name: string } | null }
    | undefined;

  let shift: ShiftStatus | null = null;
  if (openShift) {
    const [shiftPayments, shiftExpenses] = await Promise.all([
      supabase.from("invoice_payments").select("amount, method, is_refund").eq("shift_id", openShift.id),
      supabase.from("expenses").select("amount, method").eq("shift_id", openShift.id),
    ]);
    let cash = 0;
    let card = 0;
    for (const p of shiftPayments.data ?? []) {
      const signed = p.is_refund ? -num(p.amount) : num(p.amount);
      if (p.method === "cash") cash += signed;
      else card += signed;
    }
    const cashExpenses = (shiftExpenses.data ?? [])
      .filter((e) => e.method === "cash")
      .reduce((a, e) => a + num(e.amount), 0);
    const openingFloat = num(openShift.opening_float);
    shift = {
      id: openShift.id,
      opened_at: openShift.opened_at,
      opening_float: openingFloat,
      opened_by_name: null,
      branch_name: openShift.branches?.name ?? null,
      cash: r2(cash),
      card: r2(card),
      cash_expenses: r2(cashExpenses),
      expected_cash: r2(openingFloat + cash - cashExpenses),
    };
  }

  const alerts: DashboardOverview["alerts"] = [];
  if (!shift) alerts.push({ tone: "warn", text: "لا توجد وردية كاشير مفتوحة — افتح الوردية قبل تسجيل أي مبيعات." });
  const lowStock = (lowStockRes.data ?? []).filter((i) => num(i.stock) <= num(i.min_stock));
  if (lowStock.length)
    alerts.push({
      tone: "bad",
      text: `${lowStock.length} منتج تحت الحد الأدنى للمخزون (${lowStock
        .slice(0, 3)
        .map((i) => i.name)
        .join("، ")}${lowStock.length > 3 ? "…" : ""}).`,
    });
  const lateBookings = bookingsToday.filter(
    (b) => ["new", "confirmed"].includes(b.status) && b.starts_at < nowIso,
  );
  if (lateBookings.length)
    alerts.push({ tone: "warn", text: `${lateBookings.length} حجز تجاوز وقته دون بدء الخدمة.` });
  if (refundsToday > 0)
    alerts.push({ tone: "info", text: `تم تسجيل مبالغ مرتجعة اليوم بقيمة ${r2(refundsToday)} ريال.` });
  if (!alerts.length) alerts.push({ tone: "info", text: "لا توجد تنبيهات — يوم تشغيلي سليم." });

  const customersToday = new Set(raw.map((b) => b.customer_id).filter(Boolean)).size;

  return {
    bookingsToday,
    upcoming,
    customersToday,
    newCustomersToday: newCustomersRes.count ?? 0,
    invoiceCount: invoices.length,
    revenueToday: r2(revenueToday),
    cashToday: r2(cashToday),
    cardToday: r2(cardToday),
    refundsToday: r2(refundsToday),
    expensesToday: r2(expensesToday),
    netToday: r2(revenueToday - refundsToday - expensesToday),
    vatToday: r2(vatToday),
    avgTicket: invoices.length ? r2(revenueToday / invoices.length) : 0,
    activeStaff,
    topStaff,
    topServices,
    ledger,
    shift,
    alerts,
  };
}
