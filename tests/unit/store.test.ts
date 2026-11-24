import { describe, expect, it } from "vitest";
import { isChoreScheduled } from "@/lib/date";
import { blankDraft, guessFromTitle } from "@/lib/store";
import type { Chore } from "@/lib/types";

describe("guessFromTitle", () => {
  it.each([
    ["להפעיל מכונת כביסה", "cleaning", "🧺"],
    ["לשטוף כלים", "cleaning", "🍽️"],
    ["קניות בסופר", "errand", "🛒"],
    ["לסדר את המקרר", "organization", "✨"],
    ["ניקוי המקרר", "cleaning", "✨"],
    ["סידור המטבח", "organization", "✨"],
    ["סידור ארון בגדים", "organization", "👕"],
    ["להחליף נורה במטבח", "maintenance", "🔧"],
    ["להשקות עציצים", "other", "🌿"],
  ])("%s → %s", (title, category, icon) => {
    const guess = guessFromTitle(title);
    expect(guess.category).toBe(category);
    if (icon !== "✨") expect(guess.icon).toBe(icon);
  });
});

describe("blankDraft", () => {
  it("starts on the day the task is added", () => {
    const draft = blankDraft("2026-11-26");
    expect(draft.startDate).toBe("2026-11-26");
    expect(draft.oneOffDate).toBe("2026-11-26");
    expect(draft.weekdays).toEqual([4]);
  });

  it("does not show a weekly task before its start date", () => {
    const chore = {
      active: true,
      frequency: "weekly",
      weekdays: [4],
      oneOffDate: null,
      startDate: "2026-11-26",
      endDate: null,
    } as unknown as Chore;
    expect(isChoreScheduled(chore, "2026-11-19")).toBe(false);
    expect(isChoreScheduled(chore, "2026-11-26")).toBe(true);
    expect(isChoreScheduled(chore, "2026-12-03")).toBe(true);
  });
});
