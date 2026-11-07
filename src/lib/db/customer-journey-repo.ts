import { supabase } from "@/integrations/supabase/client";
import { initDataContext, requireSalonId } from "@/lib/db/context";

export interface ShiftCash {
  shiftId: string;
  openedAt: string;
  closedAt: string | null;
  status: string;
  cashierName: string | null;
  /** Cash this customer paid inside the shift. */
  customerCash: number;
  /** Cash expected in the drawer for the whole shift (float + cash sales − cash expenses). */
  shiftCashRemaining: number;
}

export interface CustomerSummaryRow {
  id: string;
  name: string;
  phone: string;
  visits: number;
  totalSpent: number;
  walletBalance: number;
  loyaltyPoints: number;
  bookings: number;
  invoices: number;
  paid: number;
  cashPaid: number;
  lastBooking: string | null;
  shifts: ShiftCash[];
}

export interface JourneyBooking {
  id: string;
  code: string | null;
  startsAt: string;
  status: string;
  payStatus: string;
  price: number;
  staffName: string | null;
  services: string[];
}

export interface JourneyPayment {
  id: string;
  amount: number;
  method: string;
  isRefund: boolean;
  createdAt: string;
  shiftId: string | null;
}

export interface JourneyInvoice {
  id: string;
  number: string | null;
  total: number;
  paid: number;
  status: string;
  createdAt: string;
  method: string | null;
  shiftId: string | null;
  payments: JourneyPayment[];
}

export interface CustomerJourney {
  customer: {
    id: string;
    name: string;
    phone: string;
    email: string | null;
    visits: number;
    totalSpent: number;
    walletBalance: number;
    loyaltyPoints: number;
    createdAt: string;
  };
  bookings: JourneyBooking[];
  invoices: JourneyInvoice[];
  shifts: ShiftCash[];
}

type ShiftRow = {
  id: string;
  opened_at: string;
  closed_at: string | null;
  status: string;
  cashier_name: string | null;
  opening_float: number | null;
  cash_sales: number | null;
  cash_expenses: number | null;
  expected_cash: number | null;
};

const n = (v: unknown) => Number(v ?? 0) || 0;

/** Drawer cash for a shift: stored expected value when closed, else live estimate. */
export function shiftRemaining(s: ShiftRow): number {
  if (s.status === "closed" && s.expected_cash != null) return n(s.expected_cash);
  return n(s.opening_float) + n(s.cash_sales) - n(s.cash_expenses);
}

/** Groups a customer's cash payments by shift. */
export function groupCashByShift(
  payments: { amount: number; method: string; is_refund: boolean; shift_id: string | null }[],
  shifts: Map<string, ShiftRow>,
): ShiftCash[] {
  const per = new Map<string, number>();
  for (const p of payments) {
    if (!p.shift_id || p.method !== "cash") continue;
    per.set(p.shift_id, (per.get(p.shift_id) ?? 0) + (p.is_refund ? -n(p.amount) : n(p.amount)));
  }
  return [...per.entries()]
    .map(([id, cash]) => {
      const s = shifts.get(id);
      return {
        shiftId: id,
        openedAt: s?.opened_at ?? "",
        closedAt: s?.closed_at ?? null,
        status: s?.status ?? "—",
        cashierName: s?.cashier_name ?? null,
        customerCash: cash,
        shiftCashRemaining: s ? shiftRemaining(s) : 0,
      };
    })
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt));
}

async function loadShifts(salonId: string, ids: string[]) {
  const map = new Map<string, ShiftRow>();
  const unique = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 200) {
    const { data, error } = await supabase
      .from("cash_shifts")
      .select("id, opened_at, closed_at, status, cashier_name, opening_float, cash_sales, cash_expenses, expected_cash")
      .eq("salon_id", salonId)
      .in("id", unique.slice(i, i + 200));
    if (error) throw error;
    (data ?? []).forEach((s) => map.set(s.id, s as ShiftRow));
  }
  return map;
}

