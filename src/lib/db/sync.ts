import { supabase } from "@/integrations/supabase/client";

type AnyRow = Record<string, unknown> & { id: string };

/** Serializes all writes so concurrent actions never race each other. */
let chain: Promise<unknown> = Promise.resolve();

export function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = chain.then(fn, fn);
  chain = next.catch(() => undefined);
  return next as Promise<T>;
}

export function logDbError(where: string, error: { message: string } | null) {
  if (error) console.error(`[db] ${where}: ${error.message}`);
}

const table = (name: string) => supabase.from(name as never) as never as {
  upsert: (rows: unknown) => Promise<{ error: { message: string } | null }>;
  insert: (rows: unknown) => Promise<{ error: { message: string } | null }>;
  delete: () => { in: (col: string, v: string[]) => Promise<{ error: { message: string } | null }>; eq: (col: string, v: string) => Promise<{ error: { message: string } | null }> };
};

const key = (r: AnyRow) => JSON.stringify(r);

/**
 * Upserts rows that are new or changed and deletes rows that disappeared.
 * `prev` is the snapshot of the last successful write.
 */
export async function diffSync(name: string, rows: AnyRow[], prev: AnyRow[]) {
  const prevMap = new Map(prev.map((r) => [r.id, key(r)]));
  const changed = rows.filter((r) => prevMap.get(r.id) !== key(r));
  const nextIds = new Set(rows.map((r) => r.id));
  const removed = prev.filter((r) => !nextIds.has(r.id)).map((r) => r.id);

  if (changed.length) {
    const { error } = await table(name).upsert(changed);
    logDbError(`upsert ${name}`, error);
  }
  if (removed.length) {
    const { error } = await table(name).delete().in("id", removed);
    logDbError(`delete ${name}`, error);
  }
}

/** Inserts only rows whose id is not part of the previous snapshot. */
export async function insertNew(name: string, rows: AnyRow[], prev: AnyRow[]) {
  const seen = new Set(prev.map((r) => r.id));
  const fresh = rows.filter((r) => !seen.has(r.id));
  if (!fresh.length) return;
  const { error } = await table(name).insert(fresh);
  logDbError(`insert ${name}`, error);
}

/** Replaces the child rows of one parent (used for join tables). */
export async function replaceChildren(name: string, parentCol: string, parentId: string, rows: AnyRow[]) {
  const { error: delErr } = await table(name).delete().eq(parentCol, parentId);
  logDbError(`clear ${name}`, delErr);
  if (!rows.length) return;
  const { error } = await table(name).insert(rows);
  logDbError(`insert ${name}`, error);
}

export function debounce(fn: () => void, ms: number) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => {
      t = null;
      fn();
    }, ms);
  };
}

export const num = (v: unknown, fallback = 0) => (v === null || v === undefined ? fallback : Number(v));
export const str = (v: unknown, fallback = "") => (v === null || v === undefined ? fallback : String(v));
