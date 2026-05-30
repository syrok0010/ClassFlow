import { expect, test } from "@playwright/test";

test.describe("Admin schedule entries", () => {
  test("shows actual schedule entries by group, teacher, and room", async ({ page }) => {
    await page.goto("/admin/schedule/entries");

    await expect(page.getByRole("heading", { name: "Фактическое расписание" })).toBeVisible();
    await expect(page.getByTestId("sidebar-link-admin-schedule-entries")).toHaveClass(/bg-primary/);
    await expect(page.getByTestId("sidebar-link-admin-schedule")).not.toHaveClass(/bg-primary/);
    await expect(page.getByText("Выберите группу, преподавателя или кабинет")).toBeVisible();

    const targetCombobox = page.getByPlaceholder("Выберите группу, преподавателя или кабинет");
    await expect(targetCombobox).toBeEnabled();

    await targetCombobox.fill("5 А");
    await page.getByRole("option", { name: "5 А Группа · Класс" }).click();
    await expect(page.getByTestId("admin-schedule-card").filter({ hasText: "Математика" })).toBeVisible();
    await expect(targetCombobox).toBeEnabled();
    await expect(targetCombobox).toHaveValue("5 А");

    const groupUrl = new URL(page.url());
    expect(groupUrl.searchParams.get("targetId")).toBeTruthy();
    expect(groupUrl.searchParams.get("scope")).toBeNull();

    await targetCombobox.fill("Иванов Иван Иванович");
    await page.getByRole("option", { name: "Иванов Иван Иванович Преподаватель" }).click();
    await expect(page.getByTestId("admin-schedule-card").filter({ hasText: "Математика" })).toBeVisible();
    await expect(targetCombobox).toBeEnabled();
    await expect(targetCombobox).toHaveValue("Иванов Иван Иванович");

    const teacherUrl = new URL(page.url());
    expect(teacherUrl.searchParams.get("targetId")).toBeTruthy();
    expect(teacherUrl.searchParams.get("scope")).toBe("teacher");

    await targetCombobox.fill("Кабинет 5А");
    await page.getByRole("option", { name: "Кабинет 5А Кабинет" }).click();
    await expect(page).toHaveURL(/scope=room/);
    await expect(page.getByTestId("admin-schedule-card").filter({ hasText: "Математика" })).toBeVisible();
    await expect(targetCombobox).toBeEnabled();
    await expect(targetCombobox).toHaveValue("Кабинет 5А");

    const roomTargetId = new URL(page.url()).searchParams.get("targetId");
    expect(roomTargetId).toBeTruthy();

    await page.getByRole("radio", { name: "День" }).click();
    await expect(page).toHaveURL(/view=day/);
    await expect(page).toHaveURL(/scope=room/);
    await expect(page).toHaveURL(new RegExp(`targetId=${roomTargetId}`));

    await page.getByRole("radio", { name: "Неделя" }).click();
    await expect(page).toHaveURL(/scope=room/);
    await expect(page).toHaveURL(new RegExp(`targetId=${roomTargetId}`));
  });
});
