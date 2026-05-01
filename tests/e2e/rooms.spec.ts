import { expect, test } from "@playwright/test";

test.describe("Rooms smoke", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/rooms");
    await expect(page).toHaveURL(/\/admin\/rooms$/);
  });

  test("renders rooms workspace with seeded buildings and rooms", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Здания", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Все здания: 27 кабинетов" })).toBeVisible();
    await expect(page.getByPlaceholder("Поиск кабинета...")).toBeVisible();
    await expect(page.getByPlaceholder(">= мест")).toBeVisible();

    await expect(page.getByRole("link", { name: /Главный корпус/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Спортивный корпус/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Творческий центр/ })).toBeVisible();
    await expect(page.getByText("Кабинет 3А")).toBeVisible();
    await expect(page.getByText("Кабинет математики")).toBeVisible();
    await expect(page.getByText("Медиа-центр")).toBeVisible();
  });

  test("filters rooms by building and search query", async ({ page }) => {
    await page.getByRole("link", { name: /Главный корпус/ }).click();

    await expect(page.getByRole("heading", { name: "Главный корпус: 16 кабинетов" })).toBeVisible();
    await expect(page.getByRole("button", { name: "+ Добавить кабинет" })).toBeVisible();
    await expect(page.getByText("Кабинет 3А")).toBeVisible();
    await expect(page.getByText("Кабинет математики")).toBeVisible();
    await expect(page.getByText("Медиа-центр")).not.toBeVisible();

    await page.getByPlaceholder("Поиск кабинета...").fill("математики");

    await expect(page).toHaveURL(/search=/);
    await expect(page.getByText("Кабинет математики")).toBeVisible();
    await expect(page.getByText("Кабинет 3А")).not.toBeVisible();
  });
});
