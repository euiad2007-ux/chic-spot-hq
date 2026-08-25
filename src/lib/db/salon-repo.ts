import { supabase } from "@/integrations/supabase/client";
import { getDataContext } from "@/lib/db/context";
import { diffSync, insertNew, replaceChildren, enqueue, debounce, num, str } from "@/lib/db/sync";
import type {
  SalonState, Service, Staff, Customer, Booking, Invoice, InventoryItem,
  BookingCounters, BookingStatus, PayStatus, WalletLog, LoyaltyLog,
} from "@/lib/salon-store";

type Row = Record<string, unknown> & { id: string };

interface Snapshot {
  services: Row[];
  inventory: Row[];
  staff: Row[];
  customers: Row[];
  bookings: Row[];
  invoices: Row[];
  wallet: Row[];
  loyalty: Row[];
  leaves: Row[];
  serviceMaterials: Map<string, string>;
  serviceStaff: Map<string, string>;
  bookingServices: Map<string, string>;
}

const emptySnapshot = (): Snapshot => ({
  services: [], inventory: [], staff: [], customers: [], bookings: [], invoices: [],
  wallet: [], loyalty: [], leaves: [],
  serviceMaterials: new Map(), serviceStaff: new Map(), bookingServices: new Map(),
});

let snap: Snapshot = emptySnapshot();
let ready = false;

const sel = <T,>(rows: T[] | null) => rows ?? [];

