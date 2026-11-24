"use client";

import { ArrowRight, Check, Copy, KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { NakiliLogo } from "@/components/nakili-logo";

export type AccessValues = { name: string; nickname: string; code: string; includeExamples: boolean };

const previewTasks = [
  { icon: "🧺", title: "מכונת כביסה", done: true },
  { icon: "🛒", title: "קניות לבית", done: false },
  { icon: "📦", title: "סידור המזווה", done: false },
];

export function Landing({
  onSelect,
  onDemo,
}: {
  onSelect: (mode: "create" | "join") => void;
  onDemo: () => void;
}) {
  return (
    <main className="shell landing">
      <section className="hero" aria-labelledby="landing-title">
        <div className="hero-brand">
          <NakiliLogo size={64} title="" />
          <strong>נקי-לי</strong>
        </div>
        <h1 id="landing-title">הבית מסודר,<br />בלי לזכור הכול.</h1>
        <p className="hero-copy">
          ניקיון, סידורים וארגון — בוחרים באילו ימים, ומסמנים כשסיימתם.
        </p>
        <div className="hero-preview" aria-hidden="true">
          {previewTasks.map((task) => (
            <div className={`preview-row ${task.done ? "done" : ""}`} key={task.title}>
              <span className="preview-check">{task.done && <Check size={13} strokeWidth={3} />}</span>
              <span>{task.title}</span>
              <span className="preview-icon">{task.icon}</span>
            </div>
          ))}
        </div>
        <div className="landing-actions">
          <button className="primary-button large" onClick={() => onSelect("create")}>
            <Plus size={19} /> יצירת בית חדש
          </button>
          <button className="secondary-button large" onClick={() => onSelect("join")}>
            <KeyRound size={18} /> יש לי קוד בית
          </button>
          <button className="text-button" onClick={onDemo}>רק להציץ בדוגמה</button>
        </div>
        <p className="privacy-note">בלי הרשמה ובלי פרטים אישיים. רק קוד בית פרטי.</p>
      </section>
    </main>
  );
}

export function AccessForm({
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
  onSubmit: (values: AccessValues) => void;
}) {
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const [includeExamples, setIncludeExamples] = useState(true);
  const ready = nickname.trim() && (mode === "create" ? name.trim() : code.trim().length >= 8);

  return (
    <main className="shell narrow">
      <button className="text-button back-button" onClick={onBack}>
        <ArrowRight size={17} /> חזרה
      </button>
      <form
        className="card form-card"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready && !loading) onSubmit({ name, nickname, code, includeExamples });
        }}
      >
        <NakiliLogo size={52} title="" />
        <h1>{mode === "create" ? "בית חדש" : "הצטרפות לבית"}</h1>
        <p className="muted">
          {mode === "create"
            ? "שני פרטים קטנים ומתחילים. תקבלו קוד בית לשיתוף עם בני הבית."
            : "הקלידו את הקוד שקיבלתם ממי שיצר את הבית."}
        </p>
        {mode === "create" ? (
          <label>
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
          <label>
            קוד הבית
            <input
              autoFocus
              dir="ltr"
              className="code-input"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="NKI-XXXXXXXX-XXXXXXXX"
              autoComplete="off"
              spellCheck={false}
              maxLength={32}
            />
          </label>
        )}
        <label>
          איך לקרוא לך?
          <input
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="למשל: דני"
            maxLength={40}
          />
        </label>
        {mode === "create" && (
          <label className="switch-row">
            <input
              type="checkbox"
              checked={includeExamples}
              onChange={(event) => setIncludeExamples(event.target.checked)}
            />
            <span className="switch" aria-hidden="true" />
            <span>להתחיל עם כמה משימות לדוגמה</span>
          </label>
        )}
        {error && <div className="notice error" role="alert">{error}</div>}
        <button className="primary-button large" type="submit" disabled={loading || !ready}>
          {loading ? "רק רגע..." : mode === "create" ? "יצירת הבית" : "כניסה לבית"}
        </button>
      </form>
    </main>
  );
}

export function CodeReveal({
  code,
  householdName,
  onContinue,
}: {
  code: string;
  householdName: string;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <main className="shell narrow">
      <section className="card form-card reveal">
        <span className="reveal-badge" aria-hidden="true">🎉</span>
        <h1>{householdName} מוכן!</h1>
        <p className="muted">
          זה קוד הבית שלכם. שתפו אותו עם בני הבית, ושמרו אותו — בעזרתו נכנסים מחדש מכל מכשיר.
        </p>
        <div className="code-box">
          <code>{code}</code>
          <button
            className="secondary-button"
            onClick={() => {
              void navigator.clipboard?.writeText(code);
              setCopied(true);
            }}
          >
            {copied ? <><Check size={16} /> הועתק</> : <><Copy size={16} /> העתקה</>}
          </button>
        </div>
        <p className="notice">מטעמי פרטיות הקוד לא נשמר אצלנו בגלוי, ולכן לא נוכל להציג אותו שוב.</p>
        <button className="primary-button large" onClick={onContinue}>שמרתי, אפשר להמשיך</button>
      </section>
    </main>
  );
}
