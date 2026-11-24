import { describe, expect, it } from "vitest";
import { computeStats, FORMER_MEMBER } from "@/lib/stats";
import type { Chore, Completion, NakiliStore } from "@/lib/types";

// 2026-11-26 is a Thursday.
const TODAY = "2026-11-26";

const chore = (id: string, overrides: Partial<Chore> = {}): Chore => ({
  id,
  householdId: "h",
  title: `משימה ${id}`,
  description: "",
  category: "cleaning",
  icon: "🧽",
  color: "#dcefe1",
  assignedMemberId: null,
  active: true,
  sortOrder: 1,
  frequency: "weekly",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  oneOffDate: null,
  startDate: null,
  endDate: null,
  ...overrides,
});

const mark = (choreId: string, date: string, by: string | null, status: Completion["status"] = "completed"): Completion => ({
  id: `${choreId}-${date}`,
  choreId,
  occurrenceDate: date,
  status,
  completedBy: by,
  completedAt: `${date}T10:00:00Z`,
});

const store = (chores: Chore[], completions: Completion[]): NakiliStore => ({
  household: { id: "h", name: "בית", timezone: "Asia/Jerusalem", weekStart: 0, ownerId: "a" },
  members: [
    { id: "a", userId: "ua", householdId: "h", nickname: "אבא", role: "owner" },
    { id: "b", userId: "ub", householdId: "h", nickname: "נועה", role: "member" },
  ],
  chores,
  completions,
  currentMemberId: "a",
});

describe("computeStats", () => {
  it("is empty for a brand new household", () => {
    const stats = computeStats(store([chore("1")], []), "week", TODAY);
    expect(stats.completed).toBe(0);
    expect(stats.rate).toBeNull();
    expect(stats.perMember).toEqual([]);
    expect(stats.streak).toBe(0);
    expect(stats.leader).toBeNull();
  });

  it("counts completions per person and names the leader", () => {
    const stats = computeStats(
      store([chore("1")], [
        mark("1", "2026-11-22", "a"),
        mark("1", "2026-11-23", "a"),
        mark("1", "2026-11-24", "b"),
      ]),
      "week",
      TODAY,
    );
    expect(stats.completed).toBe(3);
    expect(stats.perMember.map((m) => [m.name, m.count])).toEqual([["אבא", 2], ["נועה", 1]]);
    expect(stats.perMember[0].share).toBeCloseTo(2 / 3);
    expect(stats.leader).toBe("אבא");
  });

  it("does not crown a leader on a tie", () => {
    const stats = computeStats(
      store([chore("1")], [mark("1", "2026-11-22", "a"), mark("1", "2026-11-23", "b")]),
      "week",
      TODAY,
    );
    expect(stats.leader).toBeNull();
  });

  it("groups removed members and ignores deleted tasks", () => {
    const stats = computeStats(
      store([chore("1")], [mark("1", "2026-11-23", "gone"), mark("zzz", "2026-11-23", "a")]),
      "week",
      TODAY,
    );
    expect(stats.completed).toBe(1);
    expect(stats.perMember[0].name).toBe(FORMER_MEMBER);
  });

  it("limits the week to the current week and the month to the current month", () => {
    const completions = [
      mark("1", "2026-11-21", "a"), // Saturday of last week
      mark("1", "2026-11-22", "a"), // Sunday, week start
      mark("1", "2026-11-02", "a"),
      mark("1", "2026-10-30", "a"),
    ];
    expect(computeStats(store([chore("1")], completions), "week", TODAY).completed).toBe(1);
    expect(computeStats(store([chore("1")], completions), "month", TODAY).completed).toBe(3);
    expect(computeStats(store([chore("1")], completions), "all", TODAY).completed).toBe(4);
  });

  it("computes the rate from due tasks, skipping skipped and today's open tasks", () => {
    // Sun-Wed due daily; Sunday done, Monday done, Tuesday skipped, Wednesday missed, Thursday (today) open.
    const stats = computeStats(
      store([chore("1")], [
        mark("1", "2026-11-22", "a"),
        mark("1", "2026-11-23", "a"),
        mark("1", "2026-11-24", "a", "skipped"),
      ]),
      "week",
      TODAY,
    );
    expect(stats.skipped).toBe(1);
    // due: Sun, Mon, Tue(skipped), Wed = 4, minus 1 skipped = 3, done = 2
    expect(stats.rate).toBe(67);
  });

  it("does not count days before the first mark against the household", () => {
    const stats = computeStats(store([chore("1")], [mark("1", "2026-11-25", "a")]), "month", TODAY);
    expect(stats.rate).toBe(100);
  });

  it("builds a streak of fully handled days", () => {
    const days = ["2026-11-23", "2026-11-24", "2026-11-25"];
    const streak = (completions: Completion[]) => computeStats(store([chore("1")], completions), "week", TODAY).streak;
    expect(streak(days.map((d) => mark("1", d, "a")))).toBe(3);
    // Today finished extends it; today still open does not break it.
    expect(streak([...days, TODAY].map((d) => mark("1", d, "a")))).toBe(4);
    // A gap ends it.
    expect(streak([mark("1", "2026-11-23", "a"), mark("1", "2026-11-25", "a")])).toBe(1);
  });

  it("counts weekdays and picks the top tasks", () => {
    const stats = computeStats(
      store([chore("1", { title: "כלים" }), chore("2", { title: "כביסה" })], [
        mark("1", "2026-11-22", "a"), // Sunday
        mark("1", "2026-11-23", "a"), // Monday
        mark("2", "2026-11-23", "b"),
      ]),
      "week",
      TODAY,
    );
    expect(stats.byWeekday).toEqual([1, 2, 0, 0, 0, 0, 0]);
    expect(stats.topChores.map((c) => [c.title, c.count])).toEqual([["כלים", 2], ["כביסה", 1]]);
  });
});
