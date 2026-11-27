"use client";

import { Check, ChevronLeft, ChevronRight, Plus, ShoppingBasket, StickyNote, Trash2, Undo2 } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { choresForDate, completionFor, formatWeekTitle, parseLocalDate, weekDays } from "@/lib/date";
import { parseShoppingItems } from "@/lib/shopping";
import { categoryMeta } from "@/lib/store";
import type { Chore, NakiliStore } from "@/lib/types";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const SHOPPING_PREVIEW = 5;

export function WeekView({
  store,
  weekDate,
  selectedDate,
  onSelectDate,
  onShift,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
  onSkip,
}: {
  store: NakiliStore;
  weekDate: Date;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onShift: (amount: number) => void;
  onAdd: (date: string) => void;
  onEdit: (chore: Chore) => void;
  onDelete: (chore: Chore) => void;
  onToggle: (chore: Chore, date: string) => void;
  onSkip: (chore: Chore, date: string) => void;
}) {
  const [openNotes, setOpenNotes] = useState<string[]>([]);
  const toggleNote = (id: string) =>
    setOpenNotes((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const days = weekDays(weekDate, store.household);
  const isCurrentWeek = days.some((day) => day.isToday);
  const selected = days.find((day) => day.date === selectedDate) ?? days[0];
  const dayChores = choresForDate(store.chores, selected.date);
  const statusOf = (chore: Chore, date: string) => completionFor(store.completions, chore.id, date)?.status;
  const doneCount = dayChores.filter((chore) => statusOf(chore, selected.date) === "completed").length;
  const openCount = dayChores.filter((chore) => !statusOf(chore, selected.date)).length;
  const me = store.members.find((member) => member.id === store.currentMemberId) ?? store.members[0];
  const countable = dayChores.length - dayChores.filter((chore) => statusOf(chore, selected.date) === "skipped").length;
  const progress = countable ? Math.round((doneCount / countable) * 100) : 0;

  return (
    <>
      <section className="greeting">
        <div>
          <h1>שלום{me ? `, ${me.nickname}` : ""}</h1>
          <p className="muted">
            {selected.isToday
              ? openCount
                ? `נשארו ${openCount} משימות להיום`
                : dayChores.length ? "סיימתם הכול להיום. כל הכבוד! ✨" : "היום פנוי ממשימות"
              : format(parseLocalDate(selected.date), "EEEE, d בMMMM", { locale: he })}
          </p>
        </div>
        <div className="ring" style={{ "--progress": `${progress}%` } as CSSProperties} aria-label={`${progress}% הושלמו`}>
          <span>{doneCount}/{countable}</span>
        </div>
      </section>

      <section className="week-nav" aria-label="ניווט בין שבועות">
        <button className="icon-button" onClick={() => onShift(-1)} aria-label="שבוע קודם">
          <ChevronRight size={20} />
        </button>
        <div className="week-title">
          <strong>{formatWeekTitle(days)}</strong>
          {!isCurrentWeek && <button className="text-button" onClick={() => onShift(0)}>חזרה להיום</button>}
        </div>
        <button className="icon-button" onClick={() => onShift(1)} aria-label="שבוע הבא">
          <ChevronLeft size={20} />
        </button>
      </section>

      <nav className="day-strip" aria-label="ימי השבוע">
        {days.map((day) => {
          const chores = choresForDate(store.chores, day.date);
          const open = chores.filter((chore) => !statusOf(chore, day.date)).length;
          const allDone = chores.length > 0 && open === 0;
          return (
            <button
              key={day.date}
              className={`day-chip ${day.date === selected.date ? "selected" : ""} ${day.isToday ? "today" : ""}`}
              onClick={() => onSelectDate(day.date)}
              aria-pressed={day.date === selected.date}
              aria-label={`${day.label} ${day.dayNumber}, ${chores.length} משימות`}
            >
              <span className="day-chip-label">{day.shortLabel}</span>
              <span className="day-chip-number">{day.dayNumber}</span>
              <span className={`day-chip-dot ${allDone ? "done" : open ? "open" : ""}`}>
                {allDone ? <Check size={10} strokeWidth={3.5} /> : open || ""}
              </span>
            </button>
          );
        })}
      </nav>

      <section className="day-panel" aria-labelledby="day-title">
        <header className="day-panel-head">
          <h2 id="day-title">
            {selected.isToday ? "היום" : `יום ${selected.label}`}
            <small>{format(parseLocalDate(selected.date), "d בMMMM", { locale: he })}</small>
          </h2>
          {dayChores.length > 0 && <span className="muted small">{doneCount} מתוך {dayChores.length} בוצעו</span>}
        </header>

        {dayChores.length ? (
          <ul className="task-list">
            {dayChores.map((chore) => {
              const status = statusOf(chore, selected.date);
              const assignee = store.members.find((member) => member.id === chore.assignedMemberId);
              const note = chore.description.trim();
              const noteOpen = openNotes.includes(chore.id);
              const shopItems = chore.category === "shopping" ? parseShoppingItems(chore.description) : [];
              const shopOpen = noteOpen;
              const shopVisible = shopOpen ? shopItems : shopItems.slice(0, SHOPPING_PREVIEW);
              const meta = [categoryMeta(chore.category).label, assignee?.nickname]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={chore.id}
                  className={`task ${status ?? ""}`}
                  style={{ "--task-color": chore.color } as CSSProperties}
                >
                  <button
                    className="task-check"
                    onClick={() => onToggle(chore, selected.date)}
                    aria-label={status === "completed" ? `ביטול סימון: ${chore.title}` : `סימון כבוצע: ${chore.title}`}
                  >
                    {status === "completed" && <Check size={18} strokeWidth={3} />}
                  </button>
                  <button className="task-body" onClick={() => onEdit(chore)} aria-label={`עריכת ${chore.title}`}>
                    <span className="task-icon" aria-hidden="true">{chore.icon}</span>
                    <span className="task-text">
                      <strong>{chore.title}</strong>
                      <small>{status === "skipped" ? "דילגתם הפעם" : meta}</small>
                    </span>
                  </button>
                  {status === "skipped" ? (
                    <button className="task-skip" onClick={() => onSkip(chore, selected.date)} aria-label={`ביטול דילוג: ${chore.title}`}>
                      <Undo2 size={15} /> ביטול
                    </button>
                  ) : status !== "completed" && (
                    <button className="task-skip" onClick={() => onSkip(chore, selected.date)} aria-label={`דילוג על ${chore.title}`}>
                      דילוג
                    </button>
                  )}
                  <button
                    className="task-delete"
                    onClick={() => onDelete(chore)}
                    aria-label={`מחיקת ${chore.title}`}
                    title="מחיקה"
                  >
                    <Trash2 size={16} />
                  </button>
                  {shopItems.length > 0 ? (
                    <div className="task-shopping">
                      <p className="task-shopping-head">
                        <ShoppingBasket size={15} aria-hidden="true" />
                        <span>רשימת קניות</span>
                        <b>{shopItems.length === 1 ? "מוצר אחד" : `${shopItems.length} מוצרים`}</b>
                      </p>
                      <ol>
                        {shopVisible.map((item, index) => (
                          <li key={index}>
                            <span className="shopping-num" aria-hidden="true">{index + 1}</span>
                            <span className="shopping-text">{item}</span>
                          </li>
                        ))}
                      </ol>
                      {shopItems.length > SHOPPING_PREVIEW && (
                        <button
                          type="button"
                          className="task-shopping-more"
                          onClick={() => toggleNote(chore.id)}
                          aria-expanded={shopOpen}
                        >
                          {shopOpen ? "הצג פחות" : `עוד ${shopItems.length - SHOPPING_PREVIEW} מוצרים`}
                        </button>
                      )}
                    </div>
                  ) : note && (
                    <button
                      className={`task-note ${noteOpen ? "open" : ""}`}
                      onClick={() => toggleNote(chore.id)}
                      aria-expanded={noteOpen}
                    >
                      <StickyNote size={15} aria-hidden="true" />
                      <span>{note}</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty">
            <span aria-hidden="true">🌤️</span>
            <strong>אין משימות ביום הזה</strong>
            <p className="muted">יום רגוע. רוצים להוסיף משהו?</p>
          </div>
        )}

        <button className="add-row" onClick={() => onAdd(selected.date)}>
          <Plus size={18} /> הוספת משימה
        </button>
      </section>

      <button className="fab" onClick={() => onAdd(selected.date)} aria-label="הוספת משימה">
        <Plus size={26} />
      </button>
    </>
  );
}
