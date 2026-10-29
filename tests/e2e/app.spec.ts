import { expect, test } from "@playwright/test";
import { enterApp, login, NIGHT, NOVA, openTab, PASSWORD, STRANGER, tinyPng } from "./helpers";

test("logged-out visitors only see the login screen @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("button", { name: /JACK IN/ })).toBeVisible();
});

test("wrong password is rejected @smoke", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("EMAIL").fill(NOVA);
  await page.getByLabel("PASSWORD").fill("not-the-password");
  await page.getByRole("button", { name: /JACK IN/ }).click();
  await page.locator(".form-error").waitFor();
  const detail = await page.locator(".login-detail").textContent({ timeout: 1000 }).catch(() => "");
  expect(await page.locator(".form-error").textContent(), `login detail: ${detail}`).toMatch(/WRONG EMAIL OR PASSWORD/);
});

test("media API refuses anonymous requests", async ({ request }) => {
  const res = await request.post("/api/media", { data: { type: "message", id: "00000000-0000-0000-0000-000000000000" } });
  expect(res.status()).toBe(401);
});

test("cleanup endpoint needs the cron secret", async ({ request }) => {
  const res = await request.get("/api/cleanup");
  expect(res.status()).toBe(401);
});

test("an account outside the pair sees no room", async ({ page }) => {
  await login(page, STRANGER);
  await expect(page.getByText("NO SIGNAL PAIRED")).toBeVisible();
});

test("the map loads on a phone @smoke", async ({ page }) => {
  await login(page, NOVA);
  await enterApp(page);
  await expect(page.locator(".avatar-pin.me .pin-name")).toBeVisible();
  await expect(page.locator(".avatar-pin.them .pin-name")).toBeVisible();
  await expect(page.getByRole("button", { name: "Zoom in" })).toBeVisible();
});

test("two people: presence, messages, pokes, drops and a ghost photo", async ({ browser }) => {
  const nova = await (await browser.newContext()).newPage();
  const night = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();

  await login(nova, NOVA);
  await enterApp(nova);
  await login(night, NIGHT);
  await enterApp(night);

  // Presence: each sees the other online.
  await expect(nova.locator(".avatar-pin.them.online .pin-name")).toBeVisible({ timeout: 20_000 });
  await expect(night.locator(".avatar-pin.them.online .pin-name")).toBeVisible({ timeout: 20_000 });

  // Text both ways.
  await openTab(nova, "COMMS");
  await openTab(night, "COMMS");
  await nova.getByLabel("Message", { exact: true }).fill("hello from nova");
  await nova.getByRole("button", { name: "SEND" }).click();
  await expect(night.getByText("hello from nova")).toBeVisible();
  await night.getByLabel("Message", { exact: true }).fill("hey nova 💜");
  await night.keyboard.press("Enter");
  await expect(nova.getByText("hey nova 💜")).toBeVisible();
  // Read receipt on Nova's message once Night has the chat open.
  await expect(nova.locator(".tag-seen")).toBeVisible();

  // Poke: Night sends a heart from the map, Nova gets the shout.
  await openTab(nova, "MAP");
  await openTab(night, "MAP");
  await night.getByRole("button", { name: "Send a heart" }).click();
  await expect(nova.getByText("HEY YOU!").first()).toBeVisible();

  // Signal drop: Nova drops a note, Night opens it.
  await nova.getByRole("button", { name: "▼ DROP" }).click();
  const box = await nova.locator(".map-viewport").boundingBox();
  await nova.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await nova.getByLabel("Note").fill("meet me on this roof");
  await nova.getByRole("button", { name: /DROP IT/ }).click();
  await expect(nova.getByText("SIGNAL DROPPED ON THE MAP")).toBeVisible();
  const marker = night.locator(".drop-marker.theirs");
  await expect(marker).toBeVisible();
  await marker.click();
  await expect(night.getByText("meet me on this roof")).toBeVisible();
  await night.getByRole("button", { name: "CLOSE" }).click();
  await expect(nova.getByText(/OPENED YOUR DROP/)).toBeVisible();

  // Ghost photo: one look, then gone for good.
  await openTab(nova, "COMMS");
  await openTab(night, "COMMS");
  await nova.getByRole("button", { name: "Change signal mode" }).click(); // 24H
  await nova.getByRole("button", { name: "Change signal mode" }).click(); // GHOST
  await nova.getByLabel("Ghost viewing time").selectOption("5");
  await nova.locator('input[type="file"]').first().setInputFiles({ name: "ghost.png", mimeType: "image/png", buffer: tinyPng() });
  await expect(nova.getByText("GHOST PHOTO SENT")).toBeVisible();
  const reveal = night.getByRole("button", { name: /TAP TO REVEAL/ });
  await expect(reveal).toBeVisible();
  await reveal.click();
  await expect(night.getByAltText("Signal media")).toBeVisible();
  await expect(night.getByText(/POOF/)).toBeVisible({ timeout: 15_000 });
  await expect(night.getByRole("button", { name: /TAP TO REVEAL/ })).toHaveCount(0, { timeout: 15_000 });
  await expect(nova.getByText("GHOST PHOTO SENT")).toHaveCount(0, { timeout: 15_000 });

  // Tune: Night turns sound on; Nova presses TUNE; it plays once on Night's side,
  // Nova's button animates while it plays and stops when it ends.
  await openTab(night, "PROFILE");
  await night.getByRole("button", { name: /ENABLE SIGNAL SOUND/ }).click();
  await openTab(night, "MAP");
  await openTab(nova, "MAP");
  await nova.getByRole("button", { name: /Play our tune/ }).click();
  await expect(night.locator(".tune-banner")).toBeVisible({ timeout: 15_000 });
  await expect(nova.locator(".tune-btn.status-playing").first()).toBeVisible({ timeout: 15_000 });
  await expect(night.locator(".tune-banner")).toHaveCount(0, { timeout: 30_000 });
  await expect(nova.locator(".tune-btn.status-idle").first()).toBeVisible({ timeout: 15_000 });

  await nova.context().close();
  await night.context().close();
});

test("sign out returns to the login screen", async ({ page }) => {
  await login(page, NIGHT);
  await enterApp(page);
  await openTab(page, "PROFILE");
  await page.getByRole("button", { name: /SIGN OUT/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  expect(PASSWORD).toBeTruthy();
});
