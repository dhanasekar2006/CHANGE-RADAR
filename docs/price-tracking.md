# Price tracking (VilaiWatch)

VilaiWatch tracks one product's price across stores, keeps its history, pushes
changes to open browsers live, and alerts users when a price reaches their target.
It reuses ChangeRadar's api, worker, Redis and Postgres.

## How a price gets from a store to your screen

```
Celery beat (every ≤60s)
   └─ worker.prices.dispatch_due_listings   listings not checked in PRICE_CHECK_INTERVAL_SECONDS (default 30 min)
        └─ worker.prices.check_listing(id)
             1. per-listing lock + per-domain rate limit (Redis)
             2. PriceFetcher adapter for listing.store → {price, in_stock, title}
                  (robots.txt honoured, VilaiWatchBot user agent)
             3. apply_result: PricePoint written ONLY if the price changed;
                current_price / in_stock / last_checked_at always refreshed
             4. trigger_alerts: armed alerts with target >= price are delivered
                (email / WhatsApp / Telegram) and marked triggered only if delivery worked
             5. publish {"type":"price_update", ...} on Redis channel "prices"
                                        │
FastAPI  GET /ws/prices  ◄──────────────┘  relays Redis messages to browsers
                                        │
React    useLivePrices  ◄──────────────┘  patches the TanStack Query cache:
                                           price, Best badge, stats, chart, flash, toast
```

Failures: a fetch error retries with jittered exponential backoff (up to 6
times); a robots.txt block or an unreadable page is logged and not retried.
Redis being down never fails a check whose result is already saved.

## Data model

| Table | Purpose |
| --- | --- |
| `products` | `name`, `image_url`, `category`. Global, not workspace-scoped. |
| `store_listings` | One store's page for a product: `store` (adapter key), `url` (unique), `current_price`, `in_stock`, `last_checked_at`. |
| `price_points` | `listing_id`, `price`, `checked_at`. One row per actual change. |
| `price_alerts` | `user_id`, `product_id`, `target_price`, `channels`, `triggered_at`. |

Prices are in rupees (INR); there is no currency conversion.

## API

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /products/search?q=` | – | Name/category search. A pasted listing URL returns the product it belongs to (`is_url: true`). |
| `POST /products/track {url}` | user | Start tracking a URL we have an adapter for (fetches it once to read the name and price). |
| `GET /products/{id}` | – | Product, each store's price/stock/`last_checked_at`, `is_best`, `best_price`. |
| `GET /products/{id}/history?range=1M\|3M\|6M` | – | `[{date, price, store}]`, oldest first. Each store starts at the price in effect when the window opened (its date is clamped to the window start). |
| `GET /deals/top` | – | Cheapest in-stock price furthest below its **time-weighted** 30-day average. |
| `GET/POST /alerts`, `PATCH/DELETE /alerts/{id}` | user | CRUD. Changing `target_price` re-arms a triggered alert. |
| `WS /ws/prices[?product_id=]` | – | Live feed of `price_update` messages. |

`price_update` message:

```json
{"type":"price_update","product_id":"…","listing_id":"…","store":"demo",
 "price":22990.0,"old_price":24990.0,"in_stock":true,"checked_at":"2026-10-14T10:30:00+00:00"}
```

It is published on every successful check, so `old_price == price` means "re-checked, unchanged".
`old_price` is `null` the first time a listing is priced.

## Demo: lower a price and watch it change live

You need Docker running. Three terminals:

```bash
# 1. a fake store you control (http://localhost:8008)
python scripts/demo_store.py

# 2. the stack, checking every 30s instead of 30 min
cp .env.example .env            # then set PRICE_CHECK_INTERVAL_SECONDS=30 in .env
docker compose up --build

