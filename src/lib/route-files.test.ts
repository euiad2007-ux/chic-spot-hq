import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard against route-shadowing regressions (e.g. a `salon.$slug.tsx` page that
 * swallows `/salon/$slug/login`). Two invariants are enforced:
 *  1. every `createFileRoute("...")` id matches its filename mapping,
 *  2. every route that has child routes renders an <Outlet />.
 */

const ROUTES_DIR = path.join(process.cwd(), "src", "routes");

interface RouteFile {
  file: string;
  id: string;
  source: string;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, acc);
    } else if (/\.tsx?$/.test(entry) && entry !== "routeTree.gen.ts") {
      acc.push(full);
    }
  }
  return acc;
}

/** Maps a route filename to the route id TanStack Router generates for it. */
function routeIdFor(relative: string): string {
  const withoutExt = relative.replace(/\.tsx?$/, "");
  const segments = withoutExt
    .split(path.sep)
    .flatMap((part) => part.split("."))
    .filter(Boolean);
  const last = segments[segments.length - 1];
  if (last === "route") segments.pop();
  const isIndex = segments[segments.length - 1] === "index";
  if (isIndex) segments.pop();
  const base = "/" + segments.join("/");
  if (isIndex) return base === "/" ? "/" : base + "/";
  return base;
}

const routes: RouteFile[] = walk(ROUTES_DIR)
  .map((file) => {
    const relative = path.relative(ROUTES_DIR, file);
    return { file: relative, id: routeIdFor(relative), source: readFileSync(file, "utf8") };
  })
  .filter((r) => r.source.includes("createFileRoute("));

describe("route files", () => {
  it("finds route modules", () => {
    expect(routes.length).toBeGreaterThan(5);
  });

  it("declares a createFileRoute id matching its filename", () => {
    const mismatches: string[] = [];
    for (const route of routes) {
      const match = route.source.match(/createFileRoute\(\s*["'`]([^"'`]+)["'`]\s*\)/);
      if (!match) continue;
      const declared = match[1];
      if (declared !== route.id && declared !== route.id.replace(/\/$/, "")) {
        mismatches.push(`${route.file}: declared "${declared}", expected "${route.id}"`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it("renders an <Outlet /> in every route that has children", () => {
    const ids = new Set(routes.map((r) => r.id));
    const offenders: string[] = [];
    for (const route of routes) {
      if (route.id.endsWith("/")) continue; // index leaves and the home route
      const prefix = route.id + "/";
      const hasChildren = [...ids].some((id) => id !== route.id && id.startsWith(prefix));
      if (!hasChildren) continue;
      if (!/<Outlet\b/.test(route.source)) {
        offenders.push(`${route.file} (${route.id}) has child routes but no <Outlet />`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