/** Reads the whole salon workspace from the database. */
export async function loadSalonState(salonId: string): Promise<SalonState> {
  const [
    servicesRes, materialsRes, serviceStaffRes, staffRes, leavesRes,
    customersRes, walletRes, loyaltyRes, bookingsRes, bookingServicesRes,
    invoicesRes, inventoryRes,
  ] = await Promise.all([
    supabase.from("services").select("*").eq("salon_id", salonId),
    supabase.from("service_materials").select("*").eq("salon_id", salonId),
    supabase.from("service_staff").select("*").eq("salon_id", salonId),
    supabase.from("staff").select("*").eq("salon_id", salonId),
    supabase.from("leaves").select("*").eq("salon_id", salonId),
    supabase.from("customers").select("*").eq("salon_id", salonId),
    supabase.from("wallet_transactions").select("*").eq("salon_id", salonId).order("created_at", { ascending: false }),
    supabase.from("loyalty_transactions").select("*").eq("salon_id", salonId).order("created_at", { ascending: false }),
    supabase.from("bookings").select("*").eq("salon_id", salonId).order("starts_at", { ascending: true }),
    supabase.from("booking_services").select("*").eq("salon_id", salonId).order("sort_order", { ascending: true }),
    supabase.from("invoices").select("*").eq("salon_id", salonId).order("created_at", { ascending: true }),
    supabase.from("inventory_items").select("*").eq("salon_id", salonId),
  ]);

  const materials = sel(materialsRes.data);
  const serviceStaff = sel(serviceStaffRes.data);
  const leaves = sel(leavesRes.data);
  const wallet = sel(walletRes.data);
  const loyalty = sel(loyaltyRes.data);
  const bookingServices = sel(bookingServicesRes.data);

  const services: Service[] = sel(servicesRes.data).map((r) => ({
    id: r.id,
    name: str(r.name),
    category: str(r.category),
    price: num(r.price),
    durationMin: num(r.duration_min, 30),
    prepMin: num(r.prep_min),
    cleanupMin: num(r.cleanup_min),
    branchId: (r.branch_id as string | null) ?? null,
    active: r.active !== false,

    materials: materials
      .filter((m) => m.service_id === r.id)
      .map((m) => ({ itemId: m.item_id, qty: num(m.qty) })),
  }));

  const inventory: InventoryItem[] = sel(inventoryRes.data).map((r) => ({
    id: r.id,
    name: str(r.name),
    unit: str(r.unit, "قطعة"),
    stock: num(r.stock),
    minStock: num(r.min_stock),
    costPerUnit: num(r.cost_per_unit),
    measure: str(r.measure, "count"),
    sizePerUnit: num(r.size_per_unit, 1),
  }));

  // Customers have no access to employee records (salary/ID/contact are private),
  // so fall back to the safe directory RPC that only exposes name/title/branch.
  let staffRows: Record<string, unknown>[] = (staffRes.data ?? []) as unknown as Record<string, unknown>[];
  if (staffRows.length === 0) {
    const dir = await supabase.rpc("salon_staff_directory", { _salon: salonId });
    staffRows = (dir.data ?? []) as unknown as Record<string, unknown>[];
  }

  const staff: Staff[] = staffRows.map((row) => {
    const r = row as any;

    const meta = (r.meta ?? {}) as { notes?: Staff["notes"]; pointsLog?: Staff["pointsLog"] };
    return {
      id: r.id,
      name: str(r.name),
      role: str(r.role_label ?? r.job_title),
      phone: str(r.phone),
      email: r.email ?? undefined,
      hireDate: r.hire_date ?? undefined,
      commissionPct: num(r.commission_pct),
      salary: num(r.base_salary),
      allowances: (Array.isArray(r.allowances) ? r.allowances : []) as unknown as Staff["allowances"],
      notes: meta.notes ?? [],
      points: num(r.points),
      pointsLog: meta.pointsLog ?? [],
      services: serviceStaff.filter((x) => x.staff_id === r.id).map((x) => x.service_id),
      branchId: (r.branch_id as string | null) ?? null,
      active: r.active !== false,

      gender: (r.gender ?? undefined) as Staff["gender"],
      nationalId: r.national_id ?? undefined,
      birthDate: r.birth_date ?? undefined,
      nationality: r.nationality ?? undefined,
      address: r.address ?? undefined,
      emergencyName: r.emergency_name ?? undefined,
      emergencyPhone: r.emergency_phone ?? undefined,
      jobTitle: r.job_title ?? undefined,
      contractType: (r.contract_type ?? undefined) as Staff["contractType"],
      annualLeaveDays: num(r.annual_leave_days, 21),
      leaves: leaves
        .filter((l) => l.staff_id === r.id)
        .map((l) => ({
          id: l.id, from: l.from_date, to: l.to_date, days: num(l.days),
          reason: l.reason ?? undefined, at: l.created_at,
        })),
    };
  });

  const customers: Customer[] = sel(customersRes.data).map((r) => ({
    id: r.id,
    name: str(r.name),
    phone: str(r.phone),
    gender: (r.gender ?? undefined) as Customer["gender"],
    notes: r.notes ?? undefined,
    visits: num(r.visits),
    totalSpent: num(r.total_spent),
    createdAt: str(r.created_at, new Date().toISOString()),
    birthDate: r.birth_date ?? undefined,
    address: r.address ?? undefined,
    email: r.email ?? undefined,
    walletId: r.wallet_id ?? undefined,
    walletBalance: num(r.wallet_balance),
    walletLog: wallet
      .filter((w) => w.customer_id === r.id)
      .map<WalletLog>((w) => ({ id: w.id, delta: num(w.amount), reason: str(w.reason), at: str(w.created_at) })),
    loyaltyPoints: num(r.loyalty_points),
    loyaltyLog: loyalty
      .filter((l) => l.customer_id === r.id)
      .map<LoyaltyLog>((l) => ({ id: l.id, delta: num(l.points), reason: str(l.reason), at: str(l.created_at) })),
    referralCode: r.referral_code ?? undefined,
    referredBy: r.referred_by ?? undefined,
    referralEarnings: 0,
  }));

  const bookings: Booking[] = sel(bookingsRes.data).map((r) => {
    const links = bookingServices.filter((b) => b.booking_id === r.id);
    const serviceQueue: Record<string, number> = {};
    for (const l of links) if (l.queue_no != null) serviceQueue[l.service_id] = num(l.queue_no);
    return {
      id: r.id,
      code: str(r.code),
      globalNo: num(r.global_no),
      branchNo: num(r.branch_no),
      dailyNo: num(r.daily_no),
      bookingDate: str(r.booking_date),
      serviceQueue,
      customerId: str(r.customer_id),
      staffId: str(r.staff_id),
      serviceIds: links.map((l) => l.service_id as string),
      branchId: (r.branch_id as string | null) ?? null,
      startsAt: str(r.starts_at),
      durationMin: num(r.duration_min),
      price: num(r.price),
      discount: num(r.discount),
      couponCode: r.coupon_code ?? undefined,
      couponDiscount: num(r.coupon_discount),
      walletUsed: num(r.wallet_used),
      status: str(r.status, "new") as BookingStatus,
      payStatus: (str(r.pay_status, "unpaid") as PayStatus),
      notes: r.notes ?? undefined,
      createdAt: str(r.created_at),
      paymentMethod: (r.payment_method ?? undefined) as Booking["paymentMethod"],
      walletApproved: r.wallet_approved === true,
      holdExpiresAt: r.hold_expires_at ?? undefined,
      stockDeducted: r.stock_deducted === true,
    };
  });

  const invoices: Invoice[] = sel(invoicesRes.data).map((r) => ({
    id: r.id,
    number: str(r.number),
    bookingId: str(r.booking_id),
    customerId: str(r.customer_id),
    subtotal: num(r.subtotal),
    discount: num(r.discount),
    vat: num(r.vat),
    total: num(r.total),
    paid: num(r.paid),
    method: (str(r.payment_method, "cash") as Invoice["method"]),
    createdAt: str(r.created_at),
    branchId: (r.branch_id as string | null) ?? null,
  }));


  const counters: BookingCounters = { global: 0, branch: 0, byDay: {}, byServiceDay: {} };
  for (const b of bookings) {
    counters.global = Math.max(counters.global, b.globalNo);
    counters.branch = Math.max(counters.branch, b.branchNo);
    if (b.bookingDate) {
      counters.byDay[b.bookingDate] = Math.max(counters.byDay[b.bookingDate] ?? 0, b.dailyNo);
      for (const [sid, q] of Object.entries(b.serviceQueue)) {
        const k = `${b.bookingDate}|${sid}`;
        counters.byServiceDay[k] = Math.max(counters.byServiceDay[k] ?? 0, q);
      }
    }
  }

  const state: SalonState = { services, staff, customers, bookings, invoices, inventory, counters };
  snap = buildSnapshot(state, salonId);
  ready = true;
  return state;
}

