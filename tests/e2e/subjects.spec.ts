import { expect, test } from "@playwright/test";

test.describe("Subjects smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/subjects");
    await expect(page).toHaveURL(/\/admin\/subjects$/);
  });

  test("renders seeded subjects and toolbar controls", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Предметы" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Добавить предмет" })).toBeVisible();
    await expect(page.getByPlaceholder("Поиск по названию...")).toBeVisible();

    await expect(page.getByText("Английский язык")).toBeVisible();
    await expect(page.getByText("Математика")).toBeVisible();
    await expect(page.getByText("Журналистика")).toBeVisible();
    await expect(page.getByText("Обед")).toBeVisible();
  });

  test("filters subjects by search query", async ({ page }) => {
    await page.goto("/admin/subjects?search=Журнал");

    await expect(page).toHaveURL(/search=/);
    await expect(page.getByPlaceholder("Поиск по названию...")).toHaveValue("Журнал");
    await expect(page.getByText("Журналистика")).toBeVisible();
    await expect(page.getByText("Математика")).not.toBeVisible();
    await expect(page.getByText("Английский язык")).not.toBeVisible();
  });
});
