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
    await expect(page.getByText("Робототехника")).toBeVisible();
    await expect(page.getByText("Медиастудия")).toBeVisible();
    await expect(page.getByText("Классный час")).toBeVisible();
  });

  test("filters subjects by search query", async ({ page }) => {
    await page.getByPlaceholder("Поиск по названию...").fill("Робот");

    await expect(page.getByText("Робототехника")).toBeVisible();
    await expect(page.getByText("Медиастудия")).not.toBeVisible();
    await expect(page.getByText("Английский язык")).not.toBeVisible();
  });
});
