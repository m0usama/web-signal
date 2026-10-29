import { expect, type Page } from "@playwright/test";

export const PASSWORD = "test-password-123";
export const NOVA = "nova";
export const NIGHT = "night";
export const STRANGER = "stranger";
export const ROBO = "robo";

export async function login(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("USERNAME").fill(username);
  await page.getByLabel("PASSWORD").fill(PASSWORD);
  await page.getByRole("button", { name: /JACK IN/ }).click();
  const failed = page.locator(".form-error");
  await Promise.race([page.waitForURL((u) => u.pathname === "/"), failed.waitFor({ timeout: 30_000 })]);
  if (await failed.isVisible()) {
    const detail = await page.locator(".login-detail").textContent().catch(() => "");
    throw new Error(`Login failed for ${username}: ${await failed.textContent()} ${detail ?? ""}`);
  }
}

/** Gets past the intro and the sound prompt. */
export async function enterApp(page: Page) {
  const skip = page.getByRole("button", { name: /SKIP/ });
  // The intro may finish on its own while we reach for SKIP, so never wait long on it.
  if (await skip.waitFor({ timeout: 4000 }).then(() => true, () => false)) await skip.click({ timeout: 2000 }).catch(() => {});
  const notNow = page.getByRole("button", { name: "NOT NOW" });
  if (await notNow.waitFor({ timeout: 5000 }).then(() => true, () => false)) await notNow.click({ timeout: 3000 }).catch(() => {});
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.getByText("LINK OK")).toBeVisible({ timeout: 20_000 });
}

export async function openTab(page: Page, name: "MAP" | "COMMS" | "SIGNALS" | "PLAY" | "PROFILE") {
  const label = name === "PROFILE" ? "ME" : name;
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("button", { name: new RegExp(`(^|\\s)${label}(\\s|$)`) })
    .click();
}

/** A tiny valid PNG (4x4 magenta), generated in memory. */
export function tinyPng(): Buffer {
  return Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEklEQVR4nGP4z8DwHwyYGBgAABkHAgvTb3wAAAAASUVORK5CYII=",
    "base64",
  );
}
