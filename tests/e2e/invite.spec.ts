import { expect, test, type APIRequestContext } from "@playwright/test";

import { loginAsTeacher } from "./helpers/auth";

const E2E_STUDENT_PROFILE_ID = "e2e-student-profile";

async function createParentInviteToken(request: APIRequestContext) {
  const response = await request.post("/api/admin/parent-invites", {
    data: { studentId: E2E_STUDENT_PROFILE_ID },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create parent invite: ${response.status()} ${await response.text()}`);
  }

  const result = (await response.json()) as { token: string; parentUserId: string };

  return result.token;
}

test.describe("Invite activation", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("activates invited teacher account and allows login", async ({ page }) => {
    const email = `activated-teacher-${Date.now()}@classflow.local`;
    const password = "invite1234";

    await page.goto("/invite/E2E-HAPPY-INVITE");

    await expect(page.getByText("Активация аккаунта")).toBeVisible();
    await expect(page.getByLabel("Фамилия")).toHaveValue("Активации");
    await expect(page.getByLabel("Имя")).toHaveValue("Ожидает");
    await expect(page.getByLabel("Email (для входа)")).toHaveValue("");

    await page.getByLabel("Фамилия").fill("Активированный");
    await page.getByLabel("Имя").fill("Учитель");
    await page.getByLabel("Отчество (если есть)").fill("Е2Е");
    await page.getByLabel("Email (для входа)").fill(email);
    await page.getByLabel("Пароль").fill(password);
    await page.getByLabel("Подтверждение").fill(password);

    await page.getByRole("button", { name: "Активировать аккаунт" }).click();

    await expect(page).toHaveURL(/\/login\?activated=true$/);

    await page.getByLabel("Электронная почта").fill(email);
    await page.getByLabel("Пароль").fill(password);
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page).toHaveURL(/\/teacher\/schedule$/);
    await expect(page.getByRole("heading", { name: "Мое расписание" })).toBeVisible();
  });

  test("keeps invite usable after failed activation attempt", async ({ page }) => {
    const retryEmail = "rollback-teacher@classflow.local";

    await page.goto("/invite/E2E-ROLLBACK-INVITE");

    await expect(page.getByLabel("Фамилия")).toHaveValue("Активация");
    await expect(page.getByLabel("Имя")).toHaveValue("Повторная");
    await expect(page.getByLabel("Email (для входа)")).toHaveValue("");

    await page.getByLabel("Фамилия").fill("Повторная");
    await page.getByLabel("Имя").fill("Проверка");
    await page.getByLabel("Отчество (если есть)").fill("Е2Е");
    await page.getByLabel("Email (для входа)").fill("admin1@classflow.local");
    await page.getByLabel("Пароль").fill("invite1234");
    await page.getByLabel("Подтверждение").fill("invite1234");

    await page.getByRole("button", { name: "Активировать аккаунт" }).click();

    await expect(page.getByText("Ошибка при активации аккаунта")).toBeVisible();
    await expect(page).toHaveURL(/\/invite\/E2E-ROLLBACK-INVITE$/);

    await page.getByLabel("Email (для входа)").fill(retryEmail);
    await page.getByRole("button", { name: "Активировать аккаунт" }).click();

    await expect(page).toHaveURL(/\/login\?activated=true$/);

    await page.getByLabel("Электронная почта").fill(retryEmail);
    await page.getByLabel("Пароль").fill("invite1234");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page).toHaveURL(/\/teacher\/schedule$/);
    await expect(page.getByRole("heading", { name: "Мое расписание" })).toBeVisible();
  });

  test("opens parent invite activation with empty editable user fields", async ({
    page,
    baseURL,
    playwright,
  }) => {
    const email = `activated-parent-${Date.now()}@classflow.local`;
    const password = "invite1234";
    const adminRequest = await playwright.request.newContext({
      baseURL,
      storageState: "tests/e2e/.auth/admin.json",
    });

    let inviteToken: string;

    try {
      inviteToken = await createParentInviteToken(adminRequest);
    } finally {
      await adminRequest.dispose();
    }

    await page.goto(`/invite/${inviteToken}`);

    await expect(page.getByText("Активация аккаунта")).toBeVisible();
    await expect(page.getByLabel("Фамилия")).toHaveValue("");
    await expect(page.getByLabel("Имя")).toHaveValue("");
    await expect(page.getByLabel("Отчество (если есть)")).toHaveValue("");
    await expect(page.getByLabel("Email (для входа)")).toHaveValue("");

    await page.getByLabel("Фамилия").fill("Родитель");
    await page.getByLabel("Имя").fill("Активированный");
    await page.getByLabel("Email (для входа)").fill(email);
    await page.getByLabel("Пароль").fill(password);
    await page.getByLabel("Подтверждение").fill(password);

    await page.getByRole("button", { name: "Активировать аккаунт" }).click();

    await expect(page).toHaveURL(/\/login\?activated=true$/);

    await page.getByLabel("Электронная почта").fill(email);
    await page.getByLabel("Пароль").fill(password);
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(page).toHaveURL(/\/parent\/schedule(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Расписание детей" })).toBeVisible();
  });

  test("redirects authenticated teacher away from invite activation", async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto("/invite/E2E-HAPPY-INVITE");

    await expect(page).toHaveURL(/\/teacher\/schedule$/);
    await expect(page.getByRole("heading", { name: "Мое расписание" })).toBeVisible();
  });
});
