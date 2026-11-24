import { describe, expect, it } from "vitest";
import {
  completionFor,
  choresForDate,
  isChoreScheduled,
  weekDays,
} from "@/lib/date";
import type { Chore, Household } from "@/lib/types";

const household: Household = {
  id: "house",
  name: "בית",
  timezone: "Asia/Jerusalem",
  weekStart: 0,
  ownerId: "owner",
};

const weekly: Chore = {
  id: "weekly",
  householdId: "house",
  title: "כביסה",
  description: "",
  category: "cleaning",
  icon: "🧺",
  color: "#dcefe1",
  assignedMemberId: null,
  active: true,
  sortOrder: 1,
  frequency: "weekly",
  weekdays: [1, 4],
  oneOffDate: null,
  startDate: null,
  endDate: null,
};

describe("weekly planner dates", () => {
  it("builds a Sunday-to-Saturday week", () => {
    const days = weekDays(new Date("2026-11-25T12:00:00"), household);
    expect(days).toHaveLength(7);
    expect(days[0].date).toBe("2026-11-22");
    expect(days[6].date).toBe("2026-11-28");
  });

  it("matches recurring chores only on selected weekdays", () => {
    expect(isChoreScheduled(weekly, "2026-11-23")).toBe(true);
    expect(isChoreScheduled(weekly, "2026-11-24")).toBe(false);
    expect(choresForDate([weekly], "2026-11-26")).toEqual([weekly]);
  });

  it("supports a one-off chore and date bounds", () => {
    const oneOff = { ...weekly, frequency: "one_off" as const, weekdays: [], oneOffDate: "2026-12-01" };
    expect(isChoreScheduled(oneOff, "2026-12-01")).toBe(true);
    expect(isChoreScheduled(oneOff, "2026-12-02")).toBe(false);
    expect(isChoreScheduled({ ...weekly, startDate: "2026-12-01" }, "2026-11-30")).toBe(false);
  });

  it("matches every other week from the task start date", () => {
    const biweekly = {
      ...weekly,
      frequency: "biweekly" as const,
      weekdays: [4],
      startDate: "2026-11-26",
    };
    expect(isChoreScheduled(biweekly, "2026-11-26")).toBe(true);
    expect(isChoreScheduled(biweekly, "2026-12-03")).toBe(false);
    expect(isChoreScheduled(biweekly, "2026-12-10")).toBe(true);
  });

  it("matches the same day of the month", () => {
    const monthly = {
      ...weekly,
      frequency: "monthly" as const,
      weekdays: [],
      startDate: "2026-11-26",
    };
    expect(isChoreScheduled(monthly, "2026-11-26")).toBe(true);
    expect(isChoreScheduled(monthly, "2026-12-26")).toBe(true);
    expect(isChoreScheduled(monthly, "2027-01-25")).toBe(false);
  });

  it("finds completion by occurrence date, not just chore", () => {
    const completion = {
      id: "completion",
      choreId: "weekly",
      occurrenceDate: "2026-11-23",
      status: "completed" as const,
      completedBy: "member",
      completedAt: "2026-11-23T10:00:00.000Z",
    };
    expect(completionFor([completion], "weekly", "2026-11-23")).toEqual(completion);
    expect(completionFor([completion], "weekly", "2026-11-26")).toBeUndefined();
  });
});
