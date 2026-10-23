// On a product page, tell the background worker which page this is so a tracked
// listing is re-checked now instead of at its next scheduled check.
/* global readProduct */
const product = readProduct(document);
if (product) {
  chrome.runtime.sendMessage({ type: "observe", url: location.href, product });
}
