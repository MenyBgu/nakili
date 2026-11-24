import { addDays, differenceInCalendarMonths, format, getDaysInMonth, isSameDay, parseISO, startOfWeek } from "date-fns";
import { he } from "date-fns/locale";
import type { Chore, Completion, Household, WeekDay } from "@/lib/types";

export const WEEKDAYS = [
  { value: 0, label: "ראשון", shortLabel: "א׳" },
  { value: 1, label: "שני", shortLabel: "ב׳" },
  { value: 2, label: "שלישי", shortLabel: "ג׳" },
  { value: 3, label: "רביעי", shortLabel: "ד׳" },
  { value: 4, label: "חמישי", shortLabel: "ה׳" },
  { value: 5, label: "שישי", shortLabel: "ו׳" },
  { value: 6, label: "שבת", shortLabel: "ש׳" },
];

export function localDate(date = new Date()) {
  return format(date, "yyyy-MM-dd");
}

export function parseLocalDate(value: string) {
  return parseISO(`${value}T12:00:00`);
}

export function weekStartFor(date: Date, weekStart: 0 | 1) {
  return startOfWeek(date, { weekStartsOn: weekStart });
}

export function weekDays(date: Date, household: Pick<Household, "weekStart">): WeekDay[] {
  const start = weekStartFor(date, household.weekStart);
  return Array.from({ length: 7 }, (_, index) => {
    const day = addDays(start, index);
    const weekday = (day.getDay() + 7) % 7;
    const info = WEEKDAYS[weekday];
    return {
      date: localDate(day),
      label: info.label,
      shortLabel: info.shortLabel,
      dayNumber: format(day, "d", { locale: he }),
      isToday: isSameDay(day, new Date()),
    };
  });
}

export function shiftWeek(date: Date, amount: number) {
  return addDays(date, amount * 7);
}

export function formatWeekTitle(days: WeekDay[]) {
  if (!days.length) return "";
  const first = parseLocalDate(days[0].date);
  const last = parseLocalDate(days[days.length - 1].date);
  return `${format(first, "d בMMM", { locale: he })} – ${format(last, "d בMMM yyyy", { locale: he })}`;
}

export function isChoreScheduled(chore: Chore, date: string) {
  if (!chore.active) return false;
  if (chore.startDate && date < chore.startDate) return false;
  if (chore.endDate && date > chore.endDate) return false;
  if (chore.frequency === "one_off") return chore.oneOffDate === date;
  const current = parseLocalDate(date);
  if (chore.frequency === "monthly") {
    if (!chore.startDate) return false;
    const start = parseLocalDate(chore.startDate);
    const dayOfMonth = Math.min(start.getDate(), getDaysInMonth(current));
    return differenceInCalendarMonths(current, start) >= 0 && current.getDate() === dayOfMonth;
  }
  if (!chore.weekdays.includes(current.getDay())) return false;
  if (chore.frequency === "biweekly") {
    if (!chore.startDate) return false;
    const start = parseLocalDate(chore.startDate);
    const daysSinceStart = Math.floor(
      (current.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
    );
    return Math.floor(daysSinceStart / 7) % 2 === 0;
  }
  return true;
}

export function choresForDate(chores: Chore[], date: string) {
  return chores
    .filter((chore) => isChoreScheduled(chore, date))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "he"));
}

export function completionFor(
  completions: Completion[],
  choreId: string,
  date: string,
) {
  return completions.find(
    (completion) => completion.choreId === choreId && completion.occurrenceDate === date,
  );
}

export function displayDate(value: string) {
  return format(parseLocalDate(value), "d בMMM", { locale: he });
}
