import { expect, test } from "@playwright/test";

test.describe("Rooms smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/rooms");
    await expect(page).toHaveURL(/\/admin\/rooms$/);
  });

  test("renders rooms workspace with seeded buildings and rooms", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Здания", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Все здания: 4 кабинетов" })).toBeVisible();
    await expect(page.getByPlaceholder("Поиск кабинета...")).toBeVisible();
    await expect(page.getByPlaceholder(">= мест")).toBeVisible();

    await expect(page.getByRole("link", { name: /Главный корпус/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Лабораторный корпус/ })).toBeVisible();
    await expect(page.getByText("Кабинет 101")).toBeVisible();
    await expect(page.getByText("Кабинет 102")).toBeVisible();
    await expect(page.getByText("Лаборатория робототехники")).toBeVisible();
  });

  test("filters rooms by building and search query", async ({ page }) => {
    await page.getByRole("link", { name: /Главный корпус/ }).click();

    await expect(page.getByRole("heading", { name: "Главный корпус: 2 кабинетов" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Добавить кабинет" })).toBeVisible();
    await expect(page.getByText("Кабинет 101")).toBeVisible();
    await expect(page.getByText("Кабинет 102")).toBeVisible();
    await expect(page.getByText("Лаборатория робототехники")).not.toBeVisible();

    await page.getByPlaceholder("Поиск кабинета...").fill("102");

    await expect(page).toHaveURL(/search=102/);
    await expect(page.getByText("Кабинет 102")).toBeVisible();
    await expect(page.getByText("Кабинет 101")).not.toBeVisible();
  });
});
