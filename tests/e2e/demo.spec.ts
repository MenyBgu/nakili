import { expect, test, type Page } from "@playwright/test";

async function openAddSheet(page: Page) {
  const fab = page.locator(".fab");
  if (await fab.isVisible()) await fab.click();
  else await page.locator(".add-row").click();
  await expect(page.getByRole("dialog", { name: "משימה חדשה" })).toBeVisible();
}

test("the demo opens the weekly planner", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo")).toContainText("כל הזכויות שמורות למני בוגנים");
  await page.getByRole("button", { name: "רק להציץ בדוגמה" }).click();
  await expect(page.getByRole("heading", { name: /שלום/ })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toContainText("כל הזכויות שמורות למני בוגנים");
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
  await page.getByText("עוד אפשרויות").click();
  await expect(page.getByLabel("תאריך התחלה")).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
  await page.getByLabel("מה צריך לעשות?").fill("קניות לשבת");
  await page.getByRole("button", { name: "פעם בשבועיים" }).click();
  await page.getByRole("button", { name: "שמירה" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  const quickDeleteTask = page.locator(".task", { hasText: "קניות לשבת" });
  await expect(quickDeleteTask).toContainText("סידורים");
  page.once("dialog", (dialog) => dialog.accept());
  await quickDeleteTask.getByRole("button", { name: "מחיקת קניות לשבת" }).click();
  await expect(quickDeleteTask).toBeHidden();

  await openAddSheet(page);
  await page.getByLabel("מה צריך לעשות?").fill("ניקוי חודשי");
  await page.getByRole("button", { name: "פעם בחודש" }).click();
  await expect(page.getByLabel("תאריך ראשון")).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
  await expect(page.getByText(/חוזר בכל חודש ב־\d+ לחודש/)).toBeVisible();
  await page.getByRole("button", { name: "שמירה" }).click();
  await expect(page.locator(".task", { hasText: "ניקוי חודשי" })).toBeVisible();

  await openAddSheet(page);
  await page.getByLabel("מה צריך לעשות?").fill("השקיית עציצים");
  await page.getByRole("button", { name: "שמירה" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  const task = page.locator(".task", { hasText: "השקיית עציצים" });
  await expect(task).toBeVisible();
  await expect(task.locator(".task-icon")).toHaveText("🌿");

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

  await page.getByRole("button", { name: "הוספת בן/בת בית" }).click();
  await page.getByLabel("שם בן/בת הבית").fill("נועה");
  await page.getByRole("button", { name: "הוספה" }).click();
  await expect(page.locator(".member-name", { hasText: "נועה" })).toBeVisible();

  await page.getByRole("button", { name: "שינוי שם הבית" }).click();
  await page.getByLabel("שינוי שם הבית").fill("הבית החדש של דנה");
  await page.getByRole("button", { name: "שמירה" }).click();
  await expect(page.locator(".brand small")).toHaveText("הבית החדש של דנה");

  await page.getByRole("button", { name: "לשבוע" }).click();
  await page.locator(".task", { hasText: "השקיית עציצים במרפסת" }).getByRole("button", { name: /עריכת/ }).click();
  await page.getByText("עוד אפשרויות").click();
  await page.getByRole("button", { name: "נועה" }).click();
  await page.getByRole("button", { name: "שמירה" }).click();
  await expect(page.locator(".task", { hasText: "השקיית עציצים במרפסת" })).toContainText("נועה");

  await page.getByRole("button", { name: "הגדרות" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "הסרת נועה" }).click();
  await expect(page.locator(".member-name", { hasText: "נועה" })).toBeHidden();
});

test("the summary screen reflects completed tasks", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "יצירת בית חדש" }).click();
  await page.getByLabel("שם הבית").fill("הבית של רון");
  await page.getByLabel("איך לקרוא לך?").fill("רון");
  await page.getByText("להתחיל עם כמה משימות לדוגמה").click();
  await page.getByRole("button", { name: "יצירת הבית" }).click();
  await page.getByRole("button", { name: "שמרתי, אפשר להמשיך" }).click();

  await page.getByRole("button", { name: "סיכום" }).click();
  await expect(page.getByRole("heading", { name: "סיכום" })).toBeVisible();
  await expect(page.getByText("עוד לא סומנו משימות")).toBeVisible();
  await page.getByRole("button", { name: "לשבוע" }).click();

  await openAddSheet(page);
  await page.getByLabel("מה צריך לעשות?").fill("שטיפת כלים");
  await page.getByRole("button", { name: "שמירה" }).click();
  await page.getByRole("button", { name: "סימון כבוצע: שטיפת כלים" }).click();

  await page.getByRole("button", { name: "סיכום" }).click();
  await expect(page.getByTestId("stats-completed")).toHaveText("משימה אחת בוצעה");
  await expect(page.locator(".people-list")).toContainText("רון");
  await expect(page.locator(".top-chores")).toContainText("שטיפת כלים");
  await expect(page.getByText("יום מלא אחד")).toBeVisible();

  await page.getByRole("button", { name: "הכול" }).click();
  await expect(page.getByTestId("stats-completed")).toHaveText("משימה אחת בוצעה");
  await page.getByRole("button", { name: "לשבוע" }).click();
  await expect(page.getByRole("heading", { name: "שלום, רון" })).toBeVisible();
});

test("a task note is visible in the list without opening the task", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "יצירת בית חדש" }).click();
  await page.getByLabel("שם הבית").fill("הבית של גל");
  await page.getByLabel("איך לקרוא לך?").fill("גל");
  await page.getByText("להתחיל עם כמה משימות לדוגמה").click();
  await page.getByRole("button", { name: "יצירת הבית" }).click();
  await page.getByRole("button", { name: "שמרתי, אפשר להמשיך" }).click();

  await openAddSheet(page);
  // The note field sits in the main form, not hidden under "more options".
  await expect(page.getByLabel("הערה")).toBeVisible();
  await page.getByLabel("מה צריך לעשות?").fill("הוצאת פחים");
  const longNote = "לא לשכוח את פח הקרטון, הוא יוצא רק ביום שלישי, ולסגור היטב את השקיות כדי שהחתולים לא יפתחו אותן";
  await page.getByLabel("הערה").fill(longNote);
  await page.getByRole("button", { name: "שמירה" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  const task = page.locator(".task", { hasText: "הוצאת פחים" });
  const note = task.locator(".task-note");
  await expect(note).toBeVisible();
  await expect(note).toContainText("לא לשכוח את פח הקרטון");
  await expect(note).toHaveAttribute("aria-expanded", "false");

  await note.click();
  await expect(note).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("dialog")).toBeHidden();
  await note.click();
  await expect(note).toHaveAttribute("aria-expanded", "false");

  // Tasks without a note show no note strip, and the note survives a refresh.
  await openAddSheet(page);
  await page.getByLabel("מה צריך לעשות?").fill("השקיית עציצים");
  await page.getByRole("button", { name: "שמירה" }).click();
  await expect(page.locator(".task", { hasText: "השקיית עציצים" }).locator(".task-note")).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".task", { hasText: "הוצאת פחים" }).locator(".task-note")).toContainText("פח הקרטון");
});

