import { beforeEach, describe, expect, it } from "vitest";

import {
  belongsToBranch,
  branchForNewRecord,
  scopeRowsToBranch,
  scopeToBranch,
  searchBranches,
} from "@/lib/branch-scope";
import { getActiveBranch, restoreActiveBranch, setActiveBranch } from "@/lib/active-branch";

const A = "branch-a";
const B = "branch-b";

const invoices = [
  { id: "i1", number: "INV-1", branchId: A },
  { id: "i2", number: "INV-2", branchId: B },
  { id: "i3", number: "INV-3", branchId: null },
];

const services = [
  { id: "s1", name: "قص", branchId: A },
  { id: "s2", name: "مكياج", branchId: B },
  { id: "s3", name: "عرض عام", branchId: null },
];

describe("branch scoping (invoices / services / POS)", () => {
  it("returns only the active branch rows plus salon-wide rows", () => {
    expect(scopeToBranch(invoices, A).map((i) => i.id)).toEqual(["i1", "i3"]);
    expect(scopeToBranch(services, A).map((s) => s.id)).toEqual(["s1", "s3"]);
  });

  it("never leaks another branch's invoices or services", () => {
    for (const active of [A, B]) {
      const other = active === A ? B : A;
      expect(scopeToBranch(invoices, active).some((i) => i.branchId === other)).toBe(false);
      expect(scopeToBranch(services, active).some((s) => s.branchId === other)).toBe(false);
    }
  });

  it("shows everything when no branch is active", () => {
    expect(scopeToBranch(invoices, null)).toHaveLength(3);
    expect(scopeToBranch(services, null)).toHaveLength(3);
  });

  it("scopes snake_case database rows the same way", () => {
    const rows = [
      { id: "p1", branch_id: A },
      { id: "p2", branch_id: B },
      { id: "p3", branch_id: null },
    ];
    expect(scopeRowsToBranch(rows, B).map((r) => r.id)).toEqual(["p2", "p3"]);
  });

  it("stamps POS sales with the active branch, falling back to the first branch", () => {
    expect(branchForNewRecord(A, B)).toBe(A);
    expect(branchForNewRecord(null, B)).toBe(B);
    expect(branchForNewRecord(null, null)).toBeNull();
  });

  it("treats a row of a deleted/unknown branch as hidden", () => {
    expect(belongsToBranch({ branchId: "ghost" }, A)).toBe(false);
  });
});

describe("header branch picker search", () => {
  const branches = [
    { id: A, name: "فرع الرياض", address: "حي الملقا" },
    { id: B, name: "فرع جدة", address: "شارع التحلية" },
    { id: "c", name: "Riyadh Mall", address: null },
  ];

  it("matches by name and by address", () => {
    expect(searchBranches(branches, "جدة").map((b) => b.id)).toEqual([B]);
    expect(searchBranches(branches, "الملقا").map((b) => b.id)).toEqual([A]);
    expect(searchBranches(branches, "riyadh").map((b) => b.id)).toEqual(["c"]);
  });

  it("returns everything for an empty query", () => {
    expect(searchBranches(branches, "   ")).toHaveLength(3);
  });
});

describe("active branch persistence", () => {
  const salon = "salon-1";

  beforeEach(() => {
    const store = new Map<string, string>();
    // Minimal localStorage stand-in so the store can be tested outside a browser.
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => void store.set(k, v),
        removeItem: (k: string) => void store.delete(k),
      },
    };
    setActiveBranch(salon, null);
  });

  it("keeps the selection after a reload", () => {
    setActiveBranch(salon, A);
    expect(getActiveBranch()).toBe(A);
    // Simulate a fresh page load: read the stored value back from storage.
    restoreActiveBranch(salon);
    expect(getActiveBranch()).toBe(A);
  });


  it("does not carry a selection across salons", () => {
    setActiveBranch(salon, A);
    restoreActiveBranch("salon-2");
    expect(getActiveBranch()).toBeNull();
  });
});
