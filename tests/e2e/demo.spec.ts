import { expect, test, type Page } from "@playwright/test";

async function openAddSheet(page: Page) {
  const fab = page.locator(".fab");
  if (await fab.isVisible()) await fab.click();
  else await page.locator(".add-row").click();
  await expect(page.getByRole("dialog", { name: "משימה חדשה" })).toBeVisible();
}

test("the demo opens the weekly planner", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "רק להציץ בדוגמה" }).click();
  await expect(page.getByRole("heading", { name: /שלום/ })).toBeVisible();
  await expect(page.getByText("זה בית לדוגמה")).toBeVisible();
  await expect(page.locator(".day-chip")).toHaveCount(7);

  await page.getByRole("button", { name: /^חמישי/ }).click();
  await expect(page.getByText("קניות לבית")).toBeVisible();
  await expect(page.getByText("מכונת כביסה")).toBeVisible();
  await page.getByRole("button", { name: /^שבת/ }).click();
  await expect(page.getByText("סידור המזווה")).toBeVisible();
});

test("creating a household shows the code, then tasks can be managed", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "יצירת בית חדש" }).click();
  await page.getByLabel("שם הבית").fill("הבית של דנה");
  await page.getByLabel("איך לקרוא לך?").fill("דנה");
  await page.getByText("להתחיל עם כמה משימות לדוגמה").click();
  await page.getByRole("button", { name: "יצירת הבית" }).click();

  await expect(page.getByRole("heading", { name: "הבית של דנה מוכן!" })).toBeVisible();
  await expect(page.locator(".code-box code")).toHaveText(/^NKI-/);
  await page.getByRole("button", { name: "שמרתי, אפשר להמשיך" }).click();

  await expect(page.getByRole("heading", { name: "שלום, דנה" })).toBeVisible();
  await expect(page.getByText("אין משימות ביום הזה")).toBeVisible();

  await openAddSheet(page);
  await page.getByLabel("מה צריך לעשות?").fill("השקיית עציצים");
  await page.getByRole("button", { name: /סידורים/ }).click();
  await page.getByRole("button", { name: "שמירה" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  const task = page.locator(".task", { hasText: "השקיית עציצים" });
  await expect(task).toBeVisible();
  await expect(task).toContainText("סידורים");

  await task.getByRole("button", { name: "סימון כבוצע: השקיית עציצים" }).click();
  await expect(task).toHaveClass(/completed/);
  await task.getByRole("button", { name: "ביטול סימון: השקיית עציצים" }).click();
  await expect(task).not.toHaveClass(/completed/);

  await task.getByRole("button", { name: "דילוג על השקיית עציצים" }).click();
  await expect(task).toHaveClass(/skipped/);
  await task.getByRole("button", { name: "ביטול דילוג: השקיית עציצים" }).click();
  await expect(task).not.toHaveClass(/skipped/);

  await task.getByRole("button", { name: "עריכת השקיית עציצים" }).click();
  await page.getByLabel("מה צריך לעשות?").fill("השקיית עציצים במרפסת");
  await page.getByRole("button", { name: "שמירה" }).click();
  await expect(page.getByText("השקיית עציצים במרפסת")).toBeVisible();

  await page.reload();
  await expect(page.getByText("השקיית עציצים במרפסת")).toBeVisible();

  await page.getByRole("button", { name: "הגדרות" }).click();
  await expect(page.getByRole("heading", { name: "הגדרות" })).toBeVisible();
  await expect(page.getByText("דנה (אני)")).toBeVisible();
});
