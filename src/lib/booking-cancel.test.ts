import { describe, expect, it, beforeEach } from "vitest";

import {
  actions,
  getState,
  hydrateSalonStore,
  type InventoryItem,
  type Service,
} from "@/lib/salon-store";

const item = (over: Partial<InventoryItem> = {}): InventoryItem => ({
  id: "item-1",
  name: "صبغة",
  unit: "قنينة",
  stock: 10,
  minStock: 2,
  costPerUnit: 50,
  measure: "ml",
  sizePerUnit: 100,
  ...over,
});

const service = (over: Partial<Service> = {}): Service => ({
  id: "svc-1",
  name: "صبغة شعر",
  category: "شعر",
  price: 200,
  durationMin: 60,
  prepMin: 0,
  cleanupMin: 0,
  materials: [{ itemId: "item-1", qty: 2 }],
  active: true,
  ...over,
});

function seed() {
  hydrateSalonStore({
    services: [service()],
    staff: [],
    customers: [
      {
        id: "cus-1",
        name: "عميلة",
        phone: "0500000000",
        visits: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      } as never,
    ],
    bookings: [],
    invoices: [],
    inventory: [item()],
    counters: { global: 0, branch: 0, byDay: {}, byServiceDay: {} },
  });
}

const newBooking = () =>
  actions.addBooking({
    customerId: "cus-1",
    serviceIds: ["svc-1"],
    staffId: undefined,
    startsAt: new Date().toISOString(),
    durationMin: 60,
    price: 200,
    discount: 0,
    notes: "",
  } as never);

const stockOf = () => getState().inventory[0]!.stock;

describe("إلغاء الحجز", () => {
  beforeEach(seed);

  it("لا يعيد أي كمية للمخزون عند إلغاء حجز غير مفوتر", () => {
    const b = newBooking();
    expect(stockOf()).toBe(10);

    const res = actions.cancelBooking(b.id, "اعتذار العميلة");

    expect(res.ok).toBe(true);
    expect(res.restocked).toBe(false);
    expect(stockOf()).toBe(10);
    expect(getState().bookings.find((x) => x.id === b.id)?.status).toBe("cancelled");
  });

  it("يعيد المواد للمخزون عند إلغاء حجز مفوتر (خُصمت مواده)", () => {
    const b = newBooking();
    actions.createInvoice(b.id, "cash");
    expect(stockOf()).toBe(8); // 2 units consumed by the service

    const res = actions.cancelBooking(b.id);

    expect(res.ok).toBe(true);
    expect(res.restocked).toBe(true);
    expect(stockOf()).toBe(10);
    expect(getState().bookings.find((x) => x.id === b.id)?.stockDeducted).toBe(false);
  });

  it("لا يعيد المواد عندما تكون سياسة الإرجاع معطّلة", () => {
    const b = newBooking();
    actions.createInvoice(b.id, "cash");
    expect(stockOf()).toBe(8);

    const res = actions.cancelBooking(b.id, undefined, false);

    expect(res.ok).toBe(true);
    expect(res.restocked).toBe(false);
    expect(stockOf()).toBe(8);
  });

  it("يمنع إلغاء نفس الحجز مرتين فلا يتضاعف الرصيد", () => {
    const b = newBooking();
    actions.createInvoice(b.id, "cash");
    actions.cancelBooking(b.id);

    const again = actions.cancelBooking(b.id);

    expect(again.ok).toBe(false);
    expect(again.restocked).toBe(false);
    expect(stockOf()).toBe(10);
  });

  it("يلغي الحجوزات المحجوزة تلقائياً بعد انتهاء مهلة الدفع دون لمس المخزون", () => {
    const b = newBooking();
    actions.updateBooking(b.id, {
      paymentMethod: "hold",
      holdExpiresAt: new Date(Date.now() - 60_000).toISOString(),
    });

    actions.cancelExpiredHolds();

    expect(getState().bookings.find((x) => x.id === b.id)?.status).toBe("cancelled");
    expect(stockOf()).toBe(10);
  });
});
