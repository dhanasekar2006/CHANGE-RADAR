import { expect, test } from "@playwright/test";

test("shows an error for invalid credentials", async ({ page }) => {
  await page.goto("/login");

  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Invalid email or password.")).toBeVisible();
});

test("redirects unauthenticated users to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
