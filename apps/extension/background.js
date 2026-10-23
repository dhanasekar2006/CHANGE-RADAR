/* global apiPost */
importScripts("api.js");

const BADGES = {
  queued: { text: "↻", color: "#2563eb" },
  fresh: { text: "✓", color: "#16a34a" },
  untracked: { text: "+", color: "#6b7280" },
  signed_out: { text: "!", color: "#d97706" },
};

// Remembered per tab so the popup can show what happened on this page.
async function remember(tabId, entry) {
  await chrome.storage.session.set({ [`tab:${tabId}`]: entry });
  const badge = BADGES[entry.status === "untracked" && !entry.supported ? "" : entry.status];
  await chrome.action.setBadgeText({ tabId, text: badge ? badge.text : "" });
  if (badge) await chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type !== "observe" || !sender.tab) return;
  const tabId = sender.tab.id;
  const base = { url: message.url, product: message.product };
  apiPost("/products/observe", { url: message.url })
    .then((result) => remember(tabId, { ...base, ...result }))
    .catch((error) =>
      remember(tabId, { ...base, status: error.message === "signed_out" ? "signed_out" : "error", error: error.message }),
    );
});

chrome.tabs.onRemoved.addListener((tabId) => chrome.storage.session.remove(`tab:${tabId}`));
