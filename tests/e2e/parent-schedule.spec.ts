import { expect, test } from "@playwright/test";

import { loginAsParent } from "./helpers/auth";

test.describe("Parent schedule", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("opens children schedule from direct URL", async ({ page }) => {
    await loginAsParent(page);
    await page.goto("/parent/schedule");

    await expect(page).toHaveURL(/\/parent\/schedule\?.*studentId=/);
    await expect(page.getByRole("heading", { name: "Расписание детей" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Волкова Дарья Игоревна · 5 А" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "Петров Иван · 5 А" })).toHaveCount(2);
    await expect(page.getByTestId("student-schedule-card").first()).toContainText("Математика");
  });

  test("opens children schedule from sidebar", async ({ page }) => {
    await loginAsParent(page);

    await page.getByTestId("sidebar-link-parent-schedule").click();

    await expect(page).toHaveURL(/\/parent\/schedule\?.*studentId=/);
    await expect(page.getByRole("heading", { name: "Расписание детей" })).toBeVisible();
  });

  test("redirects invalid studentId to available child", async ({ page }) => {
    await loginAsParent(page);
    await page.goto("/parent/schedule?studentId=missing-child");

    await expect(page).toHaveURL(/\/parent\/schedule\?.*studentId=/);
    await expect(page).not.toHaveURL(/missing-child/);
    await expect(page.getByRole("heading", { name: "Расписание детей" })).toBeVisible();
  });

  test("switches selected child", async ({ page }) => {
    await loginAsParent(page);
    await page.goto("/parent/schedule");

    const duplicateChildren = page.getByRole("radio", { name: "Петров Иван · 5 А" });

    await duplicateChildren.first().click();

    await expect(duplicateChildren.first()).toHaveAttribute("aria-checked", "true");
    await expect(page).toHaveURL(/\/parent\/schedule\?.*studentId=/);
  });
});
