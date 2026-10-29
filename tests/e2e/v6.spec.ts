import { expect, test } from "@playwright/test";
import { enterApp, login, NIGHT, NOVA, openTab } from "./helpers";

test("v6: the bot chat is messages-only for Night, and the tune lets Nova pick who hears it", async ({ browser }) => {
  test.setTimeout(150_000);
  const opts = { reducedMotion: "reduce" as const };
  const night = await (await browser.newContext({ ...opts, viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  const nova = await (await browser.newContext(opts)).newPage();

  await login(night, NIGHT);
  await enterApp(night);
  const nav = night.getByRole("navigation", { name: "Main" });
  // Main chat: everything is there, and Night's tune goes straight to Nova (the only choice).
  await expect(night.getByRole("button", { name: /^THWIP TOWER:/ })).toBeAttached();
  await expect(night.getByRole("button", { name: /Play our tune on Nova's phone/i })).toBeVisible();

  // Bot chat: messages only.
  await openTab(night, "COMMS");
  await night.getByRole("navigation", { name: "Chats" }).getByRole("button", { name: /Chat with R\.O\.B\.O/ }).click();
  await expect(night.locator(".contact-chip.on")).toContainText("R.O.B.O");
  await expect(nav.getByRole("button", { name: /SIGNALS/ })).toHaveCount(0);
  await expect(night.locator(".landmark")).toHaveCount(0);
  await expect(night.getByLabel("Message", { exact: true })).toBeVisible();
  await openTab(night, "MAP");
  await expect(night.getByRole("button", { name: "▼ DROP", exact: true })).toHaveCount(0);
  await expect(night.getByRole("button", { name: "Send a heart" })).toHaveCount(0);
  // The tune button here still only offers Nova.
  await expect(night.getByRole("button", { name: /Play our tune on Nova's phone/i })).toBeVisible();

  // Nova (who can play with both) gets a picker.
  await login(nova, NOVA);
  await enterApp(nova);
  await nova.getByRole("button", { name: /Play our tune on/i }).click();
  const picker = nova.getByRole("dialog", { name: "Play the tune for" });
  await expect(picker.getByRole("button", { name: /Play the tune for Night/i })).toBeVisible();
  await expect(picker.getByRole("button", { name: /Play the tune for R\.O\.B\.O/ })).toBeVisible();
  await picker.getByRole("button", { name: "CANCEL" }).click();
  await expect(picker).toHaveCount(0);

  await night.context().close();
  await nova.context().close();
});
