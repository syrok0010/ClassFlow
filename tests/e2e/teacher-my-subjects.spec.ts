import { expect, test, type Page } from "@playwright/test";
import { loginAsTeacher } from "./helpers/auth";

function subjectRow(page: Page, subjectName: string) {
  return page.getByRole("row").filter({ hasText: subjectName });
}

async function openMySubjectsPage(page: Page) {
  await loginAsTeacher(page);
  await page.goto("/teacher/subjects");
  await expect(page).toHaveURL(/\/teacher\/subjects$/);
  await expect(page.getByRole("heading", { name: "Мои предметы" })).toBeVisible();
}

test.describe("Teacher my subjects", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await openMySubjectsPage(page);
  });

  test("renders teacher page with own competencies", async ({ page }) => {
    await expect(
      page.getByText("Завуч использует этот список при составлении расписания и поиске замен.")
    ).toBeVisible();
    await expect(page.getByText("Математика")).toBeVisible();
    await expect(page.getByText(/Всего предметов:\s*1/)).toBeVisible();
  });

  test("creates competency with inline row", async ({ page }) => {
    await page.getByRole("button", { name: "Добавить предмет" }).click();

    const subjectInput = page.getByPlaceholder("Выберите предмет");
    await expect(subjectInput).toBeVisible();
    await subjectInput.fill("Биология");
    await page.locator('[data-slot="combobox-content"]').getByText("Биология").click();

    await page.locator("#inline-create-min-grade").fill("7");
    await page.locator("#inline-create-max-grade").fill("9");
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByText("Компетенция добавлена")).toBeVisible();
    await expect(subjectRow(page, "Биология")).toBeVisible();
    await expect(page.getByText(/Всего предметов:\s*2/)).toBeVisible();

    await subjectRow(page, "Биология").getByRole("button", { name: "Удалить компетенцию" }).click();
    await page.getByRole("button", { name: "Удалить" }).click();
    await expect(subjectRow(page, "Биология")).toHaveCount(0);
  });

  test("updates class range inline", async ({ page }) => {
    const mathRow = subjectRow(page, "Математика");

    await mathRow.getByRole("button", { name: "3" }).click();
    const minGradeInput = mathRow.locator("input").first();
    await expect(minGradeInput).toBeVisible();
    await minGradeInput.fill("2");
    await minGradeInput.press("Enter");

    await expect(page.getByText("Диапазон классов обновлен")).toBeVisible();
    await expect(subjectRow(page, "Математика").getByRole("button", { name: "2" })).toBeVisible();

    await subjectRow(page, "Математика").getByRole("button", { name: "2" }).click();
    const restoreInput = subjectRow(page, "Математика").locator("input").first();
    await restoreInput.fill("3");
    await restoreInput.press("Enter");
    await expect(subjectRow(page, "Математика").getByRole("button", { name: "3" })).toBeVisible();
  });

  test("deletes competency with confirmation dialog", async ({ page }) => {
    const row = subjectRow(page, "Математика");
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Удалить компетенцию" }).click();
    const confirmDialog = page.getByRole("alertdialog");
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Удалить" }).click();
    await expect(confirmDialog).not.toBeVisible();

    await expect(page.getByText("Компетенция удалена")).toBeVisible();
    await expect(subjectRow(page, "Математика")).toHaveCount(0);

    await page.getByRole("button", { name: "Добавить предмет" }).click();
    const subjectInput = page.getByPlaceholder("Выберите предмет");
    await subjectInput.fill("Математика");
    await page.locator('[data-slot="combobox-content"]').getByText("Математика").click();
    await page.locator("#inline-create-min-grade").fill("3");
    await page.locator("#inline-create-max-grade").fill("4");
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(subjectRow(page, "Математика")).toBeVisible();
  });

  test("existing row does not allow editing subject field", async ({ page }) => {
    const mathRow = subjectRow(page, "Математика");
    await expect(mathRow).toBeVisible();

    await expect(mathRow.getByPlaceholder("Выберите предмет")).toHaveCount(0);
    await mathRow.getByRole("button", { name: "3" }).click();
    await expect(mathRow.getByPlaceholder("Выберите предмет")).toHaveCount(0);
  });
});
