"use client";

import { Flame, Sparkles } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";
import { WEEKDAYS } from "@/lib/date";
import { computeStats, type StatsPeriod } from "@/lib/stats";
import type { NakiliStore } from "@/lib/types";

const periods: Array<{ value: StatsPeriod; label: string; empty: string }> = [
  { value: "week", label: "השבוע", empty: "השבוע" },
  { value: "month", label: "החודש", empty: "החודש" },
  { value: "all", label: "הכול", empty: "עד עכשיו" },
];

function doneLine(count: number) {
  if (count === 0) return "עוד לא סומנו משימות";
  if (count === 1) return "משימה אחת בוצעה";
  return `${count} משימות בוצעו`;
}

export function StatsView({ store }: { store: NakiliStore }) {
  const [period, setPeriod] = useState<StatsPeriod>("week");
  const stats = useMemo(() => computeStats(store, period), [store, period]);
  const label = periods.find((item) => item.value === period)?.empty ?? "";
  const weekOrder = store.household.weekStart === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const maxDay = Math.max(...stats.byWeekday, 1);
  const maxPerson = Math.max(...stats.perMember.map((member) => member.count), 1);
  const busiest = stats.byWeekday.indexOf(Math.max(...stats.byWeekday));
  const empty = stats.completed === 0;

  return (
    <div className="stats">
      <h1>סיכום</h1>

      <div className="segmented" role="group" aria-label="תקופה">
        {periods.map((item) => (
          <button
            key={item.value}
            className={period === item.value ? "selected" : ""}
            aria-pressed={period === item.value}
            onClick={() => setPeriod(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="card stats-hero" aria-label="סיכום תקופה">
        <div
          className="ring big"
          style={{ "--progress": `${stats.rate ?? 0}%` } as CSSProperties}
          aria-label={stats.rate === null ? "אין עדיין נתונים" : `${stats.rate}% מהמשימות בוצעו`}
        >
          <span>{stats.rate === null ? "–" : `${stats.rate}%`}</span>
        </div>
        <div className="stats-hero-text">
          <strong data-testid="stats-completed">{doneLine(stats.completed)}</strong>
          <small>
            {empty
              ? `סמנו משימה בשבוע ותראו כאן את הסיכום`
              : stats.skipped
                ? `${label} · דולגו ${stats.skipped}`
                : label}
          </small>
        </div>
      </section>

      {stats.streak > 0 && (
        <section className="card stats-streak" aria-label="רצף">
          <span className="streak-icon" aria-hidden="true"><Flame size={22} /></span>
          <span>
            <strong>{stats.streak === 1 ? "יום מלא אחד" : `${stats.streak} ימים מלאים ברצף`}</strong>
            <small>ימים שבהם כל המשימות טופלו</small>
          </span>
        </section>
      )}

      {!empty && (
        <>
          <section className="card stats-card">
            <h2>מי עשה מה</h2>
            {stats.leader && (
              <p className="leader-line"><Sparkles size={15} aria-hidden="true" /> {stats.leader} מובילים {label}</p>
            )}
            <ul className="people-list">
              {stats.perMember.map((member) => (
                <li key={member.memberId ?? "former"}>
                  <span className="avatar" aria-hidden="true">{member.name.slice(0, 1)}</span>
                  <span className="people-body">
                    <span className="people-head">
                      <strong>{member.name}</strong>
                      <span>{member.count} · {Math.round(member.share * 100)}%</span>
                    </span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${(member.count / maxPerson) * 100}%` }} />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card stats-card">
            <h2>באילו ימים עושים הכי הרבה</h2>
            <div className="weekday-bars" role="img" aria-label={`היום העמוס: ${WEEKDAYS[busiest].label}`}>
              {weekOrder.map((day) => (
                <div className={`weekday-bar ${stats.byWeekday[day] === Math.max(...stats.byWeekday) ? "top" : ""}`} key={day}>
                  <span className="weekday-count">{stats.byWeekday[day] || ""}</span>
                  <span className="weekday-column">
                    <span style={{ height: `${(stats.byWeekday[day] / maxDay) * 100}%` }} />
                  </span>
                  <span className="weekday-name">{WEEKDAYS[day].shortLabel}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card stats-card">
            <h2>המשימות שעושים הכי הרבה</h2>
            <ul className="top-chores">
              {stats.topChores.map((chore, index) => (
                <li key={chore.choreId}>
                  <span className="rank">{index + 1}</span>
                  <span className="top-icon" aria-hidden="true">{chore.icon}</span>
                  <strong>{chore.title}</strong>
                  <span className="top-count">{chore.count === 1 ? "פעם אחת" : `${chore.count} פעמים`}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
