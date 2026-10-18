#!/usr/bin/env python
"""A tiny fake store you control, for demoing live price updates.

    python scripts/demo_store.py            # serves http://localhost:8008

Product pages use the markup the `demo` price adapter reads. Change a price
from the index page (or `curl "localhost:8008/set?slug=sony-wh1000xm5&price=22990"`)
and the next worker check picks it up and pushes it to the open browser.

From inside Docker the worker reaches this server at
http://host.docker.internal:8008 (see scripts/seed_prices.py --base-url).
"""
from __future__ import annotations

import argparse
import html
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

PRODUCTS: dict[str, dict] = {
    "sony-wh1000xm5": {"name": "Sony WH-1000XM5 Wireless Headphones", "price": 24990, "in_stock": True},
    "iphone-15-128gb": {"name": "Apple iPhone 15 (128 GB)", "price": 69900, "in_stock": True},
    "samsung-s24-256gb": {"name": "Samsung Galaxy S24 (256 GB)", "price": 74999, "in_stock": True},
}

ROBOTS = "User-agent: *\nAllow: /\n"


def fmt(amount: int | float) -> str:
    """Indian digit grouping: 129999 -> 1,29,999."""
    whole = f"{int(amount)}"
    head, tail = whole[:-3], whole[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return ",".join([*groups, tail])


def product_page(slug: str, item: dict) -> str:
    stock = "In stock" if item["in_stock"] else "Currently unavailable"
    return f"""<!doctype html>
<html><head><title>{html.escape(item['name'])} | Demo Store</title></head>
<body>
  <h1>{html.escape(item['name'])}</h1>
  <p>Price: <span id="price" data-price="{item['price']:.2f}">₹{fmt(item['price'])}</span></p>
  <p id="availability" data-in-stock="{str(item['in_stock']).lower()}">{stock}</p>
  <p><a href="/">All products</a></p>
</body></html>"""


def index_page() -> str:
    rows = []
    for slug, item in PRODUCTS.items():
        rows.append(
            f"""<tr>
  <td><a href="/p/{slug}">{html.escape(item['name'])}</a></td>
  <td>₹{fmt(item['price'])}</td>
  <td>{'in stock' if item['in_stock'] else 'out of stock'}</td>
  <td>
    <form action="/set" method="get">
      <input type="hidden" name="slug" value="{slug}">
      <input name="price" size="8" value="{item['price']}">
      <label><input type="checkbox" name="stock" value="1" {'checked' if item['in_stock'] else ''}> in stock</label>
      <button>Update</button>
    </form>
  </td>
</tr>"""
        )
    return f"""<!doctype html>
<html><head><title>Demo Store</title>
<style>body{{font-family:system-ui;margin:2rem}}td{{padding:.4rem .8rem}}</style></head>
<body><h1>Demo Store</h1>
<p>Change a price here; the worker's next check publishes it live.</p>
<table>{''.join(rows)}</table></body></html>"""


class Handler(BaseHTTPRequestHandler):
    def _send(self, body: str, status: int = 200, content_type: str = "text/html; charset=utf-8") -> None:
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:  # noqa: N802 - http.server API
        url = urlparse(self.path)
        if url.path == "/robots.txt":
            self._send(ROBOTS, content_type="text/plain")
        elif url.path == "/":
            self._send(index_page())
        elif url.path.startswith("/p/") and url.path[3:] in PRODUCTS:
            slug = url.path[3:]
            self._send(product_page(slug, PRODUCTS[slug]))
        elif url.path == "/set":
            query = parse_qs(url.query)
            slug = query.get("slug", [""])[0]
            if slug not in PRODUCTS:
                return self._send("unknown product", 404, "text/plain")
            try:
                PRODUCTS[slug]["price"] = float(query["price"][0]) if "price" in query else PRODUCTS[slug]["price"]
            except ValueError:
                return self._send("bad price", 400, "text/plain")
            PRODUCTS[slug]["in_stock"] = query.get("stock", ["1" if "price" not in query else ""])[0] == "1"
            print(f"set {slug}: price={PRODUCTS[slug]['price']} in_stock={PRODUCTS[slug]['in_stock']}")
            self.send_response(303)
            self.send_header("Location", "/")
            self.end_headers()
        else:
            self._send("not found", 404, "text/plain")

    def log_message(self, fmt: str, *args) -> None:  # quieter than the default
        print(f"{self.address_string()} {fmt % args}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--host", default="0.0.0.0", help="0.0.0.0 so Docker containers can reach it")
    parser.add_argument("--port", type=int, default=8008)
    args = parser.parse_args()
    print(f"Demo store on http://localhost:{args.port}  (Ctrl+C to stop)")
    ThreadingHTTPServer((args.host, args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
