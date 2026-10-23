/* global getSettings, saveTokens */
const $ = (id) => document.getElementById(id);

getSettings().then((settings) => {
  $("apiUrl").value = settings.apiUrl;
  $("webUrl").value = settings.webUrl;
  $("message").textContent = settings.accessToken ? "Signed in." : "Not signed in.";
});

$("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const apiUrl = $("apiUrl").value.replace(/\/+$/, "");
  const webUrl = $("webUrl").value.replace(/\/+$/, "");

  // The extension may only call hosts it has permission for; ask for a non-default API host.
  const origin = `${new URL(apiUrl).origin}/*`;
  if (!(await chrome.permissions.request({ origins: [origin] }))) {
    $("message").textContent = `Permission to reach ${origin} was refused.`;
    return;
  }
  await chrome.storage.local.set({ apiUrl, webUrl });
  if (!$("email").value) {
    $("message").textContent = "Saved.";
    return;
  }

  const response = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: $("email").value, password: $("password").value }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    $("message").textContent = body.message || "Sign-in failed.";
    return;
  }
  await saveTokens(body);
  $("password").value = "";
  $("message").textContent = "Signed in. Open a product page to try it.";
});
