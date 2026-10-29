import { expect, test } from "@playwright/test";
import { enterApp, login, NIGHT, NOVA, openLandmark } from "./helpers";

test("v7: City Quests — landmarks, Web Four, trivia, This or That, secret word, hot & cold, pigeon pairs, race", async ({ browser }) => {
  test.setTimeout(300_000);
  const opts = { reducedMotion: "reduce" as const };
  const nova = await (await browser.newContext(opts)).newPage();
  const night = await (await browser.newContext({ ...opts, viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  await login(nova, NOVA);
  await enterApp(nova);
  await login(night, NIGHT);
  await enterApp(night);

  // No PLAY tab any more; nine landmarks on the map instead.
  await expect(nova.getByRole("navigation", { name: "Main" }).getByRole("button", { name: /PLAY/ })).toHaveCount(0);
  await expect(nova.locator(".landmark")).toHaveCount(9);

  // ---- Web Four: Nova stacks four in column 1
  let a = await openLandmark(nova, "ROOFTOP 23");
  let b = await openLandmark(night, "ROOFTOP 23");
  await a.getByRole("button", { name: /NEW GAME|REMATCH/ }).click();
  for (let i = 0; i < 3; i++) {
    await a.getByRole("button", { name: "Drop in column 1" }).click();
    await expect(b.getByText(/YOUR MOVE/)).toBeVisible({ timeout: 15_000 });
    await b.getByRole("button", { name: "Drop in column 2" }).click();
    await expect(a.getByText(/YOUR MOVE/)).toBeVisible({ timeout: 15_000 });
  }
  await a.getByRole("button", { name: "Drop in column 1" }).click();
  await expect(a.getByText(/YOU WIN/)).toBeVisible();
  await expect(b.getByText(/WINS!/)).toBeVisible({ timeout: 15_000 });
  await expect(a.locator(".hero-side b").first()).not.toHaveText("0", { timeout: 15_000 });
  await a.getByRole("button", { name: "Close" }).click();
  await b.getByRole("button", { name: "Close" }).click();

  // ---- Daily trivia: answers stay hidden until you've played
  a = await openLandmark(nova, "THE DAILY SIGNAL");
  for (let i = 0; i < 5; i++) {
    await a.locator(".trivia-option").first().click();
    await nova.waitForTimeout(1000);
  }
  await a.getByRole("button", { name: /LOCK IN MY SCORE/ }).click();
  await expect(a.getByText(/WAITING FOR/)).toBeVisible();
  b = await openLandmark(night, "THE DAILY SIGNAL");
  await expect(b.getByText(/already played today/)).toBeVisible({ timeout: 15_000 });
  for (let i = 0; i < 5; i++) {
    await b.locator(".trivia-option").nth(1).click();
    await night.waitForTimeout(1000);
  }
  await b.getByRole("button", { name: /LOCK IN MY SCORE/ }).click();
  await expect(b.locator(".score-chip")).toHaveCount(2);
  await expect(a.locator(".score-chip")).toHaveCount(2, { timeout: 15_000 });
  await a.getByRole("button", { name: "Close" }).click();
  await b.getByRole("button", { name: "Close" }).click();

  // ---- This or That: both pick, see how in sync
  for (const [p, pick] of [[nova, ".tot-card.left"], [night, ".tot-card.left"]] as const) {
    const s = await openLandmark(p, "NIGHT-OWL DINER");
    for (let i = 0; i < 8; i++) await s.locator(pick).click();
    await s.getByRole("button", { name: /LOCK IN MY PICKS/ }).click();
  }
  await expect(night.getByText("100% IN SYNC")).toBeVisible({ timeout: 15_000 });
  await expect(nova.getByText("100% IN SYNC")).toBeVisible({ timeout: 15_000 });
  await nova.getByRole("dialog", { name: "NIGHT-OWL DINER" }).getByRole("button", { name: "Close" }).click();
  await night.getByRole("dialog", { name: "NIGHT-OWL DINER" }).getByRole("button", { name: "Close" }).click();

  // ---- Secret word: Nova hides WEB, Night guesses it
  a = await openLandmark(nova, "CANDY CRATER");
  b = await openLandmark(night, "CANDY CRATER");
  if (await a.getByRole("button", { name: /SET A NEW WORD/ }).isVisible()) await a.getByRole("button", { name: /SET A NEW WORD/ }).click();
  await a.getByLabel("Secret word").fill("web");
  await a.getByRole("button", { name: /HIDE IT IN THE CRATER/ }).click();
  await expect(b.getByText("GUESS A LETTER", { exact: false })).toBeVisible({ timeout: 15_000 });
  for (const l of ["W", "Z", "E"]) {
    await b.getByRole("button", { name: `Letter ${l}` }).click();
    await expect(b.getByRole("button", { name: `Letter ${l}` })).toBeDisabled();
  }
  await b.getByRole("button", { name: "Letter B" }).click(); // last letter: the keyboard goes away
  await expect(b.getByText(/YOU CRACKED IT/)).toBeVisible();
  await expect(a.getByText(/CRACKED IT!/)).toBeVisible({ timeout: 15_000 });
  await a.getByRole("button", { name: "Close" }).click();
  await b.getByRole("button", { name: "Close" }).click();

  // ---- Hot & cold: Nova hides a spot on the map, Night senses
  a = await openLandmark(nova, "SPIDER-SENSE ANTENNA");
  await a.getByRole("button", { name: /HIDE A SPOT/ }).click();
  await expect(nova.getByText(/TAP ANYWHERE TO HIDE/)).toBeVisible();
  const box = (await nova.locator(".map-viewport").boundingBox())!;
  await nova.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await expect(nova.getByText(/SPOT HIDDEN/)).toBeVisible();
  b = await openLandmark(night, "SPIDER-SENSE ANTENNA");
  await b.getByRole("button", { name: /SENSE ON THE MAP/ }).click({ timeout: 15_000 });
  const nbox = (await night.locator(".map-viewport").boundingBox())!;
  await night.mouse.click(nbox.x + nbox.width * 0.3, nbox.y + nbox.height * 0.35);
  await expect(night.locator(".hunt-label")).toBeVisible({ timeout: 15_000 });
  await expect(night.getByText(/9 TRIES LEFT/)).toBeVisible();
  await expect(nova.locator(".hunt-dot")).toHaveCount(1, { timeout: 15_000 });
  await night.getByRole("button", { name: "✕ CANCEL" }).click();

  // ---- Pigeon pairs: first flip shows a card to both
  a = await openLandmark(nova, "PIGEON HQ");
  b = await openLandmark(night, "PIGEON HQ");
  await a.getByRole("button", { name: /DEAL THE CARDS|NEW BOARD/ }).click();
  await a.getByRole("gridcell").first().click();
  await expect(a.getByText(/NOW FLIP ITS PAIR/)).toBeVisible();
  await expect(b.getByRole("gridcell").first()).not.toHaveAccessibleName(/face down/, { timeout: 15_000 });
  await a.getByRole("button", { name: "Close" }).click();
  await b.getByRole("button", { name: "Close" }).click();

  // ---- Race: the course starts and the clock runs
  a = await openLandmark(nova, "SIGNAL BRIDGE");
  await a.getByRole("button", { name: "▶ SWING!" }).click();
  await expect(a.locator(".race-overlay")).toHaveCount(0, { timeout: 5000 });
  await a.locator(".race-canvas").click();

  await nova.context().close();
  await night.context().close();
});