# 3. register the demo store's products (run once the stack is up)
python scripts/seed_prices.py
```

Open http://localhost:5173/prices and click **Sony WH-1000XM5**. Within ~30s the
first check fills in the price and the badge shows **Live**. Then open
http://localhost:8008, set the Sony price lower, and click **Update**. On the
next check the price on the product page flashes green, the Best badge, stats and
chart move, and nothing reloads.

To see the target-price toast: sign in (`python scripts/seed_db.py` creates
`demo@changeradar.local` / `changeradar-demo`), set an alert above the new price on the
product page, and lower the price again.

The worker reaches the demo store at `host.docker.internal:8008`. If you run the
worker on the host instead, seed with `--base-url http://localhost:8008`.

No backend? `VITE_USE_MOCK=true npm run dev` (in `apps/web`) runs the whole UI on
built-in demo data with simulated live updates.

## Price-drop alerts (email, WhatsApp, Telegram)

On a product page a signed-in user sets a target price (or taps a quick pick: *Any drop*, *5% lower*,
*10% lower*) and ticks the channels to use. After every check the worker looks for armed alerts whose
target is at or above the new price on an in-stock listing, **writes the message** and sends it on each
channel. The alert counts as delivered if at least one channel got through; if every channel fails it
stays armed and the next check retries it. Changing the target re-arms a triggered alert.

The message includes the product, new price, store, the drop since the previous check, your target and
the link, for example:

```
📉 Price drop! Sony WH-1000XM5
Now ₹24,990.00 at Examplemart (was ₹26,990.00, down 7.4%)
Your target: ₹25,000.00
https://examplemart.in/p/sony-xm5
```

Email is sent as plain text plus an HTML version with a "View deal" button.

