"use client";

import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  KeyRound,
  LogOut,
  Plus,
  RotateCcw,
  Settings,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { demoStore } from "@/lib/demo-data";
import { NakiliLogo } from "@/components/nakili-logo";
import {
  choresForDate,
  completionFor,
  formatWeekTitle,
  localDate,
  shiftWeek,
  weekDays,
} from "@/lib/date";
import type {
  Chore,
  ChoreCategory,
  HouseholdMember,
  NakiliStore,
} from "@/lib/types";

type Screen = "week" | "settings";
type AccessMode = "landing" | "create" | "join";

type ChoreDraft = {
  title: string;
  description: string;
  category: ChoreCategory;
  icon: string;
  color: string;
  frequency: "weekly" | "one_off";
  weekdays: number[];
  oneOffDate: string;
  startDate: string;
  endDate: string;
  assignedMemberId: string;
};

const STORAGE_KEY = "nakili:store:v1";
const weekLabels = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const categoryOptions: Array<{ value: ChoreCategory; label: string }> = [
  { value: "cleaning", label: "ניקיון" },
  { value: "errand", label: "סידור מחוץ לבית" },
  { value: "organization", label: "סדר וארגון" },
  { value: "maintenance", label: "תחזוקה" },
  { value: "other", label: "אחר" },
];
const colorOptions = ["#dcefe1", "#e5ebfa", "#fff0cf", "#f6e4e1", "#eee2f8", "#dff1f3"];
const iconOptions = ["🧽", "🧺", "✨", "🗑️", "🧹", "🪟", "🛒", "🌿", "🧼"];

