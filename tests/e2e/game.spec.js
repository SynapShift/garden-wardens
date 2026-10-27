import { test, expect } from "@playwright/test";
async function clickGame(page, x, y) {
  const box = await page.locator("canvas").boundingBox();
  if (!box) throw new Error("Game canvas did not load");
  await page.mouse.click(
    box.x + (x / 1600) * box.width,
    box.y + (y / 900) * box.height,
  );
}
test("boots, starts and plants with no runtime errors", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.waitForTimeout(2500);
  await clickGame(page, 800, 567);
  await clickGame(page, 310, 330);
  await page.keyboard.press("Space");
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);
  await page.screenshot({ path: "test-results/gameplay.png" });
  expect(errors).toEqual([]);
});
test("mobile canvas fits the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});
