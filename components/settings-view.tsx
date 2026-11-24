"use client";

import { Check, Copy, Download, KeyRound, LogOut, Pencil, RotateCcw, Users } from "lucide-react";
import { useState } from "react";
import type { NakiliStore } from "@/lib/types";

export function SettingsView({
  store,
  isDemo,
  onCopy,
  onRotate,
  onRename,
  onWeekStart,
  onExport,
  onSignOut,
}: {
  store: NakiliStore;
  isDemo: boolean;
  onCopy: () => void;
  onRotate: () => void;
  onRename: (nickname: string) => void;
  onWeekStart: (weekStart: 0 | 1) => void;
  onExport: (format: "json" | "csv") => void;
  onSignOut: () => void;
}) {
  const me = store.members.find((member) => member.id === store.currentMemberId);
  const isOwner = me?.role === "owner";
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(me?.nickname ?? "");
  const [copied, setCopied] = useState(false);

  return (
    <div className="settings">
      <h1>הגדרות</h1>

      <section className="card settings-card">
        <h2><KeyRound size={18} /> קוד הבית</h2>
        {store.household.accessCode ? (
          <>
            <p className="muted">שתפו את הקוד רק עם בני הבית. איתו מצטרפים ונכנסים מחדש.</p>
            <div className="code-box">
              <code>{store.household.accessCode}</code>
              <button
                className="secondary-button"
                onClick={() => {
                  onCopy();
                  setCopied(true);
                }}
              >
                {copied ? <><Check size={16} /> הועתק</> : <><Copy size={16} /> העתקה</>}
              </button>
            </div>
          </>
        ) : (
          <p className="muted">
            מטעמי פרטיות הקוד לא נשמר בגלוי. אם הוא אבד, אפשר ליצור קוד חדש — הקוד הישן יפסיק לעבוד.
          </p>
        )}
        {isOwner && !isDemo && (
          <button className="text-button" onClick={onRotate}>
            <RotateCcw size={15} /> יצירת קוד חדש
          </button>
        )}
      </section>

      <section className="card settings-card">
        <h2><Users size={18} /> בני הבית</h2>
        <ul className="member-list">
          {store.members.map((member) => (
            <li key={member.id}>
              <span className="avatar" aria-hidden="true">{member.nickname.slice(0, 1)}</span>
              {member.id === me?.id && editing ? (
                <form
                  className="inline-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!nickname.trim()) return;
                    onRename(nickname.trim());
                    setEditing(false);
                  }}
                >
                  <input autoFocus value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={40} />
                  <button className="primary-button" type="submit">שמירה</button>
                </form>
              ) : (
                <>
                  <span className="member-name">
                    <strong>{member.nickname}{member.id === me?.id && <em> (אני)</em>}</strong>
                    <small>{member.role === "owner" ? "יצר/ה את הבית" : "חבר/ת בית"}</small>
                  </span>
                  {member.id === me?.id && (
                    <button className="icon-button ghost" onClick={() => setEditing(true)} aria-label="שינוי הכינוי שלי">
                      <Pencil size={16} />
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwner && (
        <section className="card settings-card">
          <h2>השבוע מתחיל ביום</h2>
          <div className="segmented">
            {([0, 1] as const).map((value) => (
              <button
                key={value}
                className={store.household.weekStart === value ? "selected" : ""}
                onClick={() => onWeekStart(value)}
                aria-pressed={store.household.weekStart === value}
              >
                {value === 0 ? "ראשון" : "שני"}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card settings-card">
        <h2><Download size={18} /> גיבוי</h2>
        <p className="muted">הורדת עותק של המשימות למכשיר שלכם.</p>
        <div className="button-row">
          <button className="secondary-button" onClick={() => onExport("json")}>קובץ גיבוי (JSON)</button>
          <button className="secondary-button" onClick={() => onExport("csv")}>השבוע לאקסל (CSV)</button>
        </div>
      </section>

      <button className="secondary-button large sign-out" onClick={onSignOut}>
        <LogOut size={17} /> {isDemo ? "יציאה מהדוגמה" : "יציאה מהבית במכשיר הזה"}
      </button>
    </div>
  );
}