// ---------- row builders ----------

function buildSnapshot(s: SalonState, salonId: string): Snapshot {
  return {
    services: s.services.map((x) => serviceRow(x, salonId)),
    inventory: s.inventory.map((x) => inventoryRow(x, salonId)),
    staff: s.staff.map((x) => staffRow(x, salonId)),
    customers: s.customers.map((x) => customerRow(x, salonId)),
    bookings: s.bookings.map((x) => bookingRow(x, salonId)),
    invoices: s.invoices.map((x) => invoiceRow(x, salonId)),
    wallet: s.customers.flatMap((c) => walletRows(c, salonId)),
    loyalty: s.customers.flatMap((c) => loyaltyRows(c, salonId)),
    leaves: s.staff.flatMap((st) => leaveRows(st, salonId)),
    serviceMaterials: new Map(s.services.map((x) => [x.id, JSON.stringify(x.materials ?? [])])),
    serviceStaff: new Map(s.staff.map((x) => [x.id, JSON.stringify([...x.services].sort())])),
    bookingServices: new Map(s.bookings.map((b) => [b.id, JSON.stringify({ ids: b.serviceIds, q: b.serviceQueue, staff: b.staffId })])),
  };
}

const serviceRow = (s: Service, salon_id: string): Row => ({
  id: s.id, salon_id, name: s.name, category: s.category || null, price: s.price,
  duration_min: s.durationMin, prep_min: s.prepMin, cleanup_min: s.cleanupMin, active: s.active,
  branch_id: s.branchId ?? null,

});

const inventoryRow = (i: InventoryItem, salon_id: string): Row => ({
  id: i.id, salon_id, name: i.name, unit: i.unit, measure: i.measure,
  size_per_unit: i.sizePerUnit, stock: i.stock, min_stock: i.minStock, cost_per_unit: i.costPerUnit,
});

const staffRow = (s: Staff, salon_id: string): Row => ({
  id: s.id, salon_id, name: s.name, role_label: s.role || null, job_title: s.jobTitle ?? null,
  phone: s.phone || null, email: s.email ?? null, gender: s.gender ?? null,
  national_id: s.nationalId ?? null, birth_date: s.birthDate || null,
  nationality: s.nationality ?? null, address: s.address ?? null,
  emergency_name: s.emergencyName ?? null, emergency_phone: s.emergencyPhone ?? null,
  contract_type: s.contractType ?? null, hire_date: s.hireDate || null,
  base_salary: s.salary ?? 0, allowances: s.allowances ?? [], commission_pct: s.commissionPct ?? 0,
  annual_leave_days: s.annualLeaveDays ?? 21, points: Math.round(s.points ?? 0),
  active: s.active, branch_id: s.branchId ?? null,
  meta: { notes: s.notes ?? [], pointsLog: s.pointsLog ?? [] },

});

const customerRow = (c: Customer, salon_id: string): Row => ({
  id: c.id, salon_id, name: c.name, phone: c.phone, email: c.email ?? null,
  gender: c.gender ?? null, birth_date: c.birthDate || null, address: c.address ?? null,
  notes: c.notes ?? null, wallet_id: c.walletId ?? null, wallet_balance: c.walletBalance ?? 0,
  loyalty_points: c.loyaltyPoints ?? 0, referral_code: c.referralCode ?? null,
  referred_by: c.referredBy ?? null, visits: c.visits, total_spent: c.totalSpent,
});

const bookingRow = (b: Booking, salon_id: string): Row => ({
  id: b.id, salon_id, code: b.code, global_no: b.globalNo, branch_no: b.branchNo,
  daily_no: b.dailyNo, booking_date: b.bookingDate, customer_id: b.customerId || null,
  staff_id: b.staffId || null, starts_at: b.startsAt, duration_min: b.durationMin,
  price: b.price, discount: b.discount, coupon_code: b.couponCode ?? null,
  coupon_discount: b.couponDiscount ?? 0, wallet_used: b.walletUsed ?? 0,
  wallet_approved: b.walletApproved ?? false, payment_method: b.paymentMethod ?? null,
  hold_expires_at: b.holdExpiresAt ?? null, status: b.status, pay_status: b.payStatus,
  stock_deducted: b.stockDeducted ?? false,
  branch_id: b.branchId ?? null,
  notes: b.notes ?? null,
});

