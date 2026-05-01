import { expect, test } from "@playwright/test";

test.describe("Admin schedule", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/schedule");
    await expect(page).toHaveURL(/\/admin\/schedule$/);
  });

  test("renders seeded weekly template entries", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Шаблон расписания" })).toBeVisible();
    await expect(page.getByText("10 А", { exact: true })).toBeVisible();
    await expect(page.getByText("10 Б", { exact: true })).toBeVisible();

    const englishCard = page.getByTestId("admin-schedule-card").filter({
      hasText: "Английский язык",
    });
    const classHourCard = page.getByTestId("admin-schedule-card").filter({
      hasText: "Классный час",
    });

    await expect(englishCard).toBeVisible();
    await expect(classHourCard).toBeVisible();

    await englishCard.hover();
    const tooltip = page.getByTestId("admin-schedule-card-tooltip");
    await expect(tooltip).toContainText("09:00-09:45");
    await expect(tooltip).toContainText("Кабинет 101");
    await expect(tooltip).toContainText("Иванов Иван Иванович");
  });
});
