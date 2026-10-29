import { expect, test } from "@playwright/test";
import { enterApp, login, NIGHT, NOVA, openTab } from "./helpers";

test("v5: spidey-cam takes a red/blue pixel snap and sends it", async ({ browser }) => {
  test.setTimeout(150_000);
  const opts = { reducedMotion: "reduce" as const, permissions: ["camera"] };
  const nova = await (await browser.newContext({ ...opts, viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  const night = await (await browser.newContext(opts)).newPage();
  await login(nova, NOVA);
  await enterApp(nova);
  await login(night, NIGHT);
  await enterApp(night);
  await openTab(nova, "COMMS");
  await openTab(night, "COMMS");

  await nova.getByRole("button", { name: "Open Spidey-Cam" }).click();
  const cam = nova.getByRole("dialog", { name: "Spidey-Cam" });
  await expect(cam.getByRole("button", { name: "Take snap" })).toBeEnabled({ timeout: 15_000 });

  // The live preview only ever contains palette colours (red / blue / ink / pale).
  await nova.waitForTimeout(800);
  const colours = await nova.evaluate(() => {
    const c = document.querySelector<HTMLCanvasElement>(".cam-canvas")!;
    const d = c.getContext("2d")!.getImageData(c.width / 2 - 40, c.height / 2 - 40, 80, 80).data;
    const set = new Set<string>();
    for (let i = 0; i < d.length; i += 4) set.add(`${d[i]},${d[i + 1]},${d[i + 2]}`);
    return [...set];
  });
  const allowed = new Set(["6,10,36", "19,46,140", "47,107,255", "215,38,61", "255,107,122", "255,241,243"]);
  expect(colours.length).toBeGreaterThan(0);
  expect(colours.every((c) => allowed.has(c)), `colours: ${colours.join(" ")}`).toBe(true);

  await cam.getByRole("button", { name: "Change frame" }).click(); // THWIP!
  await cam.getByRole("button", { name: "Take snap" }).click();
  await expect(cam.getByText("SNAP READY")).toBeVisible();
  await cam.getByRole("button", { name: "↺ RETAKE" }).click();
  await expect(cam.getByRole("button", { name: "Take snap" })).toBeEnabled({ timeout: 15_000 });
  await cam.getByRole("button", { name: "Flip camera" }).click();
  await expect(cam.getByRole("button", { name: "Take snap" })).toBeEnabled({ timeout: 15_000 });
  await cam.getByRole("button", { name: "Take snap" }).click();
  await cam.getByRole("button", { name: "● KEEP" }).click();
  await cam.getByRole("button", { name: /SEND SNAP/ }).click();
  await expect(cam).toHaveCount(0, { timeout: 20_000 });

  // Night receives it as a photo in the chat.
  await expect(night.locator(".media-thumb img").last()).toBeVisible({ timeout: 20_000 });

  await nova.context().close();
  await night.context().close();
});
