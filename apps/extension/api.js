// Talks to the VilaiWatch API with the tokens saved on the options page.
// Shared by the background worker (importScripts) and the popup (<script>).
const DEFAULTS = { apiUrl: "http://localhost:8000", webUrl: "http://localhost:5173" };

async function getSettings() {
  return { ...DEFAULTS, ...(await chrome.storage.local.get(["apiUrl", "webUrl", "accessToken", "refreshToken"])) };
}

async function saveTokens({ access_token, refresh_token }) {
  await chrome.storage.local.set({ accessToken: access_token, refreshToken: refresh_token });
}

async function refreshTokens(settings) {
  if (!settings.refreshToken) return false;
  const response = await fetch(`${settings.apiUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: settings.refreshToken }),
  });
  if (!response.ok) {
    await chrome.storage.local.remove(["accessToken", "refreshToken"]);
    return false;
  }
  await saveTokens(await response.json());
  return true;
}

// POST `body` to `path` as the signed-in user, refreshing the access token once on 401.
async function apiPost(path, body, retried = false) {
  const settings = await getSettings();
  if (!settings.accessToken) throw new Error("signed_out");
  const response = await fetch(`${settings.apiUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${settings.accessToken}` },
    body: JSON.stringify(body),
  });
  if (response.status === 401 && !retried && (await refreshTokens(settings))) {
    return apiPost(path, body, true);
  }
  if (response.status === 401) throw new Error("signed_out");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || response.statusText);
  return data;
}
