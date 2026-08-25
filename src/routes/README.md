# Routes

TanStack Start uses **file-based routing**. Every `.tsx` file in this directory
defines a route. Do **not** create `src/pages/`, `src/routes/_app/index.tsx`, or
`app/layout.tsx` — those are Next.js / Remix conventions. The only root layout
is `src/routes/__root.tsx`.

## Conventions

| File | URL |
| --- | --- |
| `index.tsx` | `/` |
| `about.tsx` | `/about` |
| `users/index.tsx` | `/users` |
| `users/$id.tsx` | `/users/:id` (dynamic — bare `$`, no curly braces) |
| `posts/{-$category}.tsx` | `/posts/:category?` (optional segment) |
| `files/$.tsx` | `/files/*` (splat — read via `_splat` param, never `*`) |
| `_layout.tsx` | layout route (renders children via `<Outlet />`) |
| `__root.tsx` | app shell — wraps every page; preserve `<Outlet />` |

`routeTree.gen.ts` is auto-generated. Don't edit it by hand.

## Salon sub-routes (`/salon/$slug/...`)

The salon storefront is a **leaf** at `salon.$slug.index.tsx`; sub-pages such as
`salon.$slug.login.tsx` are siblings. Never add a `salon.$slug.tsx` page that
renders content — a parent route without `<Outlet />` shadows every child, so
`/salon/$slug/login` would change the URL without rendering. If a shared salon
layout is ever needed, create `salon.$slug.tsx` returning only `<Outlet />`.

`src/lib/route-files.test.ts` enforces both invariants (route id matches
filename, parents render `<Outlet />`); run `bunx vitest run` before shipping
route changes.
