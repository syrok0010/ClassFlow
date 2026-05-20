import { expect, test } from "@playwright/test";

import {
  loginAsAdmin,
  loginAsParent,
  loginAsStudent,
  loginAsTeacher,
  loginAsTeacherParent,
} from "./helpers/auth";

test.describe("Auth smoke", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects guest from /admin/users to /login", async ({ page }) => {
    await page.goto("/admin/users");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Вход в ClassFlow")).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Электронная почта").fill("wrong@classflow.local");
    await page.getByLabel("Пароль").fill("wrong-password");
    const submitButton = page.getByRole("button", { name: "Войти" });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(page.getByText(/Неверный email или пароль|Invalid email or password/i)).toBeVisible();
  });

  test("allows admin login and opens users page", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");

    await expect(page).toHaveURL(/\/admin\/users$/);
    await expect(page.getByRole("heading", { name: "Пользователи" })).toBeVisible();
  });

  test("redirects teacher to teacher dashboard after login", async ({ page }) => {
    await loginAsTeacher(page);

    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.getByRole("heading", { name: "Кабинет преподавателя" })).toBeVisible();
  });

  test("redirects parent to parent dashboard after login", async ({ page }) => {
    await loginAsParent(page);

    await expect(page).toHaveURL(/\/parent$/);
    await expect(page.getByRole("heading", { name: "Кабинет родителя" })).toBeVisible();
  });

  test("redirects student to student dashboard after login", async ({ page }) => {
    await loginAsStudent(page);

    await expect(page).toHaveURL(/\/student$/);
    await expect(page.getByRole("heading", { name: "Кабинет ученика" })).toBeVisible();
  });

  test("redirects teacher-parent user to teacher dashboard after login", async ({ page }) => {
    await loginAsTeacherParent(page);

    await expect(page).toHaveURL(/\/teacher$/);
    await expect(page.getByRole("heading", { name: "Кабинет преподавателя" })).toBeVisible();
  });

  test("redirects authenticated admin away from /login", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/login");

    await expect(page).toHaveURL(/\/admin$/);
  });

  test("redirects authenticated teacher away from /login", async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto("/login");

    await expect(page).toHaveURL(/\/teacher$/);
  });

  test("redirects authenticated parent away from /login", async ({ page }) => {
    await loginAsParent(page);
    await page.goto("/login");

    await expect(page).toHaveURL(/\/parent$/);
  });

  test("redirects authenticated student away from /login", async ({ page }) => {
    await loginAsStudent(page);
    await page.goto("/login");

    await expect(page).toHaveURL(/\/student$/);
  });
});