test("saving with something missing explains what to fix, next to the field", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "יצירת בית חדש" }).click();
  await page.getByLabel("שם הבית").fill("הבית של מור");
  await page.getByLabel("איך לקרוא לך?").fill("מור");
  await page.getByText("להתחיל עם כמה משימות לדוגמה").click();
  await page.getByRole("button", { name: "יצירת הבית" }).click();
  await page.getByRole("button", { name: "שמרתי, אפשר להמשיך" }).click();

  await openAddSheet(page);
  await page.getByRole("button", { name: "שמירה" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".field-error")).toContainText("כתבו מה צריך לעשות");
  await expect(page.getByLabel("מה צריך לעשות?")).toBeFocused();

  // The message disappears as soon as the field is fixed.
  await page.getByLabel("מה צריך לעשות?").fill("סידור ארון");
  await expect(dialog.locator(".field-error")).toHaveCount(0);

  // Weekly without any day.
  const todayName = await dialog.locator(".weekday-picker button[aria-pressed=true]").first().getAttribute("aria-label");
  await dialog.getByRole("button", { name: todayName as string }).click();
  await page.getByRole("button", { name: "שמירה" }).click();
  await expect(dialog.locator(".field-error")).toContainText("בחרו לפחות יום אחד");
  await dialog.getByRole("button", { name: todayName as string }).click();
  await expect(dialog.locator(".field-error")).toHaveCount(0);

  await page.getByRole("button", { name: "שמירה" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".task", { hasText: "סידור ארון" })).toBeVisible();
});
