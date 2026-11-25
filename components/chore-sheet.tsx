"use client";

import { StickyNote, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { WEEKDAYS, parseLocalDate } from "@/lib/date";
import {
  blankDraft,
  categoryMeta,
  categoryOptions,
  choreToDraft,
  guessFromTitle,
  iconOptions,
  type ChoreDraft,
} from "@/lib/store";
import type { Chore, HouseholdMember } from "@/lib/types";

export function ChoreSheet({
  chore,
  date,
  members,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  chore: Chore | null;
  date: string;
  members: HouseholdMember[];
  saving: boolean;
  onClose: () => void;
  onSave: (draft: ChoreDraft) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<ChoreDraft>(() => (chore ? choreToDraft(chore) : blankDraft(date)));
  const [styleTouched, setStyleTouched] = useState(Boolean(chore));
  const [error, setError] = useState("");
  const update = <K extends keyof ChoreDraft>(key: K, value: ChoreDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const changeTitle = (title: string) =>
    setDraft((current) => ({ ...current, title, ...(styleTouched ? {} : guessFromTitle(title)) }));

  const pickCategory = (value: ChoreDraft["category"]) => {
    const meta = categoryMeta(value);
    setStyleTouched(true);
    setDraft((current) => ({ ...current, category: value, icon: meta.icon, color: meta.color }));
  };

  const toggleDay = (day: number) =>
    update(
      "weekdays",
      draft.weekdays.includes(day)
        ? draft.weekdays.filter((value) => value !== day)
        : [...draft.weekdays, day].sort(),
    );

  const submit = () => {
    if (!draft.title.trim()) return setError("מה צריך לעשות?");
    if ((draft.frequency === "weekly" || draft.frequency === "biweekly") && draft.weekdays.length === 0) {
      return setError("בחרו לפחות יום אחד");
    }
    if (draft.frequency === "one_off" && !draft.oneOffDate) return setError("בחרו תאריך");
    if ((draft.frequency === "biweekly" || draft.frequency === "monthly") && !draft.startDate) {
      return setError("בחרו תאריך התחלה");
    }
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
      return setError("תאריך הסיום מוקדם מתאריך ההתחלה");
    }
    setError("");
    onSave(draft);
  };

  return (
    <div
      className="sheet-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <header className="sheet-head">
          <h2 id="sheet-title">{chore ? "עריכת משימה" : "משימה חדשה"}</h2>
          <button type="button" className="icon-button ghost" onClick={onClose} aria-label="סגירה">
            <X size={20} />
          </button>
        </header>

        <div className="title-field">
          <span className="title-icon" aria-hidden="true" style={{ background: draft.color }}>{draft.icon}</span>
          <input
            autoFocus={!chore}
            aria-label="מה צריך לעשות?"
            className="title-input"
            value={draft.title}
            onChange={(event) => changeTitle(event.target.value)}
            placeholder="מה צריך לעשות?"
            maxLength={100}
          />
        </div>

        <label className="note-field">
          <StickyNote size={17} aria-hidden="true" />
          <textarea
            aria-label="הערה"
            value={draft.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="הערה למשימה (לא חובה)"
            rows={draft.description.length > 40 ? 2 : 1}
            maxLength={240}
          />
        </label>

        <div className="when">
          <div className="frequency-options" role="group" aria-label="תדירות">
            {([
              ["weekly", "כל שבוע"],
              ["biweekly", "פעם בשבועיים"],
              ["monthly", "פעם בחודש"],
              ["one_off", "פעם אחת"],
            ] as const).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={draft.frequency === value ? "selected" : ""}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    frequency: value,
                    startDate: current.startDate || date,
                    weekdays: current.weekdays.length ? current.weekdays : [parseLocalDate(date).getDay()],
                  }))
                }
                aria-pressed={draft.frequency === value}
              >
                {label}
              </button>
            ))}
          </div>
          {draft.frequency === "weekly" || draft.frequency === "biweekly" ? (
            <div className="weekday-picker" role="group" aria-label="ימים">
              {WEEKDAYS.map((day) => (
                <button
                  type="button"
                  key={day.value}
                  className={draft.weekdays.includes(day.value) ? "selected" : ""}
                  onClick={() => toggleDay(day.value)}
                  aria-pressed={draft.weekdays.includes(day.value)}
                  aria-label={day.label}
                >
                  {day.shortLabel}
                </button>
              ))}
            </div>
          ) : draft.frequency === "monthly" ? (
            <input
              type="date"
              aria-label="תאריך ראשון"
              value={draft.startDate}
              onChange={(event) => update("startDate", event.target.value)}
            />
          ) : (
            <input
              type="date"
              aria-label="תאריך"
              value={draft.oneOffDate}
              onChange={(event) => update("oneOffDate", event.target.value)}
            />
          )}
          {draft.startDate && (draft.frequency === "monthly" || draft.frequency === "biweekly") && (
            <p className="when-hint">
              {draft.frequency === "monthly"
                ? `חוזר בכל חודש ב־${parseLocalDate(draft.startDate).getDate()} לחודש`
                : `החל מ־${format(parseLocalDate(draft.startDate), "d בMMMM", { locale: he })}, כל שבוע שני`}
            </p>
          )}
        </div>

        <details className="more">
          <summary>עוד אפשרויות</summary>
          {draft.frequency !== "one_off" && (
            <div className="two-cols">
              {draft.frequency !== "monthly" && (
                <label>
                  תאריך התחלה
                  <input type="date" value={draft.startDate} onChange={(event) => update("startDate", event.target.value)} />
                </label>
              )}
              <label>
                תאריך סיום
                <input type="date" value={draft.endDate} onChange={(event) => update("endDate", event.target.value)} />
              </label>
            </div>
          )}
          {members.length > 1 && (
            <fieldset>
              <legend>מי אחראי?</legend>
              <div className="chips">
                <button
                  type="button"
                  className={`chip ${!draft.assignedMemberId ? "selected" : ""}`}
                  onClick={() => update("assignedMemberId", "")}
                  aria-pressed={!draft.assignedMemberId}
                >
                  כולם
                </button>
                {members.map((member) => (
                  <button
                    type="button"
                    key={member.id}
                    className={`chip ${draft.assignedMemberId === member.id ? "selected" : ""}`}
                    onClick={() => update("assignedMemberId", member.id)}
                    aria-pressed={draft.assignedMemberId === member.id}
                  >
                    {member.nickname}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          <fieldset>
            <legend>סוג</legend>
            <div className="chips">
              {categoryOptions.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`chip ${draft.category === option.value ? "selected" : ""}`}
                  onClick={() => pickCategory(option.value)}
                  aria-pressed={draft.category === option.value}
                >
                  <span aria-hidden="true">{option.icon}</span> {option.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>אייקון</legend>
            <div className="icon-picker">
              {iconOptions.map((icon) => (
                <button
                  type="button"
                  key={icon}
                  className={draft.icon === icon ? "selected" : ""}
                  onClick={() => {
                    setStyleTouched(true);
                    update("icon", icon);
                  }}
                  aria-pressed={draft.icon === icon}
                >
                  {icon}
                </button>
              ))}
            </div>
          </fieldset>
        </details>

        {error && <div className="notice error" role="alert">{error}</div>}

        <footer className="sheet-actions">
          <button type="submit" className="primary-button large" disabled={saving}>
            {saving ? "שומרים..." : "שמירה"}
          </button>
          {chore && onDelete && (
            <button type="button" className="text-button danger" onClick={onDelete} disabled={saving}>
              <Trash2 size={16} /> מחיקה
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}
