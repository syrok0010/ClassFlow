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
    await expect(page.getByText(/Всего предметов:\s*1/)).toBeVisible();
    await expect(page.getByText(/Основные:\s*1/)).toBeVisible();
    await expect(page.getByText("Математика")).toBeVisible();
    await expect(page.getByText("Основной")).toBeVisible();
  });

  test("filters competencies by search and subject type", async ({ page }) => {
    const searchInput = page.getByPlaceholder("Поиск по названию предмета...");

    await searchInput.fill("Матем");
    await expect(page).toHaveURL(/search=/);
    await expect(page.getByText("Математика")).toBeVisible();

    await searchInput.fill("");
    await page.getByRole("radio", { name: "Доп. обязательные" }).click();
    await expect(page.getByText("Математика")).not.toBeVisible();
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
});
