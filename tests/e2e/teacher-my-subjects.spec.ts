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
    await expect(page.getByText("Английский язык")).toBeVisible();
    await expect(page.getByText("Классный час")).toBeVisible();
    await expect(page.getByText(/Всего предметов:\s*2/)).toBeVisible();
  });

  test("creates competency with inline row", async ({ page }) => {
    await page.getByRole("button", { name: "Добавить предмет" }).click();

    const subjectInput = page.getByPlaceholder("Выберите предмет");
    await expect(subjectInput).toBeVisible();
    await subjectInput.fill("Медиастудия");
    await page.locator('[data-slot="combobox-content"]').getByText("Медиастудия").click();

    await page.locator("#inline-create-min-grade").fill("7");
    await page.locator("#inline-create-max-grade").fill("9");
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByText("Компетенция добавлена")).toBeVisible();
    await expect(subjectRow(page, "Медиастудия")).toBeVisible();
    await expect(page.getByText(/Всего предметов:\s*3/)).toBeVisible();

    await subjectRow(page, "Медиастудия").getByRole("button", { name: "Удалить компетенцию" }).click();
    await page.getByRole("button", { name: "Удалить" }).click();
    await expect(subjectRow(page, "Медиастудия")).toHaveCount(0);
  });

  test("updates class range inline", async ({ page }) => {
    const englishRow = subjectRow(page, "Английский язык");

    await englishRow.getByRole("button", { name: "5" }).click();
    const minGradeInput = englishRow.locator("input").first();
    await expect(minGradeInput).toBeVisible();
    await minGradeInput.fill("4");
    await minGradeInput.press("Enter");

    await expect(page.getByText("Диапазон классов обновлен")).toBeVisible();
    await expect(subjectRow(page, "Английский язык").getByRole("button", { name: "4" })).toBeVisible();

    await subjectRow(page, "Английский язык").getByRole("button", { name: "4" }).click();
    const restoreInput = subjectRow(page, "Английский язык").locator("input").first();
    await restoreInput.fill("5");
    await restoreInput.press("Enter");
    await expect(subjectRow(page, "Английский язык").getByRole("button", { name: "5" })).toBeVisible();
  });

  test("deletes competency with confirmation dialog", async ({ page }) => {
    const row = subjectRow(page, "Классный час");
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Удалить компетенцию" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Удалить" }).click();

    await expect(page.getByText("Компетенция удалена")).toBeVisible();
    await expect(subjectRow(page, "Классный час")).toHaveCount(0);

    await page.getByRole("button", { name: "Добавить предмет" }).click();
    const subjectInput = page.getByPlaceholder("Выберите предмет");
    await subjectInput.fill("Классный час");
    await page.locator('[data-slot="combobox-content"]').getByText("Классный час").click();
    await page.locator("#inline-create-min-grade").fill("0");
    await page.locator("#inline-create-max-grade").fill("11");
    await page.getByRole("button", { name: "Сохранить" }).click();
    await expect(subjectRow(page, "Классный час")).toBeVisible();
  });

  test("existing row does not allow editing subject field", async ({ page }) => {
    const englishRow = subjectRow(page, "Английский язык");
    await expect(englishRow).toBeVisible();

    await expect(englishRow.getByPlaceholder("Выберите предмет")).toHaveCount(0);
    await englishRow.getByRole("button", { name: "5" }).click();
    await expect(englishRow.getByPlaceholder("Выберите предмет")).toHaveCount(0);
  });
});