### Email

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` in `.env` and restart the worker.
Port 25 sends without TLS; any other port uses STARTTLS. With Gmail use `smtp.gmail.com`, port `587`,
your address as the user and an **app password** (needs 2-step verification), not your normal password.

To try it without a real mailbox, run a local mail catcher and read the mail at http://localhost:8025:

```bash
docker run -d --name mailpit -p 25:1025 -p 8025:8025 axllent/mailpit
# .env: SMTP_HOST=host.docker.internal  SMTP_PORT=25
```

### WhatsApp (Meta WhatsApp Cloud API)

1. At <https://developers.facebook.com> create an app (type *Business*) and add the **WhatsApp** product.
   Its *API Setup* page gives you a free test sender number, its **Phone number ID**, and a temporary
   access token (valid 24 hours; for production create a permanent System User token in Business Settings).
2. In *API Setup* add the phone numbers that may receive messages from the test number (up to 5).
3. Message templates: WhatsApp only allows free-form text within **24 hours after the person last messaged
   your number**. A price alert is business-started, so for real use create a *Utility* template in WhatsApp
   Manager with exactly four body variables, in this order, and wait for approval:
   `Price drop! {{1}} is now {{2}} at {{3}}. Buy: {{4}}`
   ({{1}} product, {{2}} new price, {{3}} store, {{4}} link).
   For a first test you can skip the template: send "hi" to the test number from your phone, then plain
   text alerts reach you for the next 24 hours.
4. Put the values in `.env` and restart the worker (`docker compose up -d worker`):

   ```
   WHATSAPP_ACCESS_TOKEN=...            WHATSAPP_PHONE_NUMBER_ID=...
   WHATSAPP_TEMPLATE_NAME=price_drop_alert   # blank = plain text
   WHATSAPP_TEMPLATE_LANGUAGE=en_US          # the language the template was created in
   ```

5. On a product page tick **WhatsApp**, enter the number with country code (`+91 98765 43210`) and save.

The number is stored with the alert and only returned to the user who owns it; the alerts list shows it
masked to the last four digits. The form asks for consent because WhatsApp requires people to opt in; do
not message numbers that haven't.

If a WhatsApp message doesn't arrive, the worker log names the reason straight from Meta (expired token,
number not in the allowed list, template not approved, outside the 24-hour window):

```bash
docker compose logs worker | grep "alert delivery failed"
```

## Using real stores

The demo store is the only store out of the box. There are three ways to get real prices in, best first:

1. **An official or affiliate API** (a store's partner programme, or an affiliate network's product feed).
   Stable, permitted, and usually needs an account and keys. Write a dedicated `PriceFetcher` (see below).
2. **Structured data on the product page** (`StructuredDataFetcher`, below). Many shops publish their price
   as schema.org `Product`/`Offer` JSON-LD or Open Graph `product:price:*` tags. No keys, and one config line
   per store, but it only works for shops that publish it and allow automated access.
3. **Scraping a page's visual layout.** Breaks whenever the site changes and is often against the store's
   terms. Marketplaces in particular tend to block bots and disallow product pages in robots.txt. Avoid it.

### Structured-data stores

Set `PRICE_JSONLD_STORES` in `.env` (API, worker and beat all read it), then restart them:

```bash
# key=host, comma separated; join several hosts of one store with |
PRICE_JSONLD_STORES=examplemart=examplemart.in,gadgets=gadgetworld.in|shop.gadgetworld.in
PRICE_USER_AGENT=MyPriceBot/1.0 (+https://your-real-site.example/bot)
```

Then signed-in users can paste a product link into the search box (`POST /products/track`), and the worker
re-checks it every `PRICE_CHECK_INTERVAL_SECONDS`. The key (`examplemart`) is the store name shown in the UI.

What the adapter does:

- Reads `Product` → `offers` JSON-LD (also inside `@graph`/`mainEntity`), falling back to `og:price:amount`.
  With several offers the cheapest **in-stock** one wins; if none is in stock it reports the cheapest as out of stock.
- Refuses any price whose currency isn't INR instead of storing it as rupees.
- Only fetches the hosts you listed (public DNS names; IPs and `localhost` are rejected at startup), so a
  submitted link can't aim the server at an internal address.
- Honours robots.txt and sends your `PRICE_USER_AGENT`. Use a real contact URL, and check each store's terms
  before enabling it; you are responsible for what you crawl.

Check a store before relying on it: open a product page, view source, and search for `application/ld+json`
and `"price"`. If it isn't there, this adapter can't read that store.

Limits today: one URL becomes one product (the same product on two stores is two products, not one comparison
yet), and pages that describe many variants in one `ProductGroup` are not read.

## Adding a store

1. Write a `PriceFetcher` subclass in `packages/core/prices/adapters/` returning a
   `PriceResult(price, in_stock, title)`. Fetch HTTP through `packages.core.prices.http.get_page`
   so robots.txt and the user agent are applied; prefer an official or affiliate API where one exists.
2. Register an instance in `ADAPTERS` (`adapters/__init__.py`, see `build_adapters`).
3. Create `store_listings` rows with `store` set to the adapter's key.

`POST /products/track` only accepts URLs an adapter's `supports()` claims, which also stops it being used to
make the API fetch arbitrary addresses. The demo adapter only accepts the hosts in `DEMO_STORE_HOSTS`.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `PRICE_CHECK_INTERVAL_SECONDS` | `1800` | Minimum time between checks of one listing. |
| `PRICE_USER_AGENT` | `VilaiWatchBot/1.0 …` | Sent on every fetch and matched against robots.txt rules. |
| `PRICE_JSONLD_STORES` | empty | Real stores to read via structured data: `key=host[\|host]`, comma separated. |
| `DEMO_STORE_HOSTS` | `localhost,127.0.0.1,host.docker.internal` | Hosts the demo adapter may fetch. |
| `SMTP_*` | – | Email alert delivery. |
| `TELEGRAM_BOT_TOKEN` | – | Telegram alert delivery (the chat id is stored per alert). |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` | – | WhatsApp alert delivery (Cloud API). Blank = WhatsApp alerts are skipped. |
| `WHATSAPP_TEMPLATE_NAME` | – | Approved template with 4 body variables. Blank = plain text (only within 24 h of the user messaging you). |
| `WHATSAPP_TEMPLATE_LANGUAGE` | `en` | Language code the template was created in, e.g. `en_US`. |
| `WHATSAPP_API_VERSION` | `v25.0` | Graph API version in the request URL; raise it when Meta retires yours. |
| `VITE_USE_MOCK` | `false` | Serve the UI from built-in demo data. |