function categoryLabel(category: ChoreCategory) {
  return categoryOptions.find((option) => option.value === category)?.label ?? "אחר";
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeStore(value: NakiliStore): NakiliStore {
  return {
    ...value,
    chores: value.chores.map((chore) => ({
      ...chore,
      category: chore.category ?? "cleaning",
    })),
  };
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createAccessCode() {
  const value = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `NKI-${value.slice(0, 4)}-${value.slice(4, 8)}`;
}

function blankDraft(): ChoreDraft {
  return {
    title: "",
    description: "",
    category: "cleaning",
    icon: "🧽",
    color: colorOptions[0],
    frequency: "weekly",
    weekdays: [0],
    oneOffDate: localDate(),
    startDate: "",
    endDate: "",
    assignedMemberId: "",
  };
}

function choreToDraft(chore: Chore): ChoreDraft {
  return {
    title: chore.title,
    description: chore.description,
    category: chore.category,
    icon: chore.icon,
    color: chore.color,
    frequency: chore.frequency,
    weekdays: chore.weekdays,
    oneOffDate: chore.oneOffDate ?? localDate(),
    startDate: chore.startDate ?? "",
    endDate: chore.endDate ?? "",
    assignedMemberId: chore.assignedMemberId ?? "",
  };
}

function createLocalStore(name: string, nickname: string, includeExamples: boolean): NakiliStore {
  const householdId = newId();
  const memberId = newId();
  const code = createAccessCode();
  const examples = includeExamples
    ? clone(demoStore.chores).map((chore, index) => ({
        ...chore,
        id: newId(),
        householdId,
        assignedMemberId: null,
        sortOrder: index + 1,
      }))
    : [];

  return {
    household: {
      id: householdId,
      name,
      timezone: "Asia/Jerusalem",
      weekStart: 0,
      ownerId: memberId,
      accessCode: code,
    },
    members: [
      {
        id: memberId,
        userId: memberId,
        householdId,
        nickname,
        role: "owner",
      },
    ],
    chores: examples,
    completions: [],
  };
}

function storeFromRemoteRows(
  householdRow: {
    id: string;
    name: string;
    timezone: string;
    week_start: number;
    owner_id: string;
  },
  memberRows: Array<{
    id: string;
    user_id: string;
    household_id: string;
    nickname: string;
    role: "owner" | "member";
  }>,
  choreRows: Array<{
    id: string;
    household_id: string;
    title: string;
    description: string;
    category: ChoreCategory;
    icon: string;
    color: string;
    assigned_member_id: string | null;
    active: boolean;
    sort_order: number;
    chore_schedules?: Array<{
      frequency: "weekly" | "one_off";
      weekdays: number[];
      one_off_date: string | null;
      start_date: string | null;
      end_date: string | null;
    }>;
  }>,
  completionRows: Array<{
    id: string;
    chore_id: string;
    occurrence_date: string;
    status: "completed" | "skipped";
    completed_by: string | null;
    completed_at: string;
  }>,
): NakiliStore {
  return {
    household: {
      id: householdRow.id,
      name: householdRow.name,
      timezone: householdRow.timezone,
      weekStart: householdRow.week_start === 1 ? 1 : 0,
      ownerId: householdRow.owner_id,
    },
    members: memberRows.map((member) => ({
      id: member.id,
      userId: member.user_id,
      householdId: member.household_id,
      nickname: member.nickname,
      role: member.role,
    })),
    chores: choreRows.map((chore) => {
      const schedule = chore.chore_schedules?.[0];
      return {
        id: chore.id,
        householdId: chore.household_id,
        title: chore.title,
        description: chore.description,
        category: chore.category,
        icon: chore.icon,
        color: chore.color,
        assignedMemberId: chore.assigned_member_id,
        active: chore.active,
        sortOrder: chore.sort_order,
        frequency: schedule?.frequency ?? "weekly",
        weekdays: schedule?.weekdays ?? [],
        oneOffDate: schedule?.one_off_date ?? null,
        startDate: schedule?.start_date ?? null,
        endDate: schedule?.end_date ?? null,
      };
    }),
    completions: completionRows.map((completion) => ({
      id: completion.id,
      choreId: completion.chore_id,
      occurrenceDate: completion.occurrence_date,
      status: completion.status,
      completedBy: completion.completed_by,
      completedAt: completion.completed_at,
    })),
  };
}

async function fetchRemoteStore(
  client: SupabaseClient,
): Promise<NakiliStore | null> {
  const userResult = await client.auth.getUser();
  const user = userResult.data.user;
  if (!user) return null;

  const membership = await client
    .from("household_members")
    .select("id,user_id,household_id,nickname,role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (membership.error || !membership.data) return null;

  const household = await client
    .from("households")
    .select("id,name,timezone,week_start,owner_id")
    .eq("id", membership.data.household_id)
    .single();
  if (household.error || !household.data) return null;

  const members = await client
    .from("household_members")
    .select("id,user_id,household_id,nickname,role")
    .eq("household_id", household.data.id)
    .order("joined_at");
  const chores = await client
    .from("chores")
    .select("id,household_id,title,description,category,icon,color,assigned_member_id,active,sort_order,chore_schedules(frequency,weekdays,one_off_date,start_date,end_date)")
    .eq("household_id", household.data.id)
    .eq("active", true)
    .order("sort_order");
  const completions = await client
    .from("chore_completions")
    .select("id,chore_id,occurrence_date,status,completed_by,completed_at")
    .eq("household_id", household.data.id);

  if (members.error || chores.error || completions.error) {
    throw new Error("טעינת נתוני הבית נכשלה");
  }

  return storeFromRemoteRows(
    household.data,
    members.data ?? [],
    chores.data ?? [],
    completions.data ?? [],
  );
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Landing({
  onSelect,
  onDemo,
}: {
  onSelect: (mode: "create" | "join") => void;
  onDemo: () => void;
}) {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><NakiliLogo title="" /></span>
          <span>
            <strong>נקי-לי</strong>
            <small>הבית מסודר, בלי לזכור הכול</small>
          </span>
        </div>
      </header>
      <section className="hero" aria-labelledby="landing-title">
        <div>
          <p className="eyebrow">ניהול משימות פשוט לבית</p>
          <h1 id="landing-title">יותר סדר. פחות לזכור.</h1>
          <p className="hero-copy">
            בוחרים מה צריך לעשות ובאילו ימים, רואים את כל השבוע במקום אחד,
            ומסמנים ביצוע ברגע שסיימתם.
          </p>
          <div className="landing-actions">
            <button className="primary-button" onClick={() => onSelect("create")}>
              <Plus size={18} />
              יצירת בית חדש
            </button>
            <button className="secondary-button" onClick={() => onSelect("join")}>
              <KeyRound size={17} />
              הצטרפות עם קוד
            </button>
            <button className="text-button" onClick={onDemo}>
              צפייה בדוגמה
            </button>
          </div>
          <p className="privacy-note">
            אין צורך בתעודת זהות או בפרטים אישיים. קוד אקראי שומר על הבית שלך
            מופרד מאחרים. המאגר הציבורי מכיל קוד בלבד — המידע נשמר באופן פרטי.
          </p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <span>🧺</span>
        </div>
      </section>
    </main>
  );
}

function AccessForm({
  mode,
  loading,
  error,
  onBack,
  onSubmit,
}: {
  mode: "create" | "join";
  loading: boolean;
  error: string;
  onBack: () => void;
  onSubmit: (values: { name: string; nickname: string; code: string; includeExamples: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [includeExamples, setIncludeExamples] = useState(true);

  return (
    <main className="shell">
      <button className="text-button" onClick={onBack}>
        <ArrowRight size={16} /> חזרה
      </button>
      <section className="form-card">
        <span className="brand-mark"><NakiliLogo title="" /></span>
        <h1>{mode === "create" ? "יוצרים בית חדש" : "מצטרפים לבית"}</h1>
        <p>
          {mode === "create"
            ? "שם קטן, כינוי, וקוד גישה פרטי. אפשר להתחיל עם כמה מטלות לדוגמה ולשנות הכול."
            : "בקשו ממנהל הבית את הקוד והקלידו אותו כאן. אפשר לבחור כינוי שיזהה אתכם בבית."}
        </p>
        <div className="form-grid">
          {mode === "create" ? (
            <label className="full-width">
              שם הבית
              <input
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="למשל: הבית של משפחת כהן"
                maxLength={80}
              />
            </label>
          ) : (
            <label className="full-width">
              קוד הבית
              <input
                autoFocus
                dir="ltr"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="NKI-AB12-34CD"
                maxLength={32}
              />
            </label>
          )}
          <label className="full-width">
            הכינוי שלי
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="למשל: דני"
              maxLength={40}
            />
          </label>
        </div>
        {mode === "create" && (
          <label>
            <span>התחלה מהירה</span>
            <select
              value={includeExamples ? "yes" : "no"}
              onChange={(event) => setIncludeExamples(event.target.value === "yes")}
            >
              <option value="yes">להוסיף כמה מטלות לדוגמה</option>
              <option value="no">להתחיל מדף נקי</option>
            </select>
          </label>
        )}
        {error && <div className="notice error">{error}</div>}
        <button
          className="primary-button"
          disabled={loading || !nickname.trim() || (mode === "create" ? !name.trim() : !code.trim())}
          onClick={() =>
            onSubmit({ name, nickname, code, includeExamples })
          }
        >
          {loading ? "רק רגע..." : mode === "create" ? "יצירת הבית וקבלת קוד" : "כניסה לבית"}
        </button>
        <p className="privacy-note">
          הקוד הוא מפתח גישה לבית. שמרו אותו במקום בטוח ואל תשתפו אותו בפומבי.
        </p>
      </section>
    </main>
  );
}

function ChoreModal({
  chore,
  members,
  onClose,
  onSave,
  onDelete,
}: {
  chore: Chore | null;
  members: HouseholdMember[];
  onClose: () => void;
  onSave: (draft: ChoreDraft) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<ChoreDraft>(() => (chore ? choreToDraft(chore) : blankDraft()));
  const update = <K extends keyof ChoreDraft>(key: K, value: ChoreDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const toggleDay = (day: number) =>
    update(
      "weekdays",
      draft.weekdays.includes(day)
        ? draft.weekdays.filter((value) => value !== day)
        : [...draft.weekdays, day].sort(),
    );

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="chore-modal-title">
        <div className="settings-row" style={{ paddingTop: 0, borderTop: 0 }}>
          <h2 id="chore-modal-title">{chore ? "עריכת מטלה" : "מטלה חדשה"}</h2>
          <button className="icon-button" onClick={onClose} aria-label="סגירה">
            <X size={19} />
          </button>
        </div>
        <div className="form-grid">
          <label className="full-width">
            מה צריך לעשות?
            <input
              autoFocus
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="למשל: להפעיל מכונת כביסה"
              maxLength={100}
            />
          </label>
          <label className="full-width">
            סוג מטלה
            <select
              value={draft.category}
              onChange={(event) => update("category", event.target.value as ChoreCategory)}
            >
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            אייקון
            <select value={draft.icon} onChange={(event) => update("icon", event.target.value)}>
              {iconOptions.map((icon) => <option key={icon} value={icon}>{icon}</option>)}
            </select>
          </label>
          <label>
            צבע
            <select value={draft.color} onChange={(event) => update("color", event.target.value)}>
              {colorOptions.map((color) => <option key={color} value={color}>{color}</option>)}
            </select>
          </label>
          <label className="full-width">
            הערה קצרה
            <textarea
              value={draft.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="מה בדיוק כדאי לזכור?"
              rows={2}
              maxLength={240}
            />
          </label>
          <label>
            תדירות
            <select
              value={draft.frequency}
              onChange={(event) => update("frequency", event.target.value as ChoreDraft["frequency"])}
            >
              <option value="weekly">כל שבוע</option>
              <option value="one_off">חד־פעמית</option>
            </select>
          </label>
          <label>
            אחראי/ת
            <select value={draft.assignedMemberId} onChange={(event) => update("assignedMemberId", event.target.value)}>
              <option value="">כל אחד בבית</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.nickname}</option>)}
            </select>
          </label>
          {draft.frequency === "weekly" ? (
            <label className="full-width">
              באילו ימים?
              <span className="days-picker">
                {weekLabels.map((label, day) => (
                  <button
                    type="button"
                    key={label}
                    className={`day-toggle ${draft.weekdays.includes(day) ? "selected" : ""}`}
                    onClick={() => toggleDay(day)}
                    aria-pressed={draft.weekdays.includes(day)}
                  >
                    {label}
                  </button>
                ))}
              </span>
            </label>
          ) : (
            <label className="full-width">
              תאריך
              <input
                type="date"
                value={draft.oneOffDate}
                onChange={(event) => update("oneOffDate", event.target.value)}
              />
            </label>
          )}
          <label>
            התחלה (אופציונלי)
            <input type="date" value={draft.startDate} onChange={(event) => update("startDate", event.target.value)} />
          </label>
          <label>
            סיום (אופציונלי)
            <input type="date" value={draft.endDate} onChange={(event) => update("endDate", event.target.value)} />
          </label>
        </div>
        <div className="modal-actions">
          <button className="primary-button" onClick={() => onSave(draft)} disabled={!draft.title.trim()}>
            שמירת מטלה
          </button>
          <button className="secondary-button" onClick={onClose}>ביטול</button>
          {chore && onDelete && (
            <button className="text-button" style={{ color: "var(--danger)" }} onClick={onDelete}>
              <Trash2 size={16} /> מחיקה
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function WeekView({
  store,
  weekDate,
  onShift,
  onAdd,
  onEdit,
  onToggle,
  onSkip,
}: {
  store: NakiliStore;
  weekDate: Date;
  onShift: (amount: number) => void;
  onAdd: () => void;
  onEdit: (chore: Chore) => void;
  onToggle: (chore: Chore, date: string) => void;
  onSkip: (chore: Chore, date: string) => void;
}) {
  const days = weekDays(weekDate, store.household);
  const scheduled = days.flatMap((day) =>
    choresForDate(store.chores, day.date).map((chore) => ({ chore, date: day.date })),
  );
  const completed = scheduled.filter(
    ({ chore, date }) => completionFor(store.completions, chore.id, date)?.status === "completed",
  ).length;
  const total = scheduled.length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">השבוע שלי</p>
          <h1>שלום, {store.members[0]?.nickname || "שם"} 👋</h1>
          <p>כל מה שצריך לעשות בבית, במקום אחד.</p>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Plus size={18} /> הוספת מטלה
        </button>
      </div>
      <section className="planner-card" style={{ padding: "18px" }}>
        <div className="week-toolbar">
          <div>
            <h2>{formatWeekTitle(days)}</h2>
            <span className="muted" style={{ fontSize: 12 }}>
              {completed} מתוך {total} מטלות הושלמו
            </span>
          </div>
          <div className="week-actions">
            <button className="icon-button" onClick={() => onShift(-1)} aria-label="שבוע קודם">
              <ChevronRight size={18} />
            </button>
            <button className="secondary-button" onClick={() => onShift(0)}>השבוע</button>
            <button className="icon-button" onClick={() => onShift(1)} aria-label="שבוע הבא">
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>
        <div className="progress-bar" aria-label={`התקדמות שבועית ${progress}%`}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="week-grid">
          {days.map((day) => {
            const dayChores = choresForDate(store.chores, day.date);
            const dayCompleted = dayChores.filter(
              (chore) => completionFor(store.completions, chore.id, day.date)?.status === "completed",
            ).length;
            return (
              <article className={`day-column ${day.isToday ? "today" : ""}`} key={day.date}>
                <div className="day-heading">
                  <div>
                    <strong>{day.label}</strong>
                    <small>{day.dayNumber}</small>
                  </div>
                  {day.isToday && <span className="today-pill">היום</span>}
                </div>
                <p className="day-count">{dayCompleted}/{dayChores.length} הושלמו</p>
                <div className="chore-list">
                  {dayChores.length ? dayChores.map((chore) => {
                    const completion = completionFor(store.completions, chore.id, day.date);
                    const completedNow = completion?.status === "completed";
                    const assignedMember = store.members.find((member) => member.id === chore.assignedMemberId);
                    return (
                      <div
                        className={`chore-card ${completedNow ? "completed" : ""}`}
                        key={`${chore.id}-${day.date}`}
                        style={{ "--card-color": chore.color } as React.CSSProperties}
                      >
                        <button
                          className="check"
                          onClick={() => onToggle(chore, day.date)}
                          aria-label={completedNow ? `ביטול ביצוע: ${chore.title}` : `סימון בוצע: ${chore.title}`}
                        >
                          {completedNow && <Check size={14} />}
                        </button>
                        <button className="chore-content" onClick={() => onEdit(chore)}>
                          <strong>{chore.title}</strong>
                          <small>
                            {categoryLabel(chore.category)}
                            {assignedMember ? ` · אחראי/ת: ${assignedMember.nickname}` : ""}
                            {chore.description ? ` · ${chore.description}` : ""}
                          </small>
                        </button>
                        <button
                          className="text-button"
                          style={{ padding: 0, fontSize: 10 }}
                          onClick={() => onSkip(chore, day.date)}
                          aria-label={`דילוג על ${chore.title}`}
                        >
                          דלג
                        </button>
                        <span className="chore-icon" aria-hidden="true">{chore.icon}</span>
                      </div>
                    );
                  }) : <div className="empty-day">יום פנוי 🎉</div>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

function SettingsView({
  store,
  onCopy,
  onRotate,
  onExport,
}: {
  store: NakiliStore;
  onCopy: () => void;
  onRotate: () => void;
  onExport: (format: "json" | "csv") => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">הגדרות</p>
          <h1>{store.household.name}</h1>
          <p>הבית שלכם והדרך שבה אתם עובדים יחד.</p>
        </div>
      </div>
      <section className="settings-card">
        <h2><KeyRound size={19} /> קוד הבית</h2>
        <p>שתפו את הקוד רק עם בני הבית. החלפה תבטל את הקוד הקודם.</p>
        <div className="code-box">
          <code>{store.household.accessCode ?? "הקוד נשמר באופן פרטי"}</code>
          <div className="topbar-actions">
            <button className="secondary-button" onClick={onCopy}><Copy size={16} /> העתקה</button>
            <button className="secondary-button" onClick={onRotate}><RotateCcw size={16} /> החלפה</button>
          </div>
        </div>
      </section>
      <section className="settings-card">
        <h2><Users size={19} /> בני הבית</h2>
        <p>הכינויים עוזרים לדעת למי מטלה שייכת, אבל האחריות תמיד יכולה להישאר משותפת.</p>
        {store.members.map((member) => (
          <div className="member-row" key={member.id}>
            <span className="member-info">
              <strong>{member.nickname}</strong>
              <small>{member.role === "owner" ? "בעל/ת הבית" : "חבר/ת הבית"}</small>
            </span>
          </div>
        ))}
      </section>
      <section className="settings-card">
        <h2><Download size={19} /> גיבוי מקומי</h2>
        <p>הורידו עותק של המידע למחשב. הוא לא נשלח ל־GitHub ולא מתפרסם.</p>
        <div className="topbar-actions">
          <button className="secondary-button" onClick={() => onExport("json")}>ייצוא JSON</button>
          <button className="secondary-button" onClick={() => onExport("csv")}>ייצוא CSV</button>
        </div>
      </section>
    </>
  );
}

export function NakiliApp({ supabaseConfigured }: { supabaseConfigured: boolean }) {
  const [hydrated, setHydrated] = useState(true);
  const [store, setStore] = useState<NakiliStore | null>(null);
  const [accessMode, setAccessMode] = useState<AccessMode>("landing");
  const [screen, setScreen] = useState<Screen>("week");
  const [weekDate, setWeekDate] = useState(new Date());
  const [modalChore, setModalChore] = useState<Chore | null | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = useMemo(
    () => (supabaseConfigured ? createSupabaseBrowserClient() : null),
    [supabaseConfigured],
  );

  const persistLocal = useCallback((next: NakiliStore | null) => {
    if (!supabaseConfigured && typeof window !== "undefined") {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    }
  }, [supabaseConfigured]);

  const loadRemote = useCallback(async () => {
    if (!supabase) return null;
    const next = await fetchRemoteStore(supabase);
    setStore(next);
    return next;
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!supabaseConfigured) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!cancelled && saved) {
          try {
            setStore(normalizeStore(JSON.parse(saved) as NakiliStore));
          } catch {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
        if (!cancelled) setHydrated(true);
        return;
      }

      try {
        await loadRemote();
      } catch {
        if (!cancelled) setError("לא הצלחנו לטעון את הבית. נסו לרענן.");
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };
    void restore();
    return () => { cancelled = true; };
  }, [loadRemote, supabaseConfigured]);

  const updateStore = (next: NakiliStore) => {
    setStore(next);
    persistLocal(next);
  };

  const handleAccess = async (values: { name: string; nickname: string; code: string; includeExamples: boolean }) => {
    setLoading(true);
    setError("");
    try {
      if (supabase) {
        const endpoint = accessMode === "create" ? "/api/access/create" : "/api/access/join";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            accessMode === "create"
              ? { householdName: values.name.trim(), nickname: values.nickname.trim() }
              : { code: values.code.trim(), nickname: values.nickname.trim() },
          ),
        });
        const result = await response.json() as {
          error?: string;
          session?: Session | null;
          household?: { id: string; name: string; timezone: string; week_start: number; owner_id: string };
        };
        if (!response.ok || !result.household) throw new Error(result.error ?? "הפעולה נכשלה");
        if (result.session) await supabase.auth.setSession(result.session);
        const next = await loadRemote();
        if (!next) throw new Error("הבית נוצר אבל לא נטען. נסו לרענן.");
        if (accessMode === "create" && values.includeExamples) {
          for (const chore of clone(demoStore.chores)) {
            await saveRemoteChore(next, {
              ...blankDraft(),
              title: chore.title,
              description: chore.description,
              category: chore.category,
              icon: chore.icon,
              color: chore.color,
              weekdays: chore.weekdays,
            });
          }
          await loadRemote();
        }
      } else {
        const next = accessMode === "create"
          ? createLocalStore(values.name.trim(), values.nickname.trim(), values.includeExamples)
          : values.code.trim().toUpperCase() === demoStore.household.accessCode
            ? {
                ...clone(demoStore),
                members: [{ ...clone(demoStore.members[0]), nickname: values.nickname.trim() }],
                household: { ...clone(demoStore.household) },
              }
            : null;
        if (!next) throw new Error("במצב המקומי אפשר להצטרף רק לבית הדוגמה. הגדירו Supabase לשיתוף אמיתי.");
        updateStore(next);
      }
      setAccessMode("landing");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "משהו השתבש");
    } finally {
      setLoading(false);
    }
  };

  const saveRemoteChore = async (current: NakiliStore, draft: ChoreDraft, existingId?: string) => {
    if (!supabase) return;
    const choreResult = existingId
      ? await supabase.from("chores").update({
          title: draft.title.trim(),
          description: draft.description.trim(),
          category: draft.category,
          icon: draft.icon,
          color: draft.color,
          assigned_member_id: draft.assignedMemberId || null,
          updated_at: new Date().toISOString(),
        }).eq("id", existingId).select("id").single()
      : await supabase.from("chores").insert({
          household_id: current.household.id,
          title: draft.title.trim(),
          description: draft.description.trim(),
          category: draft.category,
          icon: draft.icon,
          color: draft.color,
          assigned_member_id: draft.assignedMemberId || null,
          sort_order: current.chores.length + 1,
        }).select("id").single();
    if (choreResult.error || !choreResult.data) throw new Error("שמירת המטלה נכשלה");
    const schedule = {
      chore_id: choreResult.data.id,
      frequency: draft.frequency,
      weekdays: draft.frequency === "weekly" ? draft.weekdays : [],
      one_off_date: draft.frequency === "one_off" ? draft.oneOffDate : null,
      start_date: draft.startDate || null,
      end_date: draft.endDate || null,
    };
    const scheduleResult = await supabase.from("chore_schedules").upsert(schedule, { onConflict: "chore_id" });
    if (scheduleResult.error) throw new Error("שמירת תדירות המטלה נכשלה");
  };

  const saveChore = async (draft: ChoreDraft) => {
    if (!store || !draft.title.trim()) return;
    if (draft.frequency === "weekly" && draft.weekdays.length === 0) {
      setError("בחרו לפחות יום אחד בשבוע");
      return;
    }
    setLoading(true);
    try {
      const existing = modalChore && modalChore !== null ? modalChore : null;
      if (supabase) {
        await saveRemoteChore(store, draft, existing?.id);
        await loadRemote();
      } else {
        const nextChore: Chore = {
          id: existing?.id ?? newId(),
          householdId: store.household.id,
          title: draft.title.trim(),
          description: draft.description.trim(),
          category: draft.category,
          icon: draft.icon,
          color: draft.color,
          assignedMemberId: draft.assignedMemberId || null,
          active: true,
          sortOrder: existing?.sortOrder ?? store.chores.length + 1,
          frequency: draft.frequency,
          weekdays: draft.frequency === "weekly" ? draft.weekdays : [],
          oneOffDate: draft.frequency === "one_off" ? draft.oneOffDate : null,
          startDate: draft.startDate || null,
          endDate: draft.endDate || null,
        };
        updateStore({
          ...store,
          chores: existing
            ? store.chores.map((chore) => chore.id === existing.id ? nextChore : chore)
            : [...store.chores, nextChore],
        });
      }
      setModalChore(undefined);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "שמירת המטלה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const deleteChore = async () => {
    if (!store || !modalChore || !window.confirm(`למחוק את "${modalChore.title}"?`)) return;
    setLoading(true);
    try {
      if (supabase) {
        const result = await supabase.from("chores").delete().eq("id", modalChore.id);
        if (result.error) throw new Error("מחיקת המטלה נכשלה");
        await loadRemote();
      } else {
        updateStore({ ...store, chores: store.chores.filter((chore) => chore.id !== modalChore.id) });
      }
      setModalChore(undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "מחיקת המטלה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  const toggleCompletion = async (chore: Chore, date: string) => {
    if (!store) return;
    const existing = completionFor(store.completions, chore.id, date);
    const memberId = store.members[0]?.id ?? null;
    try {
      if (supabase) {
        if (existing?.status === "completed") {
          const result = await supabase.from("chore_completions").delete().eq("id", existing.id);
          if (result.error) throw new Error("ביטול הביצוע נכשל");
        } else {
          const result = await supabase.from("chore_completions").upsert({
            household_id: store.household.id,
            chore_id: chore.id,
            occurrence_date: date,
            status: "completed",
            completed_by: memberId,
          }, { onConflict: "chore_id,occurrence_date" });
          if (result.error) throw new Error("שמירת הביצוע נכשלה");
        }
        await loadRemote();
      } else {
        updateStore({
          ...store,
          completions: existing?.status === "completed"
            ? store.completions.filter((completion) => completion.id !== existing.id)
            : [
                ...store.completions.filter((completion) => completion.id !== existing?.id),
                {
                  id: existing?.id ?? newId(),
                  choreId: chore.id,
                  occurrenceDate: date,
                  status: "completed",
                  completedBy: memberId,
                  completedAt: new Date().toISOString(),
                },
              ],
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "עדכון הביצוע נכשל");
    }
  };

  const skipChore = async (chore: Chore, date: string) => {
    if (!store) return;
    const existing = completionFor(store.completions, chore.id, date);
    try {
      if (supabase) {
        const result = await supabase.from("chore_completions").upsert({
          household_id: store.household.id,
          chore_id: chore.id,
          occurrence_date: date,
          status: "skipped",
          completed_by: store.members[0]?.id ?? null,
        }, { onConflict: "chore_id,occurrence_date" });
        if (result.error) throw new Error("הדילוג לא נשמר");
        await loadRemote();
      } else {
        updateStore({
          ...store,
          completions: [
            ...store.completions.filter((completion) => completion.id !== existing?.id),
            {
              id: existing?.id ?? newId(),
              choreId: chore.id,
              occurrenceDate: date,
              status: "skipped",
              completedBy: store.members[0]?.id ?? null,
              completedAt: new Date().toISOString(),
            },
          ],
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "הדילוג לא נשמר");
    }
  };

  const rotateCode = async () => {
    if (!store) return;
    if (!supabase) {
      updateStore({ ...store, household: { ...store.household, accessCode: createAccessCode() } });
      return;
    }
    const response = await fetch("/api/access/rotate", { method: "POST" });
    const result = await response.json() as { code?: string; error?: string };
    if (!response.ok || !result.code) {
      setError(result.error ?? "החלפת הקוד נכשלה");
      return;
    }
    setStore({ ...store, household: { ...store.household, accessCode: result.code } });
  };

  const exportStore = (formatName: "json" | "csv") => {
    if (!store) return;
    if (formatName === "json") {
      downloadFile("nakili-backup.json", JSON.stringify(store, null, 2), "application/json");
      return;
    }
    const rows = ["date,title,status,description"];
    const from = weekDays(weekDate, store.household);
    from.forEach((day) => {
      choresForDate(store.chores, day.date).forEach((chore) => {
        const status = completionFor(store.completions, chore.id, day.date)?.status ?? "pending";
        rows.push([day.date, chore.title, status, chore.description].map((value) => `"${value.replaceAll('"', '""')}"`).join(","));
      });
    });
    downloadFile("nakili-week.csv", `\uFEFF${rows.join("\n")}`, "text/csv;charset=utf-8");
  };

  if (!hydrated) return <div className="loading">טוענים את נקי-לי...</div>;
  if (!store && accessMode === "landing") {
    return <Landing onSelect={setAccessMode} onDemo={() => setStore(clone(demoStore))} />;
  }
  if (!store) {
    return (
      <AccessForm
        mode={accessMode === "join" ? "join" : "create"}
        loading={loading}
        error={error}
        onBack={() => { setAccessMode("landing"); setError(""); }}
        onSubmit={handleAccess}
      />
    );
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><NakiliLogo title="" /></span>
          <span>
            <strong>נקי-לי</strong>
            <small>{store.household.name}</small>
          </span>
        </div>
        <div className="topbar-actions">
          <button className="secondary-button" onClick={() => setScreen(screen === "week" ? "settings" : "week")}>
            {screen === "week" ? <><Settings size={16} /> הגדרות</> : <><CalendarDays size={16} /> השבוע שלי</>}
          </button>
          <button
            className="icon-button"
            onClick={async () => {
              if (supabase) await supabase.auth.signOut();
              setStore(null);
              persistLocal(null);
              setAccessMode("landing");
            }}
            aria-label="יציאה"
            title="יציאה"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>
      {error && <div className="notice error" role="alert">{error}</div>}
      {screen === "week" ? (
        <WeekView
          store={store}
          weekDate={weekDate}
          onShift={(amount) => setWeekDate(amount === 0 ? new Date() : shiftWeek(weekDate, amount))}
          onAdd={() => setModalChore(null)}
          onEdit={setModalChore}
          onToggle={toggleCompletion}
          onSkip={skipChore}
        />
      ) : (
        <SettingsView
          store={store}
          onCopy={() => {
            if (store.household.accessCode) void navigator.clipboard?.writeText(store.household.accessCode);
          }}
          onRotate={rotateCode}
          onExport={exportStore}
        />
      )}
      <footer className="privacy-note" style={{ textAlign: "center" }}>
        נקי-לי שומר על הבית שלכם פשוט, פרטי וחינמי.
      </footer>
      {modalChore !== undefined && (
        <ChoreModal
          chore={modalChore}
          members={store.members}
          onClose={() => setModalChore(undefined)}
          onSave={(draft) => void saveChore(draft)}
          onDelete={modalChore ? () => void deleteChore() : undefined}
        />
      )}
    </main>
  );
}
