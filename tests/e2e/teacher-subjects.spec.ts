import { expect, test, type Page } from "@playwright/test";

const SEEDED_TEACHER_USER_ID = "e2e-teacher-user";

function subjectRow(page: Page, subjectName: string) {
  return page.getByRole("row").filter({ hasText: subjectName });
}

async function openTeachingPage(page: Page) {
  await page.goto(`/admin/users/${SEEDED_TEACHER_USER_ID}/teaching`);
  await expect(page).toHaveURL(
    new RegExp(`/admin/users/${SEEDED_TEACHER_USER_ID}/teaching$`)
  );
  await expect(
    page.getByRole("heading", { name: "Компетенции преподавателя" })
  ).toBeVisible();
}

test.describe("Admin teacher subjects", () => {
  test.beforeEach(async ({ page }) => {
    await openTeachingPage(page);
  });

  test("renders seeded teacher competencies page", async ({ page }) => {
    await expect(
      page.getByRole("main").getByRole("link", { name: "Пользователи" })
    ).toBeVisible();
    await expect(page.getByText("Иванов Иван Иванович", { exact: true })).toBeVisible();
    await expect(page.getByText(/teacher1@classflow\.local/)).toBeVisible();
    await expect(page.getByText(/Всего предметов:\s*2/)).toBeVisible();
    await expect(page.getByText(/Основные:\s*1/)).toBeVisible();
    await expect(page.getByText(/Режимные:\s*1/)).toBeVisible();
    await expect(page.getByText("Английский язык")).toBeVisible();
    await expect(page.getByText("Классный час")).toBeVisible();
    await expect(page.getByText("Основной")).toBeVisible();
    await expect(page.getByText("Режимный")).toBeVisible();
  });

  test("filters competencies by search and subject type", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Поиск по названию предмета...");

    await searchInput.fill("Англий");
    await expect(page).toHaveURL(/search=/);
    await expect(page.getByText("Английский язык")).toBeVisible();
    await expect(page.getByText("Классный час")).not.toBeVisible();

    await searchInput.fill("");
    await page.getByRole("radio", { name: "Режимные" }).click();
    await expect(page.getByText("Классный час")).toBeVisible();
    await expect(page.getByText("Английский язык")).not.toBeVisible();
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
  });
});
