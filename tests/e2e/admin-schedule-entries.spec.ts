import { expect, test } from "@playwright/test";

test.describe("Admin schedule entries", () => {
  test("shows actual schedule entries by group, teacher, and room", async ({ page }) => {
    await page.goto("/admin/schedule/entries");

    await expect(page.getByRole("heading", { name: "Фактическое расписание" })).toBeVisible();
    await expect(page.getByTestId("sidebar-link-admin-schedule-entries")).toHaveClass(/bg-primary/);
    await expect(page.getByTestId("sidebar-link-admin-schedule")).not.toHaveClass(/bg-primary/);
    await expect(page.getByText("Выберите группу, преподавателя или кабинет")).toBeVisible();

    await page.getByPlaceholder("Выберите группу").fill("5 А");
    await page.locator('[data-slot="combobox-content"]').getByText("5 А").click();
    await expect(page.getByTestId("admin-schedule-card").filter({ hasText: "Математика" })).toBeVisible();

    await page.getByRole("radio", { name: "Преподаватели" }).click();
    await page.getByPlaceholder("Выберите преподавателя").fill("Иванов Иван Иванович");
    await page.locator('[data-slot="combobox-content"]').getByText("Иванов Иван Иванович").click();
    await expect(page.getByTestId("admin-schedule-card").filter({ hasText: "Математика" })).toBeVisible();

    await page.getByRole("radio", { name: "Кабинеты" }).click();
    await page.getByPlaceholder("Выберите кабинет").fill("Кабинет 5А");
    await page.locator('[data-slot="combobox-content"]').getByText("Кабинет 5А").click();
    await expect(page.getByTestId("admin-schedule-card").filter({ hasText: "Математика" })).toBeVisible();

    const targetId = new URL(page.url()).searchParams.get("targetId");
    expect(targetId).toBeTruthy();

    await page.getByRole("radio", { name: "День" }).click();
    await expect(page).toHaveURL(/view=day/);
    await expect(page).toHaveURL(/scope=room/);
    await expect(page).toHaveURL(new RegExp(`targetId=${targetId}`));

    await page.getByRole("radio", { name: "Неделя" }).click();
    await expect(page).toHaveURL(/scope=room/);
    await expect(page).toHaveURL(new RegExp(`targetId=${targetId}`));
  });
});
