import { expect, test } from "@playwright/test";

test.describe("Invite activation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("activates invited teacher account and allows login", async ({ page }) => {
    const email = `activated-teacher-${Date.now()}@classflow.local`;
    const password = "invite1234";

    await page.goto("/invite/E2E-HAPPY-INVITE");

    await expect(page.getByText("Активация аккаунта")).toBeVisible();
    await page.getByLabel("Фамилия").fill("Активированный");
    await page.getByLabel("Имя").fill("Учитель");
    await page.getByLabel("Отчество (если есть)").fill("Е2Е");
    await page.getByLabel("Email (для входа)").fill(email);
    await page.getByLabel("Пароль").fill(password);
    await page.getByLabel("Подтверждение").fill(password);

    await page.getByRole("button", { name: "Активировать аккаунт" }).click();

    await expect(page).toHaveURL(/\/login\?activated=true$/);

    await page.getByLabel("Электронная почта").fill(email);
    await page.getByLabel("Пароль").fill(password);
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.getByRole("heading", { name: "Кабинет преподавателя" })).toBeVisible();
  });

  test("keeps invite usable after failed activation attempt", async ({ page }) => {
    const retryEmail = "rollback-teacher@classflow.local";

    await page.goto("/invite/E2E-ROLLBACK-INVITE");

    await page.getByLabel("Фамилия").fill("Повторная");
    await page.getByLabel("Имя").fill("Проверка");
    await page.getByLabel("Отчество (если есть)").fill("Е2Е");
    await page.getByLabel("Email (для входа)").fill("admin1@classflow.local");
    await page.getByLabel("Пароль").fill("invite1234");
    await page.getByLabel("Подтверждение").fill("invite1234");

    await page.getByRole("button", { name: "Активировать аккаунт" }).click();

    await expect(page.getByText("Ошибка при активации аккаунта")).toBeVisible();
    await expect(page).toHaveURL(/\/invite\/E2E-ROLLBACK-INVITE$/);

    await page.getByLabel("Email (для входа)").fill(retryEmail);
    await page.getByRole("button", { name: "Активировать аккаунт" }).click();

    await expect(page).toHaveURL(/\/login\?activated=true$/);

    await page.getByLabel("Электронная почта").fill(retryEmail);
    await page.getByLabel("Пароль").fill("invite1234");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.getByRole("heading", { name: "Кабинет преподавателя" })).toBeVisible();
  });
});
