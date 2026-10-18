# VilaiWatch frontend redesign: plan (awaiting approval)

Scope: `apps/web/` only, plus this folder. No backend, env, infra or contract changes.

## Inputs not found

- `ANTISLOPE.md` (repo root) does not exist. Its rules could not be read. Until it is supplied, the
  prompt's own design spec is used.
- `docs/design/reference.png` does not exist. The mood is taken from the prompt's text description only.

## Current state

Vite + React 18 + React Router 6 + TanStack Query 5 + Zustand + Tailwind 3. Theming is done by
remapping `slate-*` / `sky-*` through CSS variables in `src/styles/index.css`; the price app is wrapped
in `.pro` (light). Several one-off font families and palettes exist (`shop`, `site`, `heading`,
`display`) for the Storefront, Project and Landing pages. Not yet installed: `lucide-react`,
`recharts`, `clsx`.

## Routes (all kept)

| Route | Page | Guard |
|---|---|---|
| `/` | Storefront | public |
| `/project` | Project | public |
| `/landing` | Landing | public |
| `/login` | Login | public |
| `/prices` (layout: PriceLayout) | PriceDashboard | public |
| `/prices/search` | Home (search / track a URL) | public |
| `/prices/p/:productId` | Product | public |
| `/prices/alerts` | Alerts | needs sign-in |
| `*` | redirect to `/prices` | |

Not routed today (comment in `App.tsx`: "intentionally not routed"): Dashboard, MonitorList,
MonitorDetail, MonitorForm, DiffViewer, Channels, Settings.

## API calls per page (unchanged)

Price API (`src/api/prices.ts`, hooks in `priceHooks.ts`; `VITE_USE_MOCK=true` uses `data/mock.ts`):

| Call | Used by |
|---|---|
| `GET /products/search?q=` | PriceDashboard (empty query = tracked list), Home |
| `GET /products/:id` | Product |
| `GET /products/:id/history?range=` | Product (chart) |
| `GET /deals/top` | PriceDashboard, Home |
| `POST /products/track` `{url}` | Home |
| `GET /alerts` | PriceDashboard, Product, Alerts (signed-in only) |
| `POST /alerts` | AlertForm (Product) |
| `PATCH /alerts/:id` | AlertRow (Alerts) |
| `DELETE /alerts/:id` | Product, AlertRow |
| WebSocket `/ws/prices` | `useLivePrices` in PriceLayout; patches caches via `applyLiveUpdate` |

Auth: `POST /auth/login`, `POST /auth/register`, `GET /auth/me` (Login). Token via `store/auth.ts`;
a 401 on a non-auth call clears the session.

ChangeRadar API (`src/api/hooks.ts`, used by the unrouted pages): `GET /workspaces`,
`GET/POST /workspaces/:w/monitors`, `GET /workspaces/:w/monitors/:m`, `POST …/run-now`,
`GET /workspaces/:w/changes`, `GET …/changes/:c`, `POST …/changes/:c/acknowledge`,
`GET /workspaces/:w/channels`.

## Test selectors that must survive

- Playwright `tests/e2e/specs/login.spec.ts`: label "Email", label "Password", button "Sign in",
  text "Invalid email or password.". There are no `data-testid` attributes in the app.
- Vitest: `reconnect.test.ts`, `liveUpdates.test.ts`, `priceStats.test.ts` (logic only, unaffected).

## Visual changes by step (one commit each, `ui: …`)

1. **Tokens**: `styles/tokens.css` with the spec's light and dark variables; Tailwind maps them
   (`bg`, `surface`, `ink`, `accent`, `good`, `warn`, radii, the single shadow); Manrope; base styles.
   Keep the old `slate`/`sky` mapping pointing at the new tokens until each screen is migrated, so
   nothing breaks mid-way.
2. **UI primitives** in `components/ui/` (Button, Card, ListRow, Toggle, Badge, PriceTag, Sparkline,
   Skeleton, EmptyState, ErrorState, Toast) plus a dev-only `/design` route (added only when
   `import.meta.env.DEV`, so no production route is added).
3. **Layout**: desktop sidebar and floating mobile bottom nav replacing `PriceLayout` chrome.
4. **Screens**, one commit each: Welcome (logged-out only), Home/Prices, Product, Insights, Watchlist/
   Alerts, Settings, ChangeRadar monitors.

## Decisions needed from you

1. **Insights, Settings and Monitors have no route today.** Section 3 of your prompt puts Insights,
   Settings and Monitors in the navigation, but there is no `/prices/insights` or settings route,
   and the monitor pages were deliberately left unrouted. Adding routes is allowed ("only if
   needed"), so I propose: `/prices/insights`, `/prices/settings`, and `/monitors` (wiring up the
   existing pages). OK?
2. **Monitors need a workspace and sign-in.** They call workspace endpoints that the price app never
   uses. I'd show them only to signed-in users. OK?
3. **Storefront, Project, Landing** (about 1,300 lines with their own fonts and palettes). Restyle
   them to the new system, or leave them as they are? I propose leaving them out of scope except
   Landing, which becomes the Welcome screen's source.
4. **Dependencies.** Adding `lucide-react`, `recharts`, `clsx` (all on your allowed list). The
   hand-drawn `PriceChart` would be replaced by Recharts.
5. **Welcome screen.** The prompt asks for it "logged-out only". Today `/prices` is public for
   everyone. I'd show Welcome once at `/prices` for logged-out first visits (remembered in
   `localStorage`) and keep browsing open.

## Derived client-side, no backend needed

- Insights: lowest in N days, % change this week, drop vs. average, computed from the history
  endpoint already used by Product (`lib/priceStats.ts` already has stats helpers).
- "Good time to buy" only when the current price equals the period minimum.
- No chat input: the API has no chat or AI endpoint (the only `chat` match is Telegram `chat_id`).

## Future backend work

- Per-user notification channel toggles (Email / Telegram / WhatsApp). Alerts carry channels per
  alert, but there is no account-level preferences endpoint. Settings shows these read-only.
- Product images: confirm the product schema has an image URL; if not, show placeholders.
- A chat/insights endpoint, if real AI replies are wanted later.
- Profile name (the auth `User` may only have an email).
