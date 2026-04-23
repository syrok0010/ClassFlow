import { expect, test, type Page } from "@playwright/test";

function groupRow(page: Page, name: string) {
  return page.getByRole("row").filter({ hasText: name });
}

test.describe("Admin groups", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/groups");
    await expect(page).toHaveURL(/\/admin\/groups$/);
  });

  test("renders seeded groups and supports toolbar filters", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Справочник групп и классов" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Добавить класс/группу" })
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Поиск по названию...")
    ).toBeVisible();

    await expect(page.getByText("10 А")).toBeVisible();
    await expect(page.getByText("10 Б")).toBeVisible();
    await expect(page.getByText("Робототехника")).toBeVisible();

    await page.getByRole("radio", { name: "Кружки" }).click();
    await expect(page).toHaveURL(/type=ELECTIVE_GROUP/);
    await expect(page.getByText("Робототехника")).toBeVisible();
    await expect(page.getByText("10 А")).not.toBeVisible();
    await expect(page.getByText("10 Б")).not.toBeVisible();

    await page.getByRole("radio", { name: "Все" }).click();
    await expect(page).toHaveURL(/\/admin\/groups$/);

    await page.getByPlaceholder("Поиск по названию...").fill("10 Б");
    await expect(page).toHaveURL(/search=10\+%D0%91|search=10%20%D0%91/);
    await expect(page.getByText("10 Б")).toBeVisible();
    await expect(page.getByText("10 А")).not.toBeVisible();
    await expect(page.getByText("Робототехника")).not.toBeVisible();
  });

  test("creates a class with inline row", async ({ page }) => {
    const groupName = `11 E2E ${Date.now()}`;
    const addButton = page.getByRole("button", { name: "Добавить класс/группу" });
    const nameInput = page.getByPlaceholder("Название (напр. 10А)");

    await expect(addButton).toBeVisible();
    await addButton.click();
    await expect(nameInput).toBeVisible();
    await nameInput.fill(groupName);
    await page.getByPlaceholder("Параллель").fill("11");
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByText(groupName)).toBeVisible();
    await expect(groupRow(page, groupName).getByText("11 класс")).toBeVisible();
  });

  test("renames a group with inline edit", async ({ page }) => {
    const initialName = "10 Б";
    const nextName = `10 Rename ${Date.now()}`;

    const createdRow = groupRow(page, initialName);
    await expect(createdRow).toBeVisible();

    await createdRow
      .getByTitle("Двойной клик для переименования")
      .dblclick({ force: true });

    const renameInput = page.getByRole("textbox").nth(1);
    await expect(renameInput).toBeVisible();
    await renameInput.fill(nextName);
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByText("Группа переименована")).toBeVisible();
    const renamedRow = groupRow(page, nextName);
    await expect(renamedRow).toBeVisible();

    await renamedRow
      .getByTitle("Двойной клик для переименования")
      .dblclick({ force: true });

    const revertInput = page.getByRole("textbox").nth(1);
    await expect(revertInput).toBeVisible();
    await revertInput.fill(initialName);
    await page.getByRole("button", { name: "Сохранить" }).click();

    await expect(page.getByText("Группа переименована")).toBeVisible();
    await expect(groupRow(page, initialName)).toBeVisible();
  });

  test("splits a seeded class into subject subgroups", async ({ page }) => {
    const openSplitterButton = groupRow(page, "10 А").getByRole("button", {
      name: "Разделить на подгруппы",
    });
    const dialog = page.getByRole("dialog");
    await openSplitterButton.click();
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Разделить на подгруппы: 10 А")).toBeVisible();

    await dialog.locator('[data-slot="select-trigger"]').click();
    await page.locator('[data-slot="select-content"]').getByText("Английский язык").click();
    await dialog.getByRole("button", { name: "Далее" }).click();

    const saveButton = dialog.getByRole("button", {
      name: "Сохранить и создать подгруппы",
    });
    await expect(saveButton).toBeDisabled();

    await dialog.getByRole("button", { name: "Разделить поровну" }).click();
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.getByText("Подгруппы созданы")).toBeVisible();
    await expect(dialog).not.toBeVisible();

    await groupRow(page, "10 А").getByRole("button").first().click();
    await expect(page.getByText("10 А Английский язык 1")).toBeVisible();
    await expect(page.getByText("10 А Английский язык 2")).toBeVisible();
  });

  test("edits existing subgroups composition", async ({ page }) => {
    await groupRow(page, "10 А")
      .getByRole("button", { name: "Разделить на подгруппы" })
      .click();

    const splitDialog = page.getByRole("dialog");
    await expect(splitDialog.getByText("Разделить на подгруппы: 10 А")).toBeVisible();

    await splitDialog.locator('[data-slot="select-trigger"]').click();
    await page.locator('[data-slot="select-content"]').getByText("Робототехника").click();
    await splitDialog.getByRole("button", { name: "Далее" }).click();
    await splitDialog.getByRole("button", { name: "Разделить поровну" }).click();
    await splitDialog
      .getByRole("button", { name: "Сохранить и создать подгруппы" })
      .click();

    await expect(page.getByText("Подгруппы созданы")).toBeVisible();

    await groupRow(page, "10 А").getByRole("button").first().click();

    const subgroupRow = groupRow(page, "10 А Робототехника 1");
    await subgroupRow.getByRole("button", { name: /\d+ чел\./ }).click();

    const editorDialog = page.getByRole("dialog");
    await expect(
      editorDialog.getByText("Редактирование подгрупп: 10 А (Робототехника)")
    ).toBeVisible();

    const saveButton = editorDialog.getByRole("button", { name: "Сохранить" });
    await expect(saveButton).toBeDisabled();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await editorDialog.getByRole("button", { name: "Перемешать поровну" }).click();
      if (await saveButton.isEnabled()) {
        break;
      }
    }

    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect(page.getByText("Состав подгрупп обновлен")).toBeVisible();
    await expect(editorDialog).not.toBeVisible();
  });

  test("opens elective assignment dialog and filters available students by class", async ({
    page,
  }) => {
    const openStudentsButton = groupRow(page, "Робототехника").getByRole("button", {
      name: "1 чел.",
    });

    const dialog = page.getByRole("dialog");
    await openStudentsButton.click();
    await expect(dialog.getByText("Состав: Робототехника")).toBeVisible();

    await expect(
      dialog.getByRole("heading", { name: "Состав: Робототехника" })
    ).toBeVisible();
    await expect(dialog.getByText("Все ученики")).toBeVisible();
    await expect(dialog.getByText("Состав Робототехника")).toBeVisible();

    await dialog.locator('[data-slot="select-trigger"]').click();
    await page.locator('[data-slot="select-content"]').getByText("10 Б").click();

    await expect(dialog.getByText("Смирнов Павел Олегович")).toBeVisible();
    await expect(dialog.getByText("Петров Иван Ильич")).not.toBeVisible();
    await expect(dialog.getByText("Соколова Мария Андреевна")).not.toBeVisible();
  });
});
