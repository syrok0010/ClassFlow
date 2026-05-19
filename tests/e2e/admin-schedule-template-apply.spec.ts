import { expect, test } from "@playwright/test";

const startDate = "2031-02-03";
const endDate = "2031-02-07";

test.describe("Admin schedule template apply", () => {
  test("applies weekly template and confirms overwrite when entries exist", async ({ page }) => {
    await page.goto("/admin/schedule");

    await expect(page.getByRole("button", { name: "Применить шаблон" })).toBeVisible();

    await page.getByRole("button", { name: "Применить шаблон" }).click();
    await page.getByLabel("Дата начала").fill(startDate);
    await page.getByLabel("Дата окончания").fill(endDate);

    await expect(page.getByText("В выбранном периоде нет записей для перезаписи.")).toBeVisible();

    await page.getByRole("button", { name: "Применить", exact: true }).click();
    await expect(page.getByText(/Расписание создано:/)).toBeVisible();

    await page.getByRole("button", { name: "Применить шаблон" }).click();
    await page.getByLabel("Дата начала").fill(startDate);
    await page.getByLabel("Дата окончания").fill(endDate);

    await expect(page.getByText(/Будет перезаписано записей: [1-9]\d*/)).toBeVisible();

    await page.getByRole("button", { name: "Применить", exact: true }).click();
    const overwriteDialog = page.getByRole("alertdialog");
    await expect(overwriteDialog).toBeVisible();
    await overwriteDialog.getByRole("button", { name: "Отмена" }).click();
    await expect(overwriteDialog).not.toBeVisible();

    await page.getByRole("button", { name: "Применить", exact: true }).click();
    await expect(overwriteDialog).toBeVisible();
    await overwriteDialog.getByRole("button", { name: "Перезаписать" }).click();
    await expect(page.getByText(/перезаписано: [1-9]\d*/)).toBeVisible();
  });
});
