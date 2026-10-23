/* global apiPost, getSettings */
const $ = (id) => document.getElementById(id);
const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);

const MESSAGES = {
  queued: "Tracked. Checking the latest price now; open VilaiWatch to see it update live.",
  fresh: "Tracked. Price was checked in the last minute.",
  untracked: "Not tracked yet.",
  signed_out: "Sign in on the options page to use VilaiWatch.",
};

function button(label, onClick) {
  const el = document.createElement("button");
  el.textContent = label;
  el.addEventListener("click", onClick);
  $("actions").replaceChildren(el);
  return el;
}

async function link(label, productId) {
  const { webUrl } = await getSettings();
  const el = document.createElement("a");
  el.className = "button";
  el.textContent = label;
  el.href = `${webUrl}/prices/p/${productId}`;
  el.target = "_blank";
  $("actions").replaceChildren(el);
}

async function render() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const entry = tab && (await chrome.storage.session.get(`tab:${tab.id}`))[`tab:${tab.id}`];
  if (!entry) return;

  if (entry.product) {
    $("name").textContent = entry.product.name;
    $("price").textContent = inr(entry.product.price) + (entry.product.inStock ? "" : " (out of stock)");
  }
  $("status").textContent =
    entry.status === "untracked" && !entry.supported
      ? "This store isn't set up on your VilaiWatch server (PRICE_JSONLD_STORES)."
      : MESSAGES[entry.status] || `Couldn't reach VilaiWatch: ${entry.error}`;

  if (entry.status === "signed_out") {
    button("Open options", () => chrome.runtime.openOptionsPage());
  } else if (entry.product_id) {
    await link("Open in VilaiWatch", entry.product_id);
  } else if (entry.status === "untracked" && entry.supported) {
    const el = button("Track this product", async () => {
      el.disabled = true;
      $("status").textContent = "Adding…";
      try {
        const product = await apiPost("/products/track", { url: entry.url });
        await chrome.storage.session.set({ [`tab:${tab.id}`]: { ...entry, status: "fresh", product_id: product.id } });
        $("status").textContent = "Now tracking. Set a target price in VilaiWatch to get alerts.";
        await link("Open in VilaiWatch", product.id);
      } catch (error) {
        el.disabled = false;
        $("status").textContent = error.message === "signed_out" ? MESSAGES.signed_out : error.message;
      }
    });
  }
}

render();
