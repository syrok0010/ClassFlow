import { expect, test } from "@playwright/test";

test.describe("Users smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/users");
    await expect(page).toHaveURL(/\/admin\/users$/);
  });

  test("renders users page structure", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Пользователи" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Добавить пользователя" })).toBeVisible();
    await expect(page.getByPlaceholder("Поиск по имени или E-mail...")).toBeVisible();
    await expect(page.getByRole("radio", { name: /^Все$/ })).toBeVisible();
  });

  test("renders seeded users rows", async ({ page }) => {
    await expect(page.getByText("Сироткин Сергей Владимирович")).toBeVisible();
    await expect(page.getByText("admin1@classflow.local")).toBeVisible();
  });

  test("creates user with Smart Row", async ({ page }) => {
    const surname = `Е2Е_${Date.now()}`;

    const addUserButton = page.getByRole("button", { name: "Добавить пользователя" });
    const surnameInput = page.getByTestId("smart-row-surname");
    await addUserButton.click();
    await surnameInput.waitFor({ state: "visible", timeout: 10_000 });

    await surnameInput.fill(surname);
    await page.getByTestId("smart-row-name").fill("Тест");
    await page.getByTestId("smart-row-email").fill("");

    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByRole("cell", { name: `${surname} Тест` })).toBeVisible();
    await expect(page.getByText("Инвайт-код:")).toBeVisible();
  });
});
