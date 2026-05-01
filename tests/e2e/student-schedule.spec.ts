import { expect, test } from "@playwright/test";

import { loginAsStudent } from "./helpers/auth";

test.describe("Student schedule", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("renders seeded lessons with room and teacher details", async ({ page }) => {
    await loginAsStudent(page);
    await page.goto("/student/schedule");

    await expect(page).toHaveURL(/\/student\/schedule$/);
    await expect(page.getByRole("heading", { name: "Расписание уроков" })).toBeVisible();

    const englishCard = page.getByTestId("student-schedule-card").filter({
      hasText: "Английский язык",
    });

    await expect(englishCard).toBeVisible();
    await englishCard.hover();

    const tooltip = page.getByTestId("student-schedule-card-tooltip");
    await expect(tooltip).toContainText("09:00-09:45");
    await expect(tooltip).toContainText("Кабинет 101");
    await expect(tooltip).toContainText("Иванов Иван Иванович");
  });
});