export async function listCustomerSummaries(): Promise<CustomerSummaryRow[]> {
  await initDataContext();
  const salonId = requireSalonId();
  const [cust, books, invs, pays] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, visits, total_spent, wallet_balance, loyalty_points")
      .eq("salon_id", salonId)
      .order("total_spent", { ascending: false })
      .limit(2000),
    supabase.from("bookings").select("customer_id, starts_at").eq("salon_id", salonId).limit(10000),
    supabase.from("invoices").select("id, customer_id").eq("salon_id", salonId).limit(10000),
    supabase
      .from("invoice_payments")
      .select("invoice_id, amount, method, is_refund, shift_id")
      .eq("salon_id", salonId)
      .limit(20000),
  ]);
  for (const r of [cust, books, invs, pays]) if (r.error) throw r.error;

  const invCustomer = new Map<string, string>();
  const invCount = new Map<string, number>();
  for (const i of invs.data ?? []) {
    if (!i.customer_id) continue;
    invCustomer.set(i.id, i.customer_id);
    invCount.set(i.customer_id, (invCount.get(i.customer_id) ?? 0) + 1);
  }
  const bookCount = new Map<string, number>();
  const lastBook = new Map<string, string>();
  for (const b of books.data ?? []) {
    if (!b.customer_id) continue;
    bookCount.set(b.customer_id, (bookCount.get(b.customer_id) ?? 0) + 1);
    if (!lastBook.has(b.customer_id) || b.starts_at > lastBook.get(b.customer_id)!)
      lastBook.set(b.customer_id, b.starts_at);
  }
  const payByCustomer = new Map<string, typeof pays.data>();
  for (const p of pays.data ?? []) {
    const c = invCustomer.get(p.invoice_id);
    if (!c) continue;
    const list = payByCustomer.get(c) ?? [];
    list.push(p);
    payByCustomer.set(c, list);
  }
  const shifts = await loadShifts(
    salonId,
    (pays.data ?? []).map((p) => p.shift_id as string),
  );

  return (cust.data ?? []).map((c) => {
    const ps = payByCustomer.get(c.id) ?? [];
    const signed = (p: { amount: number; is_refund: boolean }) => (p.is_refund ? -n(p.amount) : n(p.amount));
    return {
      id: c.id,
      name: c.name,
      phone: c.phone ?? "",
      visits: n(c.visits),
      totalSpent: n(c.total_spent),
      walletBalance: n(c.wallet_balance),
      loyaltyPoints: n(c.loyalty_points),
      bookings: bookCount.get(c.id) ?? 0,
      invoices: invCount.get(c.id) ?? 0,
      paid: ps.reduce((s, p) => s + signed(p), 0),
      cashPaid: ps.filter((p) => p.method === "cash").reduce((s, p) => s + signed(p), 0),
      lastBooking: lastBook.get(c.id) ?? null,
      shifts: groupCashByShift(ps, shifts),
    };
  });
}

export async function loadCustomerJourney(customerId: string): Promise<CustomerJourney | null> {
  await initDataContext();
  const salonId = requireSalonId();
  const { data: c, error } = await supabase
    .from("customers")
    .select("id, name, phone, email, visits, total_spent, wallet_balance, loyalty_points, created_at")
    .eq("salon_id", salonId)
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw error;
  if (!c) return null;

  const [books, invs] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, code, starts_at, status, pay_status, price, staff:staff_id(name), booking_services(services(name))")
      .eq("salon_id", salonId)
      .eq("customer_id", customerId)
      .order("starts_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, number, total, paid, status, created_at, payment_method, shift_id")
      .eq("salon_id", salonId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
  ]);
  if (books.error) throw books.error;
  if (invs.error) throw invs.error;

  const invIds = (invs.data ?? []).map((i) => i.id);
  const pays = invIds.length
    ? await supabase
        .from("invoice_payments")
        .select("id, invoice_id, amount, method, is_refund, created_at, shift_id")
        .eq("salon_id", salonId)
        .in("invoice_id", invIds)
    : { data: [], error: null };
  if (pays.error) throw pays.error;

  const shifts = await loadShifts(salonId, [
    ...(pays.data ?? []).map((p) => p.shift_id as string),
    ...(invs.data ?? []).map((i) => i.shift_id as string),
  ]);

  return {
    customer: {
      id: c.id,
      name: c.name,
      phone: c.phone ?? "",
      email: c.email,
      visits: n(c.visits),
      totalSpent: n(c.total_spent),
      walletBalance: n(c.wallet_balance),
      loyaltyPoints: n(c.loyalty_points),
      createdAt: c.created_at,
    },
    bookings: (books.data ?? []).map((b) => {
      const row = b as unknown as {
        staff: { name: string } | null;
        booking_services: { services: { name: string } | null }[] | null;
      };
      return {
        id: b.id,
        code: b.code,
        startsAt: b.starts_at,
        status: b.status,
        payStatus: b.pay_status,
        price: n(b.price),
        staffName: row.staff?.name ?? null,
        services: (row.booking_services ?? []).map((s) => s.services?.name ?? "").filter(Boolean),
      };
    }),
    invoices: (invs.data ?? []).map((i) => ({
      id: i.id,
      number: i.number,
      total: n(i.total),
      paid: n(i.paid),
      status: i.status,
      createdAt: i.created_at,
      method: i.payment_method,
      shiftId: i.shift_id,
      payments: (pays.data ?? [])
        .filter((p) => p.invoice_id === i.id)
        .map((p) => ({
          id: p.id,
          amount: n(p.amount),
          method: p.method,
          isRefund: !!p.is_refund,
          createdAt: p.created_at,
          shiftId: p.shift_id,
        })),
    })),
    shifts: groupCashByShift(pays.data ?? [], shifts),
  };
}
