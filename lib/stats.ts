import { addDays } from "date-fns";
import { choresForDate, localDate, parseLocalDate, weekStartFor } from "@/lib/date";
import type { NakiliStore } from "@/lib/types";

export type StatsPeriod = "week" | "month" | "all";

export type MemberStat = {
  memberId: string | null;
  name: string;
  count: number;
  share: number;
};

export type ChoreStat = {
  choreId: string;
  title: string;
  icon: string;
  count: number;
};

export type Stats = {
  completed: number;
  skipped: number;
  /** Share of due tasks that were done, 0-100. Null when nothing was due yet. */
  rate: number | null;
  perMember: MemberStat[];
  /** Completions per weekday, index 0 = Sunday. */
  byWeekday: number[];
  topChores: ChoreStat[];
  /** Consecutive days (ending today/yesterday) where every due task was handled. */
  streak: number;
  /** Name of the member with the most completions, when there is a clear one. */
  leader: string | null;
};

export const FORMER_MEMBER = "בן/בת בית לשעבר";
const MAX_DAYS = 400;

function daysBetween(from: string, to: string) {
  const days: string[] = [];
  let cursor = parseLocalDate(from);
  const end = parseLocalDate(to);
  while (cursor <= end && days.length < MAX_DAYS) {
    days.push(localDate(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function periodStart(period: StatsPeriod, today: string, weekStart: 0 | 1) {
  const now = parseLocalDate(today);
  if (period === "week") return localDate(weekStartFor(now, weekStart));
  if (period === "month") return localDate(new Date(now.getFullYear(), now.getMonth(), 1, 12));
  return localDate(addDays(now, -(MAX_DAYS - 1)));
}

export function computeStats(
  store: NakiliStore,
  period: StatsPeriod,
  today = localDate(),
): Stats {
  const choreById = new Map(store.chores.map((chore) => [chore.id, chore]));
  // Ignore marks of tasks that no longer exist.
  const all = store.completions.filter((completion) => choreById.has(completion.choreId));
  const firstMark = all.map((completion) => completion.occurrenceDate).sort()[0];
  const rangeStart = periodStart(period, today, store.household.weekStart);
  const inRange = all.filter(
    (completion) => completion.occurrenceDate >= rangeStart && completion.occurrenceDate <= today,
  );

  const done = inRange.filter((completion) => completion.status === "completed");
  const skipped = inRange.filter((completion) => completion.status === "skipped").length;

  const memberName = new Map(store.members.map((member) => [member.id, member.nickname]));
  const memberCounts = new Map<string | null, number>();
  for (const completion of done) {
    const key = completion.completedBy && memberName.has(completion.completedBy) ? completion.completedBy : null;
    memberCounts.set(key, (memberCounts.get(key) ?? 0) + 1);
  }
  const perMember: MemberStat[] = [...memberCounts.entries()]
    .map(([memberId, count]) => ({
      memberId,
      name: memberId ? (memberName.get(memberId) as string) : FORMER_MEMBER,
      count,
      share: done.length ? count / done.length : 0,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "he"));

  const byWeekday = Array.from({ length: 7 }, () => 0);
  for (const completion of done) byWeekday[parseLocalDate(completion.occurrenceDate).getDay()] += 1;

  const choreCounts = new Map<string, number>();
  for (const completion of done) choreCounts.set(completion.choreId, (choreCounts.get(completion.choreId) ?? 0) + 1);
  const topChores: ChoreStat[] = [...choreCounts.entries()]
    .map(([choreId, count]) => {
      const chore = choreById.get(choreId)!;
      return { choreId, title: chore.title, icon: chore.icon, count };
    })
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, "he"))
    .slice(0, 3);

  // Rate: only days since the first mark count, so a new household is not "behind".
  let due = 0;
  let handled = 0;
  let skippedDue = 0;
  if (firstMark) {
    const from = rangeStart > firstMark ? rangeStart : firstMark;
    if (from <= today) {
      for (const day of daysBetween(from, today)) {
        for (const chore of choresForDate(store.chores, day)) {
          const mark = all.find((item) => item.choreId === chore.id && item.occurrenceDate === day);
          if (mark?.status === "skipped") skippedDue += 1;
          // Today's open tasks are still in progress, so they do not count against anyone.
          if (day === today && !mark) continue;
          due += 1;
          if (mark?.status === "completed") handled += 1;
        }
      }
    }
  }
  const countable = due - skippedDue;
  const rate = countable > 0 ? Math.min(100, Math.round((handled / countable) * 100)) : null;

  const named = perMember.filter((member) => member.memberId);
  const leader = named.length > 1 && named[0].count > named[1].count ? named[0].name : null;

  return {
    completed: done.length,
    skipped,
    rate,
    perMember,
    byWeekday,
    topChores,
    streak: computeStreak(store, all, today),
    leader,
  };
}

function computeStreak(store: NakiliStore, completions: NakiliStore["completions"], today: string) {
  const marked = new Set(completions.map((completion) => `${completion.choreId}|${completion.occurrenceDate}`));
  let streak = 0;
  let cursor = parseLocalDate(today);
  for (let step = 0; step < MAX_DAYS; step += 1) {
    const day = localDate(cursor);
    const due = choresForDate(store.chores, day);
    if (due.length) {
      const allHandled = due.every((chore) => marked.has(`${chore.id}|${day}`));
      if (allHandled) streak += 1;
      else if (day !== today) break;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}
