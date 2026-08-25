/**
 * Branch scoping helpers shared by the invoices register, the services list and
 * the POS. Keeping the rule in one pure function means every screen filters the
 * same way and the behaviour can be tested without a browser.
 *
 * Rule: when a branch is active, only rows of that branch are visible. Rows
 * with no branch are salon-wide (created before branches existed, or shared) and
 * stay visible everywhere. With no active branch, everything of the salon shows.
 */
export interface BranchScoped {
  branchId?: string | null;
}

export function belongsToBranch(row: BranchScoped, activeBranchId: string | null): boolean {
  if (!activeBranchId) return true;
  return !row.branchId || row.branchId === activeBranchId;
}

export function scopeToBranch<T extends BranchScoped>(rows: T[], activeBranchId: string | null): T[] {
  if (!activeBranchId) return rows;
  return rows.filter((r) => belongsToBranch(r, activeBranchId));
}

/** Same rule for database rows that use the snake_case column name. */
export function scopeRowsToBranch<T extends { branch_id?: string | null }>(
  rows: T[],
  activeBranchId: string | null,
): T[] {
  if (!activeBranchId) return rows;
  return rows.filter((r) => !r.branch_id || r.branch_id === activeBranchId);
}

/** Branch a new document (invoice, POS sale, service) must be stamped with. */
export function branchForNewRecord(
  activeBranchId: string | null,
  fallbackBranchId: string | null = null,
): string | null {
  return activeBranchId ?? fallbackBranchId;
}

/** Filters the header branch picker by a free-text query (name or address). */
export function searchBranches<T extends { name: string; address?: string | null }>(
  branches: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return branches;
  return branches.filter(
    (b) =>
      b.name.toLowerCase().includes(q) || (b.address ?? "").toLowerCase().includes(q),
  );
}
