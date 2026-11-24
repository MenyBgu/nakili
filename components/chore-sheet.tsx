"use client";

import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { WEEKDAYS } from "@/lib/date";
import { blankDraft, categoryMeta, categoryOptions, choreToDraft, iconOptions, type ChoreDraft } from "@/lib/store";
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

  const pickCategory = (value: ChoreDraft["category"]) => {
    const previous = categoryMeta(draft.category);
    const next = categoryMeta(value);
    setDraft((current) => ({
      ...current,
      category: value,
      icon: current.icon === previous.icon ? next.icon : current.icon,
      color: next.color,
    }));
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
    if (draft.frequency === "weekly" && draft.weekdays.length === 0) return setError("בחרו לפחות יום אחד");
    if (draft.frequency === "one_off" && !draft.oneOffDate) return setError("בחרו תאריך");
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

        <label>
          מה צריך לעשות?
          <input
            autoFocus={!chore}
            className="title-input"
            value={draft.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="למשל: להפעיל מכונת כביסה"
            maxLength={100}
          />
        </label>

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
          <legend>מתי?</legend>
          <div className="segmented" role="group">
            <button
              type="button"
              className={draft.frequency === "weekly" ? "selected" : ""}
              onClick={() => update("frequency", "weekly")}
              aria-pressed={draft.frequency === "weekly"}
            >
              כל שבוע
            </button>
            <button
              type="button"
              className={draft.frequency === "one_off" ? "selected" : ""}
              onClick={() => update("frequency", "one_off")}
              aria-pressed={draft.frequency === "one_off"}
            >
              פעם אחת
            </button>
          </div>
          {draft.frequency === "weekly" ? (
            <div className="weekday-picker">
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
          ) : (
            <input
              type="date"
              aria-label="תאריך"
              value={draft.oneOffDate}
              onChange={(event) => update("oneOffDate", event.target.value)}
            />
          )}
        </fieldset>

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

        <details className="more">
          <summary>עוד אפשרויות</summary>
          <fieldset>
            <legend>אייקון</legend>
            <div className="icon-picker">
              {iconOptions.map((icon) => (
                <button
                  type="button"
                  key={icon}
                  className={draft.icon === icon ? "selected" : ""}
                  onClick={() => update("icon", icon)}
                  aria-pressed={draft.icon === icon}
                >
                  {icon}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            הערה
            <textarea
              value={draft.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="מה חשוב לזכור?"
              rows={2}
              maxLength={240}
            />
          </label>
          {draft.frequency === "weekly" && (
            <div className="two-cols">
              <label>
                החל מ־
                <input type="date" value={draft.startDate} onChange={(event) => update("startDate", event.target.value)} />
              </label>
              <label>
                עד
                <input type="date" value={draft.endDate} onChange={(event) => update("endDate", event.target.value)} />
              </label>
            </div>
          )}
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