const invoiceRow = (i: Invoice, salon_id: string): Row => ({
  id: i.id, salon_id, number: i.number, booking_id: i.bookingId || null,
  customer_id: i.customerId || null, subtotal: i.subtotal, discount: i.discount,
  vat: i.vat, total: i.total, paid: i.paid, payment_method: i.method,
  branch_id: i.branchId ?? null,
  status: i.paid >= i.total ? "paid" : i.paid > 0 ? "partial" : "unpaid",
});


const walletRows = (c: Customer, salon_id: string): Row[] =>
  (c.walletLog ?? []).map((w) => ({
    id: w.id, salon_id, customer_id: c.id, amount: w.delta,
    kind: w.delta >= 0 ? "topup" : "spend", reason: w.reason, created_at: w.at,
  }));

const loyaltyRows = (c: Customer, salon_id: string): Row[] =>
  (c.loyaltyLog ?? []).map((l) => ({
    id: l.id, salon_id, customer_id: c.id, points: l.delta, reason: l.reason, created_at: l.at,
  }));

const leaveRows = (s: Staff, salon_id: string): Row[] =>
  (s.leaves ?? []).map((l) => ({
    id: l.id, salon_id, staff_id: s.id, from_date: l.from, to_date: l.to,
    days: l.days, kind: "annual", status: "approved", reason: l.reason ?? null,
  }));

// ---------- writing ----------

let pendingState: SalonState | null = null;

function syncNow(): Promise<void> {
  const state = pendingState;
  pendingState = null;
  if (!state) return Promise.resolve();
  const ctx = getDataContext();
  if (!ctx?.salonId || !ready) return Promise.resolve();
  const salonId = ctx.salonId;
  return enqueue(async () => {
    const next = buildSnapshot(state, salonId);
    const prev = snap;
    snap = next;
    try {
      await diffSync("services", next.services, prev.services);
      await diffSync("inventory_items", next.inventory, prev.inventory);
      await diffSync("staff", next.staff, prev.staff);
      await diffSync("customers", next.customers, prev.customers);
      await diffSync("bookings", next.bookings, prev.bookings);
      await diffSync("invoices", next.invoices, prev.invoices);
      await diffSync("leaves", next.leaves, prev.leaves);
      await insertNew("wallet_transactions", next.wallet, prev.wallet);
      await insertNew("loyalty_transactions", next.loyalty, prev.loyalty);

      for (const s of state.services) {
        if (next.serviceMaterials.get(s.id) !== prev.serviceMaterials.get(s.id)) {
          await replaceChildren("service_materials", "service_id", s.id,
            (s.materials ?? []).map((m) => ({
              id: crypto.randomUUID(), salon_id: salonId, service_id: s.id, item_id: m.itemId, qty: m.qty,
            })));
        }
      }
      for (const st of state.staff) {
        if (next.serviceStaff.get(st.id) !== prev.serviceStaff.get(st.id)) {
          await replaceChildren("service_staff", "staff_id", st.id,
            st.services.map((sid) => ({
              id: crypto.randomUUID(), salon_id: salonId, service_id: sid, staff_id: st.id,
            })));
        }
      }
      for (const b of state.bookings) {
        if (next.bookingServices.get(b.id) !== prev.bookingServices.get(b.id)) {
          await replaceChildren("booking_services", "booking_id", b.id,
            b.serviceIds.map((sid, idx) => {
              const svc = state.services.find((x) => x.id === sid);
              return {
                id: crypto.randomUUID(), salon_id: salonId, booking_id: b.id, service_id: sid,
                staff_id: b.staffId || null, price: svc?.price ?? 0,
                duration_min: svc?.durationMin ?? 0, queue_no: b.serviceQueue?.[sid] ?? null,
                sort_order: idx,
              };
            }));
        }
      }
    } catch (e) {
      console.error("[db] salon sync failed", e);
    }
  });
}

const flush = debounce(() => {
  void syncNow();
}, 350);

/** Called by the store after every mutation. */
export function scheduleSalonSave(state: SalonState) {
  pendingState = state;
  flush();
}

/**
 * Pushes any pending local changes to the database immediately and waits for
 * them to land. Server-side operations (checkout, loyalty) call this first so
 * the rows they act on already exist.
 */
export function flushSalonSave(): Promise<void> {
  return syncNow();
}


export function resetSalonSnapshot() {
  snap = emptySnapshot();
  ready = false;
}
