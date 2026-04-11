import { expect, test } from "@playwright/test";

import {
  loginAsAdmin,
  loginAsParent,
  loginAsStudent,
  loginAsTeacher,
  loginAsTeacherParent,
} from "./helpers/auth";

test.describe("Sidebar roles", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("admin sees only admin section", async ({ page }) => {
    await loginAsAdmin(page);

    await expect(page.getByTestId("sidebar-section-admin")).toBeVisible();
    await expect(page.getByTestId("sidebar-section-teacher")).toHaveCount(0);
    await expect(page.getByTestId("sidebar-section-parent")).toHaveCount(0);
    await expect(page.getByTestId("sidebar-section-student")).toHaveCount(0);
  });

  test("teacher sees only teacher section", async ({ page }) => {
    await loginAsTeacher(page);

    await expect(page.getByRole("heading", { name: "Кабинет преподавателя" })).toBeVisible();
    await expect(page.getByTestId("sidebar-section-teacher")).toBeVisible();
    await expect(page.getByTestId("sidebar-section-admin")).toHaveCount(0);
    await expect(page.getByTestId("sidebar-section-parent")).toHaveCount(0);
    await expect(page.getByTestId("sidebar-section-student")).toHaveCount(0);
  });

  test("teacher-parent sees teacher and parent sections", async ({ page }) => {
    await loginAsTeacherParent(page);

    await expect(page.getByTestId("sidebar-section-teacher")).toBeVisible();
    await expect(page.getByTestId("sidebar-section-parent")).toBeVisible();
    await expect(page.getByTestId("sidebar-section-admin")).toHaveCount(0);
    await expect(page.getByTestId("sidebar-section-student")).toHaveCount(0);
  });

  test("multi-role footer shows all roles", async ({ page }) => {
    await loginAsTeacherParent(page);

    await expect(page.getByTestId("sidebar-profile-trigger")).toContainText("Учитель, Родитель");
  });

  test("root redirects by access priority", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/admin$/);

    await page.context().clearCookies();
    await loginAsTeacher(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/teacher$/);

    await page.context().clearCookies();
    await loginAsTeacherParent(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/teacher$/);

    await page.context().clearCookies();
    await loginAsParent(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/parent$/);

    await page.context().clearCookies();
    await loginAsStudent(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/student$/);
  });

  test("planned teacher route without page opens 404", async ({ page }) => {
    await loginAsTeacher(page);

    await page.getByTestId("sidebar-link-teacher-subjects").click();

    await expect(page).toHaveURL(/\/teacher\/subjects$/);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  });
});
