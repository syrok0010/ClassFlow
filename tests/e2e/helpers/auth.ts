import { expect, type Page } from "@playwright/test";

export const adminCredentials = {
  email: "admin1@classflow.local",
  password: "admin1234",
};

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Электронная почта").fill(adminCredentials.email);
  await page.getByLabel("Пароль").fill(adminCredentials.password);

  const submitButton = page.getByRole("button", { name: "Войти" });
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  await expect(page).toHaveURL(/\/admin$/);
}
