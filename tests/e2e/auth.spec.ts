import { expect, test } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("Auth smoke", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects guest from /admin/users to /login", async ({ page }) => {
    await page.goto("/admin/users");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Вход в ClassFlow")).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Электронная почта").fill("wrong@classflow.local");
    await page.getByLabel("Пароль").fill("wrong-password");
    const submitButton = page.getByRole("button", { name: "Войти" });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(page.getByText(/Неверный email или пароль|Invalid email or password/i)).toBeVisible();
  });

  test("allows admin login and opens users page", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Пользователи" })).toBeVisible();
  });
});
