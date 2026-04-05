import { expect, type Page } from "@playwright/test";

export const adminCredentials = {
  email: "admin1@classflow.local",
  password: "admin1234",
};

export const teacherCredentials = {
  email: "teacher1@classflow.local",
  password: "teacher1234",
};

export const teacherParentCredentials = {
  email: "teacher-parent1@classflow.local",
  password: "teacherparent1234",
};

async function login(page: Page, email: string, password: string, expectedPath: RegExp) {
  await page.goto("/login");
  await page.getByLabel("Электронная почта").fill(email);
  await page.getByLabel("Пароль").fill(password);

  const submitButton = page.getByRole("button", { name: "Войти" });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  await expect(page).toHaveURL(expectedPath);
}

export async function loginAsAdmin(page: Page) {
  await login(page, adminCredentials.email, adminCredentials.password, /\/admin$/);
}

export async function loginAsTeacher(page: Page) {
  await login(page, teacherCredentials.email, teacherCredentials.password, /\/teacher$/);
}

export async function loginAsTeacherParent(page: Page) {
  await login(page, teacherParentCredentials.email, teacherParentCredentials.password, /\/teacher$/);
}
