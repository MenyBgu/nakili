import { expect, test } from "@playwright/test";

test("local demo opens the weekly planner", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "צפייה בדוגמה" }).click();
  await expect(page.getByRole("heading", { name: /שלום/ })).toBeVisible();
  await expect(page.getByText("השבוע שלי")).toBeVisible();
  await expect(page.getByText("מכונת כביסה").first()).toBeVisible();
});

test("a visitor can create a local household", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "יצירת בית חדש" }).click();
  await page.getByLabel("שם הבית").fill("הבית של דנה");
  await page.getByLabel("הכינוי שלי").fill("דנה");
  await page.getByRole("button", { name: "יצירת הבית וקבלת קוד" }).click();
  await expect(page.getByText("הבית של דנה")).toBeVisible();
  await expect(page.getByRole("heading", { name: /שלום, דנה/ })).toBeVisible();
});
