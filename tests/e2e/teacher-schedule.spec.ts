import { expect, test } from "@playwright/test";
import { addDays, format, startOfWeek } from "date-fns";

import { loginAsTeacher } from "./helpers/auth";

function getCurrentWeekDateParam(dayOffset: number) {
  return format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), dayOffset), "yyyy-MM-dd");
}

test.describe("Teacher schedule", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("renders seeded events in week view", async ({ page }) => {
    await loginAsTeacher(page);
    await page.goto("/teacher/schedule");

    await expect(page).toHaveURL(/\/teacher\/schedule$/);
    await expect(page.getByRole("heading", { name: "Мое расписание" })).toBeVisible();
    await expect(page.getByTestId("teacher-schedule-card").filter({ hasText: "Английский язык" })).toBeVisible();
    await expect(page.getByTestId("teacher-schedule-card").filter({ hasText: "Классный час" })).toBeVisible();
  });

  test("switches day view and navigates between seeded days", async ({ page }) => {
    const monday = getCurrentWeekDateParam(0);

    await loginAsTeacher(page);
    await page.goto(`/teacher/schedule?view=day&date=${monday}`);

    await expect(page.getByRole("radio", { name: "День" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("teacher-schedule-card").filter({ hasText: "Английский язык" })).toBeVisible();
    await expect(page.getByTestId("teacher-schedule-card").filter({ hasText: "Классный час" })).toHaveCount(0);

    await page.getByRole("button", { name: "Вперед" }).click();

    await expect(page).toHaveURL(new RegExp(`/teacher/schedule\\?view=day&date=${getCurrentWeekDateParam(1)}`));
    await expect(page.getByTestId("teacher-schedule-card").filter({ hasText: "Классный час" })).toBeVisible();
    await expect(page.getByTestId("teacher-schedule-card").filter({ hasText: "Английский язык" })).toHaveCount(0);
  });
});
