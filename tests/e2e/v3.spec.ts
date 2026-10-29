import { expect, test } from "@playwright/test";
import { enterApp, login, NIGHT, NOVA, openTab, ROBO } from "./helpers";

test("v3: pick who to chat with, the test bot auto-replies to one person only", async ({ browser }) => {
  test.setTimeout(180_000);
  const opts = { reducedMotion: "reduce" as const };
  const night = await (await browser.newContext({ ...opts, viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  const nova = await (await browser.newContext(opts)).newPage();
  const robo = await (await browser.newContext(opts)).newPage();

  await login(night, NIGHT);
  await enterApp(night);
  await openTab(night, "COMMS");
  const nightChats = night.getByRole("navigation", { name: "Chats" });
  await expect(nightChats.getByRole("button", { name: /Chat with Nova/ })).toHaveAttribute("aria-current", "true");

  // Night opens the bot's chat and gets a cute auto-reply.
  await nightChats.getByRole("button", { name: /Chat with R\.O\.B\.O/ }).click();
  await expect(night.locator(".contact-chip.on")).toContainText("R.O.B.O");
  await expect(night.getByText("LINK OK")).toBeVisible({ timeout: 20_000 });
  await night.getByLabel("Message", { exact: true }).fill("hi robot");
  await night.getByRole("button", { name: "SEND", exact: true }).click();
  await expect(night.getByText("beep boop, just a robot here 🤖")).toBeVisible({ timeout: 15_000 });

  // Back to Nova: the main chat is untouched by the bot.
  await nightChats.getByRole("button", { name: /Chat with Nova/ }).click();
  await expect(night.locator(".contact-chip.on")).toContainText("Nova");
  await expect(night.getByText("beep boop, just a robot here 🤖")).toHaveCount(0);

  // Nova talks to the bot: no auto-reply for Nova.
  await login(nova, NOVA);
  await enterApp(nova);
  await openTab(nova, "COMMS");
  await nova.getByRole("navigation", { name: "Chats" }).getByRole("button", { name: /Chat with R\.O\.B\.O/ }).click();
  await expect(nova.getByText("LINK OK")).toBeVisible({ timeout: 20_000 });
  await nova.getByLabel("Message", { exact: true }).fill("testing 1 2 3");
  await nova.getByRole("button", { name: "SEND", exact: true }).click();
  await expect(nova.getByText("testing 1 2 3")).toBeVisible();

  // The bot account (logged in by the owner) sees both chats and can answer Nova by hand.
  await login(robo, ROBO);
  await enterApp(robo);
  await openTab(robo, "COMMS");
  const roboChats = robo.getByRole("navigation", { name: "Chats" });
  await roboChats.getByRole("button", { name: /Chat with Nova/ }).click();
  await expect(robo.getByText("testing 1 2 3")).toBeVisible({ timeout: 15_000 });
  await robo.getByLabel("Message", { exact: true }).fill("all systems go");
  await robo.getByRole("button", { name: "SEND", exact: true }).click();
  await expect(nova.getByText("all systems go")).toBeVisible({ timeout: 15_000 });
  await nova.waitForTimeout(6000);
  await expect(nova.getByText("beep boop, just a robot here 🤖")).toHaveCount(0);

  // A signal in a chat that isn't open shows a banner + badge; tapping it opens that chat.
  await nova.getByRole("navigation", { name: "Chats" }).getByRole("button", { name: /Chat with Night/ }).click();
  await expect(nova.locator(".contact-chip.on")).toContainText("Night");
  await expect(nova.getByText("LINK OK")).toBeVisible({ timeout: 20_000 });
  await robo.getByLabel("Message", { exact: true }).fill("ping from the bot");
  await robo.getByRole("button", { name: "SEND", exact: true }).click();
  const banner = nova.locator(".lobby-toast");
  await expect(banner).toContainText("R.O.B.O", { timeout: 15_000 });
  await expect(nova.getByRole("button", { name: /Chat with R\.O\.B\.O, 1 unread/ })).toBeVisible();
  await banner.click();
  await expect(nova.locator(".contact-chip.on")).toContainText("R.O.B.O");
  await expect(nova.getByText("ping from the bot")).toBeVisible({ timeout: 15_000 });

  for (const p of [night, nova, robo]) await p.context().close();
});
