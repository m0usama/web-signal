import { expect, test } from "@playwright/test";
import { enterApp, login, NIGHT, NOVA, openTab, tinyPng } from "./helpers";

test("v4: photo drops show for 10s per open, drop owners, everyone on the map, doodle undo/redo, sound choice remembered", async ({ browser }) => {
  test.setTimeout(200_000);
  const opts = { reducedMotion: "reduce" as const };
  const nova = await (await browser.newContext(opts)).newPage();
  const night = await (await browser.newContext({ ...opts, viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();

  await login(nova, NOVA);
  await enterApp(nova); // answers the sound question with NOT NOW
  await login(night, NIGHT);
  await enterApp(night);

  // The sound choice is remembered: no question after reopening the app.
  await nova.reload();
  await expect(nova.getByRole("navigation", { name: "Main" })).toBeVisible();
  await nova.waitForTimeout(2500);
  await expect(nova.getByRole("button", { name: "NOT NOW" })).toHaveCount(0);

  // Everyone Nova chats with is on the map, not just the open chat's person.
  await expect(nova.locator(".avatar-pin.them .pin-name")).toBeVisible({ timeout: 20_000 });
  await expect(nova.locator(".avatar-pin.other .pin-name")).toContainText(/R\.O\.B\.O/);

  // Photo drop from Night; the marker says who it's from.
  await night.getByRole("button", { name: "▼ DROP", exact: true }).click();
  const box = await night.locator(".map-viewport").boundingBox();
  await night.mouse.click(box!.x + box!.width * (0.3 + Math.random() * 0.1), box!.y + box!.height * (0.55 + Math.random() * 0.1));
  await night.locator(".drop-sheet input[type=file]").setInputFiles({ name: "roof.png", mimeType: "image/png", buffer: tinyPng() });
  await expect(night.getByAltText("Photo for this drop")).toBeVisible();
  await expect(night.getByText(/shows for 10 seconds each time/)).toBeVisible();
  await night.getByRole("button", { name: /DROP IT/ }).click();
  await expect(night.getByText("SIGNAL DROPPED ON THE MAP")).toBeVisible();
  await expect(nova.locator(".drop-marker.theirs .drop-tag", { hasText: /FROM NIGHT/i }).first()).toBeAttached({ timeout: 15_000 });

  // Nova opens it: the photo shows with a 10s countdown, then fades; reopening shows it again.
  await openTab(nova, "SIGNALS");
  const openIt = () => nova.locator(".drop-row.theirs").first().getByRole("button", { name: "OPEN" }).click();
  await openIt();
  await expect(nova.getByAltText("Signal media")).toBeVisible({ timeout: 15_000 });
  await expect(nova.locator(".reveal-count")).toBeVisible();
  await expect(nova.getByText("PHOTO FADED")).toBeVisible({ timeout: 15_000 });
  await expect(nova.getByAltText("Signal media")).toHaveCount(0);
  await nova.getByRole("button", { name: "CLOSE", exact: true }).click();
  await openIt();
  await expect(nova.getByAltText("Signal media")).toBeVisible({ timeout: 15_000 });
  await nova.getByRole("button", { name: "CLOSE", exact: true }).click();

  // Doodle: draw a stroke, undo it, redo it.
  await openTab(nova, "PLAY");
  const pad = nova.getByLabel("Shared drawing pad");
  const r = (await pad.boundingBox())!;
  await nova.mouse.move(r.x + r.width * 0.2, r.y + r.height * 0.2);
  await nova.mouse.down();
  await nova.mouse.move(r.x + r.width * 0.6, r.y + r.height * 0.5, { steps: 8 });
  await nova.mouse.up();
  const undo = nova.getByRole("button", { name: "Undo" });
  const redo = nova.getByRole("button", { name: "Redo" });
  await expect(undo).toBeEnabled();
  await expect(redo).toBeDisabled();
  await undo.click();
  await expect(undo).toBeDisabled();
  await expect(redo).toBeEnabled();
  await redo.click();
  await expect(undo).toBeEnabled();

  await nova.context().close();
  await night.context().close();
});
