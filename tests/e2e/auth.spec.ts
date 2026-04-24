import { expect, test } from "@playwright/test";

import {
  loginAsAdmin,
  loginAsParent,
  loginAsStudent,
  loginAsTeacher,
  loginAsTeacherParent,
} from "./helpers/auth";

test.describe("Auth smoke", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects guest from /admin/users to /login", async ({ page }) => {
    await page.goto("/admin/users");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Р’С…РѕРґ РІ ClassFlow")).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Р­Р»РµРєС‚СЂРѕРЅРЅР°СЏ РїРѕС‡С‚Р°").fill("wrong@classflow.local");
    await page.getByLabel("РџР°СЂРѕР»СЊ").fill("wrong-password");
    const submitButton = page.getByRole("button", { name: "Р’РѕР№С‚Рё" });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(page.getByText(/РќРµРІРµСЂРЅС‹Р№ email РёР»Рё РїР°СЂРѕР»СЊ|Invalid email or password/i)).toBeVisible();
  });

  test("allows admin login and opens users page", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");

    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "РџРѕР»СЊР·РѕРІР°С‚РµР»Рё" })).toBeVisible();
  });

  test("redirects teacher to teacher dashboard after login", async ({ page }) => {
    await loginAsTeacher(page);

    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.getByRole("heading", { name: "РљР°Р±РёРЅРµС‚ РїСЂРµРїРѕРґР°РІР°С‚РµР»СЏ" })).toBeVisible();
  });

  test("redirects parent to parent dashboard after login", async ({ page }) => {
    await loginAsParent(page);

    await expect(page).toHaveURL(/\/parent$/);
    await expect(page.getByRole("heading", { name: "РљР°Р±РёРЅРµС‚ СЂРѕРґРёС‚РµР»СЏ" })).toBeVisible();
  });

  test("redirects student to student dashboard after login", async ({ page }) => {
    await loginAsStudent(page);

    await expect(page).toHaveURL(/\/student$/);
    await expect(page.getByRole("heading", { name: "РљР°Р±РёРЅРµС‚ СѓС‡РµРЅРёРєР°" })).toBeVisible();
  });

  test("redirects teacher-parent user to teacher dashboard after login", async ({ page }) => {
    await loginAsTeacherParent(page);

    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.getByRole("heading", { name: "РљР°Р±РёРЅРµС‚ РїСЂРµРїРѕРґР°РІР°С‚РµР»СЏ" })).toBeVisible();
  });

  test("redirects authenticated admin away from /login", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/login");

    await expect(page).toHaveURL(/\/admin$/);
  });

  test("redirects authenticated teacher away from /login", async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto("/login");

    await expect(page).toHaveURL(/\/teacher$/);
  });

  test("redirects authenticated parent away from /login", async ({ page }) => {
    await loginAsParent(page);
    await page.goto("/login");

    await expect(page).toHaveURL(/\/parent$/);
  });

  test("redirects authenticated student away from /login", async ({ page }) => {
    await loginAsStudent(page);
    await page.goto("/login");

    await expect(page).toHaveURL(/\/student$/);
  });
});
