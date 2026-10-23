// Reads the page's own schema.org Product (JSON-LD), falling back to Open Graph price tags.
// Only used to show the price in the popup; the server re-reads the page itself before
// anything is saved, so this never needs to match its parser exactly.
// eslint-disable-next-line no-unused-vars
function readProduct(doc) {
  const typeOf = (node) => [].concat(node["@type"] || []).map(String);

  function* nodes(data, depth = 0) {
    if (depth > 6 || data === null || typeof data !== "object") return;
    if (Array.isArray(data)) {
      for (const item of data) yield* nodes(item, depth + 1);
      return;
    }
    yield data;
    for (const key of ["@graph", "mainEntity"]) if (data[key]) yield* nodes(data[key], depth + 1);
  }

  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    let data;
    try {
      data = JSON.parse(script.textContent);
    } catch {
      continue;
    }
    for (const node of nodes(data)) {
      if (!typeOf(node).includes("Product")) continue;
      const offers = [].concat(node.offers || []).flatMap((o) => (o && o.offers ? [].concat(o.offers) : [o]));
      const priced = offers
        .map((o) => ({
          price: Number(String(o.price ?? o.lowPrice ?? "").replace(/,/g, "")),
          currency: o.priceCurrency || null,
          inStock: !/OutOfStock|SoldOut|Discontinued/i.test(String(o.availability || "")),
        }))
        .filter((o) => Number.isFinite(o.price) && o.price > 0);
      if (!priced.length) continue;
      const best = priced.filter((o) => o.inStock).sort((a, b) => a.price - b.price)[0] || priced[0];
      return { name: node.name || doc.title, ...best };
    }
  }

  const meta = (name) =>
    doc.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.getAttribute("content") || null;
  const amount = Number((meta("product:price:amount") || meta("og:price:amount") || "").replace(/,/g, ""));
  if (Number.isFinite(amount) && amount > 0) {
    return {
      name: meta("og:title") || doc.title,
      price: amount,
      currency: meta("product:price:currency") || meta("og:price:currency"),
      inStock: !/out ?of ?stock/i.test(meta("product:availability") || meta("og:availability") || ""),
    };
  }
  return null;
}
