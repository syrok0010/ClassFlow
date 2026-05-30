import { expect, test } from "@playwright/test";

import { loginAsParent } from "./helpers/auth";

test.describe("Parent schedule", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("opens children schedule from direct URL", async ({ page }) => {
    await loginAsParent(page);

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

    const duplicateChildren = page.getByRole("radio", { name: "Петров Иван · 5 А" });

    await duplicateChildren.first().click();

    await expect(duplicateChildren.first()).toHaveAttribute("aria-checked", "true");
    await expect(page).toHaveURL(/\/parent\/schedule\?.*studentId=/);
  });

  test("allows parent to enroll child in optional elective without attendance badge", async ({ page }) => {
    await loginAsParent(page);

    const optionalCard = page
      .locator('[data-testid="parent-schedule-card"]')
      .filter({ hasText: "Киноклуб" });

    await expect(optionalCard).toBeVisible();
    await expect(optionalCard).toHaveAttribute("data-parent-elective-state", "available");
    await optionalCard.getByRole("button", { name: "Записаться" }).click();

    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText("Волкова Дарья Игоревна будет записан(а) на доп «Киноклуб».");
    await dialog.getByRole("button", { name: "Подтвердить" }).click();

    await expect(page.getByText("Ребенок записан на доп")).toBeVisible();
    await expect(optionalCard).toHaveAttribute("data-parent-elective-state", "enrolled");
    await expect(optionalCard.getByRole("button", { name: "Записаться" })).toHaveCount(0);
    await expect(optionalCard.getByText("Посещает")).toHaveCount(0);
  });
});
