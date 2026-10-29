import { expect, type Page } from "@playwright/test";

export const PASSWORD = "test-password-123";
export const NOVA = "nova@test.local";
export const NIGHT = "night@test.local";
export const STRANGER = "stranger@test.local";

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("EMAIL").fill(email);
  await page.getByLabel("PASSWORD").fill(PASSWORD);
  await page.getByRole("button", { name: /JACK IN/ }).click();
  const failed = page.locator(".form-error");
  await Promise.race([page.waitForURL((u) => u.pathname === "/"), failed.waitFor({ timeout: 30_000 })]);
  if (await failed.isVisible()) {
    const detail = await page.locator(".login-detail").textContent().catch(() => "");
    throw new Error(`Login failed for ${email}: ${await failed.textContent()} ${detail ?? ""}`);
  }
}

/** Gets past the intro and the sound prompt. */
export async function enterApp(page: Page) {
  const skip = page.getByRole("button", { name: /SKIP/ });
  if (await skip.waitFor({ timeout: 4000 }).then(() => true, () => false)) await skip.click();
  const notNow = page.getByRole("button", { name: "NOT NOW" });
  if (await notNow.waitFor({ timeout: 4000 }).then(() => true, () => false)) await notNow.click();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.getByText("LINK OK")).toBeVisible({ timeout: 20_000 });
}

export async function openTab(page: Page, name: "MAP" | "COMMS" | "SIGNALS" | "PROFILE") {
  await page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: new RegExp(name) }).click();
}

/** A tiny valid PNG (4x4 magenta), generated in memory. */
export function tinyPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEklEQVR4nGP4z8DwHwyYGBgAABkHAgvTb3wAAAAASUVORK5CYII=",
    "base64",
  );
}
