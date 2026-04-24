import { expect, test } from "@playwright/test";

import { loginAsTeacher } from "./helpers/auth";

test.describe("Invite activation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("activates invited teacher account and allows login", async ({ page }) => {
    const email = `activated-teacher-${Date.now()}@classflow.local`;
    const password = "invite1234";

    await page.goto("/invite/E2E-HAPPY-INVITE");

    await expect(page.getByText("РђРєС‚РёРІР°С†РёСЏ Р°РєРєР°СѓРЅС‚Р°")).toBeVisible();
    await page.getByLabel("Р¤Р°РјРёР»РёСЏ").fill("РђРєС‚РёРІРёСЂРѕРІР°РЅРЅС‹Р№");
    await page.getByLabel("РРјСЏ").fill("РЈС‡РёС‚РµР»СЊ");
    await page.getByLabel("РћС‚С‡РµСЃС‚РІРѕ (РµСЃР»Рё РµСЃС‚СЊ)").fill("Р•2Р•");
    await page.getByLabel("Email (РґР»СЏ РІС…РѕРґР°)").fill(email);
    await page.getByLabel("РџР°СЂРѕР»СЊ").fill(password);
    await page.getByLabel("РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ").fill(password);

    await page.getByRole("button", { name: "РђРєС‚РёРІРёСЂРѕРІР°С‚СЊ Р°РєРєР°СѓРЅС‚" }).click();

    await expect(page).toHaveURL(/\/login\?activated=true$/);

    await page.getByLabel("Р­Р»РµРєС‚СЂРѕРЅРЅР°СЏ РїРѕС‡С‚Р°").fill(email);
    await page.getByLabel("РџР°СЂРѕР»СЊ").fill(password);
    await page.getByRole("button", { name: "Р’РѕР№С‚Рё" }).click();

    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.getByRole("heading", { name: "РљР°Р±РёРЅРµС‚ РїСЂРµРїРѕРґР°РІР°С‚РµР»СЏ" })).toBeVisible();
  });

  test("keeps invite usable after failed activation attempt", async ({ page }) => {
    const retryEmail = "rollback-teacher@classflow.local";

    await page.goto("/invite/E2E-ROLLBACK-INVITE");

    await page.getByLabel("Р¤Р°РјРёР»РёСЏ").fill("РџРѕРІС‚РѕСЂРЅР°СЏ");
    await page.getByLabel("РРјСЏ").fill("РџСЂРѕРІРµСЂРєР°");
    await page.getByLabel("РћС‚С‡РµСЃС‚РІРѕ (РµСЃР»Рё РµСЃС‚СЊ)").fill("Р•2Р•");
    await page.getByLabel("Email (РґР»СЏ РІС…РѕРґР°)").fill("admin1@classflow.local");
    await page.getByLabel("РџР°СЂРѕР»СЊ").fill("invite1234");
    await page.getByLabel("РџРѕРґС‚РІРµСЂР¶РґРµРЅРёРµ").fill("invite1234");

    await page.getByRole("button", { name: "РђРєС‚РёРІРёСЂРѕРІР°С‚СЊ Р°РєРєР°СѓРЅС‚" }).click();

    await expect(page.getByText("РћС€РёР±РєР° РїСЂРё Р°РєС‚РёРІР°С†РёРё Р°РєРєР°СѓРЅС‚Р°")).toBeVisible();
    await expect(page).toHaveURL(/\/invite\/E2E-ROLLBACK-INVITE$/);

    await page.getByLabel("Email (РґР»СЏ РІС…РѕРґР°)").fill(retryEmail);
    await page.getByRole("button", { name: "РђРєС‚РёРІРёСЂРѕРІР°С‚СЊ Р°РєРєР°СѓРЅС‚" }).click();

    await expect(page).toHaveURL(/\/login\?activated=true$/);

    await page.getByLabel("Р­Р»РµРєС‚СЂРѕРЅРЅР°СЏ РїРѕС‡С‚Р°").fill(retryEmail);
    await page.getByLabel("РџР°СЂРѕР»СЊ").fill("invite1234");
    await page.getByRole("button", { name: "Р’РѕР№С‚Рё" }).click();

    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.getByRole("heading", { name: "РљР°Р±РёРЅРµС‚ РїСЂРµРїРѕРґР°РІР°С‚РµР»СЏ" })).toBeVisible();
  });

  test("redirects authenticated teacher away from invite activation", async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto("/invite/E2E-HAPPY-INVITE");

    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.getByRole("heading", { name: "РљР°Р±РёРЅРµС‚ РїСЂРµРїРѕРґР°РІР°С‚РµР»СЏ" })).toBeVisible();
  });
});
