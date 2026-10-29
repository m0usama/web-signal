import { expect, test } from "@playwright/test";
import { enterApp, login, NIGHT, NOVA, openTab } from "./helpers";

test("v2: moods, daily spark, rooftop tic-tac-toe and a walkie-talkie voice note", async ({ browser }) => {
  test.setTimeout(240_000);
  const opts = { reducedMotion: "reduce" as const, permissions: ["microphone"] };
  const nova = await (await browser.newContext(opts)).newPage();
  const night = await (await browser.newContext({ ...opts, viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();

  await login(nova, NOVA);
  await enterApp(nova);
  await login(night, NIGHT);
  await enterApp(night);
  await expect(nova.locator(".avatar-pin.them.online .pin-name")).toBeVisible({ timeout: 20_000 });

  // Mood: Night sets "IN LOVE", Nova sees it above Night's avatar.
  await openTab(night, "SIGNALS");
  await night.getByRole("button", { name: /IN LOVE/ }).click();
  await expect(nova.locator(".avatar-pin.them .mood-bubble")).toHaveText("🥰");

  // Daily spark: Nova's answer stays hidden from Night until Night answers.
  await openTab(nova, "SIGNALS");
  await nova.getByLabel("Your answer").fill("rooftop pizza at midnight");
  await nova.getByRole("button", { name: "LOCK IN" }).click();
  await expect(nova.getByText("WAITING FOR THEIR ANSWER…")).toBeVisible();
  await expect(night.getByText("rooftop pizza at midnight")).toHaveCount(0);
  await night.getByLabel("Your answer").fill("sunset by the river");
  await night.getByRole("button", { name: "LOCK IN" }).click();
  await expect(night.getByText("rooftop pizza at midnight")).toBeVisible();
  await expect(nova.getByText("sunset by the river")).toBeVisible({ timeout: 15_000 });

  // Rooftop tic-tac-toe: Nova (X) wins across the top row.
  await openTab(nova, "PLAY");
  await openTab(night, "PLAY");
  const novaCell = (i: number) => nova.getByRole("gridcell").nth(i);
  const nightCell = (i: number) => night.getByRole("gridcell").nth(i);
  await nova.getByRole("button", { name: /NEW GAME|REMATCH/ }).click();
  await novaCell(0).click();
  await expect(night.getByText("YOUR MOVE")).toBeVisible({ timeout: 15_000 });
  await nightCell(4).click();
  await expect(nova.getByText("YOUR MOVE")).toBeVisible({ timeout: 15_000 });
  await novaCell(1).click();
  await expect(night.getByText("YOUR MOVE")).toBeVisible({ timeout: 15_000 });
  await nightCell(8).click();
  await expect(nova.getByText("YOUR MOVE")).toBeVisible({ timeout: 15_000 });
  await novaCell(2).click();
  await expect(nova.getByText("YOU WIN! 🏆")).toBeVisible();
  await expect(night.getByText(/WINS!/)).toBeVisible({ timeout: 15_000 });

  // Voice note: hold TALK for ~1.5s, release; Night receives a voice signal.
  await openTab(nova, "COMMS");
  await openTab(night, "COMMS");
  const talk = nova.getByRole("button", { name: "Hold to record a voice note" });
  const box = (await talk.boundingBox())!;
  await nova.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await nova.mouse.down();
  await expect(nova.locator(".rec-overlay")).toBeVisible({ timeout: 10_000 });
  await nova.waitForTimeout(1600);
  await nova.mouse.up();
  await expect(night.locator(".voice-note")).toBeVisible({ timeout: 20_000 });
  await expect(night.locator(".voice-note .voice-play")).toBeEnabled();

  await nova.context().close();
  await night.context().close();
});
