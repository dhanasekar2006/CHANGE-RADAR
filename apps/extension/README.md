# VilaiWatch browser extension

A Chrome (Manifest V3) extension that makes price tracking near real time. When you open a
product page on a supported store it:

1. reads the page's schema.org `Product`/`Offer` JSON-LD (or `og:price` tags) to show the price in its popup;
2. calls `POST /products/observe` with the page URL. If that page is a tracked listing the API queues
   `worker.prices.check_listing` right away (at most once a minute per listing), so the new price,
   history row, alerts and the `/ws/prices` live update happen within seconds instead of at the next
   scheduled check;
3. offers **Track this product** (`POST /products/track`) for pages the server can read but isn't tracking yet.

The price read in the browser is never saved. The worker fetches the page itself, so a tampered
extension can't forge a price drop or fire anyone's alerts.

The toolbar badge shows what happened on the current tab: `↻` re-check queued, `✓` checked in the
last minute, `+` can be tracked, `!` signed out.

## Install (development)

1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, pick this folder.
2. Open the extension's **Options**, set the API URL (default `http://localhost:8000`) and web app URL
   (default `http://localhost:5173`), and sign in with your VilaiWatch account.
3. Open a product page from a store listed in `content_scripts.matches` in `manifest.json`.

## Stores

The content script only runs on the hosts in `manifest.json` (the demo store on `localhost:8008`, plus
Croma, Reliance Digital and Tata CLiQ as a starting point). The server must list the same stores in
`PRICE_JSONLD_STORES`, for example:

```bash
PRICE_JSONLD_STORES=croma=www.croma.com,reliance=www.reliancedigital.in,tatacliq=www.tatacliq.com
```

Before relying on a store, check that its product pages publish an INR `Offer` in `application/ld+json`
and that its robots.txt allows the pages (see docs/price-tracking.md, "Using real stores"). To add a
store, add its host to both places and reload the extension.
