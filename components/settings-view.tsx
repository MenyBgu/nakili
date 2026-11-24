"use client";

import { Check, Copy, Download, Home, LogOut, Pencil, Share2, ShieldCheck, ShieldOff, Smartphone, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import type { HouseholdMember, NakiliStore } from "@/lib/types";

function InlineEdit({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  if (!editing) {
    return (
      <button className="icon-button ghost" onClick={() => { setText(value); setEditing(true); }} aria-label={label}>
        <Pencil size={16} />
      </button>
    );
  }
  return (
    <form
      className="inline-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (!text.trim()) return;
        onSave(text.trim());
        setEditing(false);
      }}
    >
      <input autoFocus aria-label={label} value={text} onChange={(event) => setText(event.target.value)} maxLength={80} />
      <button className="primary-button" type="submit">שמירה</button>
    </form>
  );
}

function memberLabel(member: HouseholdMember, creatorUserId: string) {
  if (member.role === "owner") return member.userId === creatorUserId ? "מנהל/ת · יצר/ה את הבית" : "מנהל/ת";
  return member.userId ? "מחובר/ת ממכשיר" : "בלי מכשיר · אפשר לשייך משימות";
}

export function SettingsView({
  store,
  isDemo,
  remote,
  devicePairingCode,
  onCreateInvite,
  onCreateDevicePairing,
  onRenameHousehold,
  onRenameMe,
  onWeekStart,
  onAddMember,
  onRemoveMember,
  onSetManager,
  onExport,
  onSignOut,
}: {
  store: NakiliStore;
  isDemo: boolean;
  remote: boolean;
  devicePairingCode: string | null;
  onCreateInvite: () => void;
  onCreateDevicePairing: () => void;
  onRenameHousehold: (name: string) => void;
  onRenameMe: (nickname: string) => void;
  onWeekStart: (weekStart: 0 | 1) => void;
  onAddMember: (nickname: string) => void;
  onRemoveMember: (member: HouseholdMember) => void;
  onSetManager: (member: HouseholdMember, manager: boolean) => void;
  onExport: (format: "json" | "csv") => void;
  onSignOut: () => void;
}) {
  const me = store.members.find((member) => member.id === store.currentMemberId);
  const isOwner = me?.role === "owner";
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [copied, setCopied] = useState(false);
  const code = store.household.accessCode;
  const shareText = code
    ? `מצטרפים לבית "${store.household.name}" בנקי-לי: פותחים את ${typeof window !== "undefined" ? window.location.origin : ""}, בוחרים "יש לי קוד בית" ומקלידים: ${code}`
    : "";

  return (
    <div className="settings">
      <h1>הגדרות</h1>

      <section className="card settings-card">
        <h2><Home size={18} /> הבית</h2>
        <div className="setting-row">
          <span className="setting-text">
            <small>שם הבית</small>
            <strong>{store.household.name}</strong>
          </span>
          {isOwner && !isDemo && (
            <InlineEdit label="שינוי שם הבית" value={store.household.name} onSave={onRenameHousehold} />
          )}
        </div>
        <div className="setting-row column">
          <span className="setting-text"><small>השבוע מתחיל ביום</small></span>
          <div className="segmented">
            {([0, 1] as const).map((value) => (
              <button
                key={value}
                className={store.household.weekStart === value ? "selected" : ""}
                onClick={() => onWeekStart(value)}
                disabled={!isOwner}
                aria-pressed={store.household.weekStart === value}
              >
                {value === 0 ? "ראשון" : "שני"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card settings-card">
        <h2><Users size={18} /> בני הבית</h2>
        <ul className="member-list">
          {store.members.map((member) => (
            <li key={member.id}>
              <span className="avatar" aria-hidden="true">{member.nickname.slice(0, 1)}</span>
              <span className="member-name">
                <strong>{member.nickname}{member.id === me?.id && <em> (אני)</em>}</strong>
                <small>{memberLabel(member, store.household.ownerId)}</small>
              </span>
              {member.id === me?.id && (
                <InlineEdit label="שינוי הכינוי שלי" value={member.nickname} onSave={onRenameMe} />
              )}
              {isOwner && remote && !isDemo && member.id !== me?.id && member.userId &&
                member.userId !== store.household.ownerId && (
                <button
                  className="icon-button ghost"
                  onClick={() => onSetManager(member, member.role !== "owner")}
                  aria-label={member.role === "owner" ? `ביטול ניהול של ${member.nickname}` : `מינוי ${member.nickname} למנהל/ת`}
                  title={member.role === "owner" ? "ביטול ניהול" : "מינוי למנהל/ת"}
                >
                  {member.role === "owner" ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                </button>
              )}
              {isOwner && member.id !== me?.id && member.role !== "owner" && (
                <button
                  className="icon-button ghost"
                  onClick={() => onRemoveMember(member)}
                  aria-label={`הסרת ${member.nickname}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
        {adding ? (
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!newName.trim()) return;
              onAddMember(newName.trim());
              setNewName("");
              setAdding(false);
            }}
          >
            <input
              autoFocus
              aria-label="שם בן/בת הבית"
              placeholder="שם, למשל: נועה"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              maxLength={40}
            />
            <button className="primary-button" type="submit">הוספה</button>
          </form>
        ) : (
          <button className="secondary-button" onClick={() => setAdding(true)}>
            <UserPlus size={17} /> הוספת בן/בת בית
          </button>
        )}
        <p className="muted small">
          {remote
            ? "מי שנוסף כאן יכול לקבל משימות. כדי שיסמן מהטלפון שלו — שלחו לו הזמנה, ובכניסה יבחר את אותו שם."
            : "מי שנוסף כאן יכול לקבל משימות."}
        </p>
      </section>

      {remote && (
        <section className="card settings-card">
          <h2><Smartphone size={18} /> חיבור מכשיר נוסף</h2>
          {devicePairingCode ? (
            <>
              <p className="muted">
                הקוד חד־פעמי ותקף ל־10 דקות. במכשיר החדש בחרו „חיבור מכשיר נוסף” והזינו אותו.
              </p>
              <div className="code-box">
                <code>{devicePairingCode}</code>
              </div>
              <div className="button-row">
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <button
                    className="primary-button"
                    onClick={() => void navigator.share({
                      title: "חיבור מכשיר לנקי-לי",
                      text: `קוד חיבור מכשיר לנקי-לי: ${devicePairingCode}`,
                    }).catch(() => undefined)}
                  >
                    <Share2 size={16} /> שליחת קוד
                  </button>
                )}
                <button
                  className="secondary-button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(devicePairingCode);
                    setCopied(true);
                  }}
                >
                  {copied ? <><Check size={16} /> הועתק</> : <><Copy size={16} /> העתקת קוד</>}
                </button>
              </div>
              <button className="text-button" onClick={onCreateDevicePairing}>יצירת קוד חדש</button>
            </>
          ) : (
            <>
              <p className="muted">
                התחברו במחשב או בטלפון נוסף כאותו משתמש, בלי להזין כינוי ובלי להפוך לחבר בית חדש.
              </p>
              <button className="primary-button" onClick={onCreateDevicePairing}>
                <Smartphone size={16} /> יצירת קוד חיבור
              </button>
            </>
          )}
        </section>
      )}

      {remote && (
        <section className="card settings-card">
          <h2><Share2 size={18} /> הזמנה לטלפון נוסף</h2>
          {code ? (
            <>
              <div className="code-box">
                <code>{code}</code>
              </div>
              <div className="button-row">
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <button
                    className="primary-button"
                    onClick={() => void navigator.share({ title: "נקי-לי", text: shareText }).catch(() => undefined)}
                  >
                    <Share2 size={16} /> שליחת הזמנה
                  </button>
                )}
                <button
                  className="secondary-button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(shareText);
                    setCopied(true);
                  }}
                >
                  {copied ? <><Check size={16} /> הועתק</> : <><Copy size={16} /> העתקת הזמנה</>}
                </button>
              </div>
              <button className="text-button" onClick={onCreateInvite}>יצירת קוד חדש במקום הזה</button>
            </>
          ) : (
            <>
              <p className="muted">
                מטעמי פרטיות הקוד לא נשמר בגלוי. צרו קוד הזמנה חדש — טלפונים שכבר מחוברים ימשיכו לעבוד כרגיל.
              </p>
              <button className="primary-button" onClick={onCreateInvite} disabled={isDemo}>
                <Share2 size={16} /> יצירת קוד הזמנה
              </button>
            </>
          )}
        </section>
      )}

      <section className="card settings-card">
        <h2><Download size={18} /> גיבוי</h2>
        <div className="button-row">
          <button className="secondary-button" onClick={() => onExport("json")}>קובץ גיבוי</button>
          <button className="secondary-button" onClick={() => onExport("csv")}>השבוע לאקסל</button>
        </div>
      </section>

      <button className="secondary-button large sign-out" onClick={onSignOut}>
        <LogOut size={17} /> {isDemo ? "יציאה מהדוגמה" : "יציאה במכשיר הזה"}
      </button>
    </div>
  );
}
