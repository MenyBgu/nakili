"use client";

import { ArrowRight, BarChart3, Settings, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AccessForm, CodeReveal, Landing, type AccessValues } from "@/components/access-screens";
import { ChoreSheet } from "@/components/chore-sheet";
import { NakiliLogo } from "@/components/nakili-logo";
import { SettingsView } from "@/components/settings-view";
import { StatsView } from "@/components/stats-view";
import { WeekView } from "@/components/week-view";
import { demoStore } from "@/lib/demo-data";
import { choresForDate, completionFor, localDate, parseLocalDate, shiftWeek, weekDays } from "@/lib/date";
import {
  STORAGE_KEY,
  clone,
  createLocalAccessCode,
  createLocalStore,
  downloadFile,
  fetchRemoteStore,
  forgetCode,
  newId,
  normalizeStore,
  recallCode,
  rememberCode,
  type ChoreDraft,
} from "@/lib/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Chore, CompletionStatus, HouseholdMember, NakiliStore } from "@/lib/types";

const SYNC_INTERVAL_MS = 12000;

function sameStore(a: NakiliStore, b: NakiliStore) {
  const stable = (value: NakiliStore) =>
    JSON.stringify({
      ...value,
      completions: [...value.completions].sort((x, y) => x.id.localeCompare(y.id)),
    });
  return stable(a) === stable(b);
}

type Screen = "week" | "settings" | "stats";
type AccessMode = "landing" | "create" | "join" | "pair";
type SheetState = { chore: Chore | null; date: string } | null;

export function NakiliApp({ supabaseConfigured }: { supabaseConfigured: boolean }) {
  const [hydrated, setHydrated] = useState(false);
  const [store, setStore] = useState<NakiliStore | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [accessMode, setAccessMode] = useState<AccessMode>("landing");
  const [screen, setScreen] = useState<Screen>("week");
  const [weekDate, setWeekDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => localDate());
  const [sheet, setSheet] = useState<SheetState>(null);
  const [revealCode, setRevealCode] = useState<string | null>(null);
  const [devicePairingCode, setDevicePairingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [notice, setNotice] = useState("");
  // Background sync must never overwrite a change that is still being saved.
  const pendingWrites = useRef(0);
  const lastWriteAt = useRef(0);
  const missedSyncs = useRef(0);
  const supabase = useMemo(
    () => (supabaseConfigured ? createSupabaseBrowserClient() : null),
    [supabaseConfigured],
  );
  const remote = supabase && !isDemo ? supabase : null;

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((current) => (current === message ? "" : current)), 2200);
  }, []);

  const commit = useCallback((next: NakiliStore | null, persist = !supabaseConfigured && !isDemo) => {
    setStore(next);
    if (!persist) return;
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }, [isDemo, supabaseConfigured]);

  const reload = useCallback(async () => {
    if (!supabase) return null;
    const next = await fetchRemoteStore(supabase);
    if (next) next.household.accessCode = recallCode(next.household.id);
    setStore(next);
    return next;
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      if (!supabaseConfigured) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            if (!cancelled) setStore(normalizeStore(JSON.parse(saved) as NakiliStore));
          } catch {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } else {
        try {
          await reload();
        } catch {
          if (!cancelled) setError("לא הצלחנו לטעון את הבית. בדקו את החיבור ונסו לרענן.");
        }
      }
      if (!cancelled) setHydrated(true);
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, [reload, supabaseConfigured]);

  const hasStore = Boolean(store);
  useEffect(() => {
    if (!supabase || isDemo || !hasStore) return;
    let stopped = false;
    const sync = async () => {
      if (stopped || document.visibilityState !== "visible") return;
      if (pendingWrites.current > 0 || Date.now() - lastWriteAt.current < 2500) return;
      try {
        const next = await fetchRemoteStore(supabase);
        if (stopped || pendingWrites.current > 0) return;
        if (!next) {
          // Only treat this as "removed from the house" after two confirmations while online.
          missedSyncs.current += 1;
          if (missedSyncs.current >= 2 && navigator.onLine) {
            missedSyncs.current = 0;
            await supabase.auth.signOut().catch(() => undefined);
            setStore(null);
            setScreen("week");
            setAccessMode("landing");
            setNotice("אינכם מחוברים יותר לבית הזה. אפשר להצטרף שוב עם קוד בית או קוד חיבור.");
          }
          return;
        }
        missedSyncs.current = 0;
        next.household.accessCode = recallCode(next.household.id);
        setStore((current) => (current && sameStore(current, next) ? current : next));
      } catch {
        // Offline or a temporary error: keep what is on screen and try again later.
      }
    };
    const timer = window.setInterval(() => void sync(), SYNC_INTERVAL_MS);
    const onVisible = () => void sync();
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [supabase, isDemo, hasStore]);

  const run = async (action: () => Promise<void>, fallbackMessage: string) => {
    pendingWrites.current += 1;
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : fallbackMessage);
      if (remote) await reload().catch(() => undefined);
    } finally {
      pendingWrites.current -= 1;
      lastWriteAt.current = Date.now();
    }
  };

  const handleAccess = async (values: AccessValues) => {
    setLoading(true);
    setError("");
    const nickname = values.nickname.trim();
    try {
      if (supabase) {
        const creating = accessMode === "create";
        const pairing = accessMode === "pair";
        const response = await fetch(
          creating ? "/api/access/create" : pairing ? "/api/access/device/join" : "/api/access/join",
          {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            creating
              ? { householdName: values.name.trim(), nickname, includeExamples: values.includeExamples }
              : pairing
                ? { code: values.code.trim() }
              : { code: values.code.trim(), nickname },
          ),
          },
        );
        const result = (await response.json().catch(() => ({}))) as {
          error?: string;
          code?: string;
          session?: Session | null;
          household?: { id: string };
        };
        if (!response.ok || !result.household) throw new Error(result.error ?? "הפעולה נכשלה. נסו שוב.");
        if (result.session) await supabase.auth.setSession(result.session);
        const next = await fetchRemoteStore(supabase);
        if (!next) throw new Error("הבית נוצר אבל לא נטען. נסו לרענן את הדף.");
        const knownCode = !pairing ? (creating ? result.code : values.code.trim().toUpperCase()) : undefined;
        if (knownCode) {
          rememberCode(next.household.id, knownCode);
          next.household.accessCode = knownCode;
        }
        if (creating && result.code) setRevealCode(result.code);
        setStore(next);
      } else if (accessMode === "create") {
        const next = createLocalStore(values.name.trim(), nickname, values.includeExamples);
        commit(next, true);
        setRevealCode(next.household.accessCode ?? null);
      } else {
        if (values.code.trim().toUpperCase() !== demoStore.household.accessCode) {
          throw new Error("במצב מקומי אפשר להצטרף רק לבית הדוגמה.");
        }
        const next = clone(demoStore);
        next.members[0].nickname = nickname;
        next.currentMemberId = next.members[0].id;
        commit(next, true);
      }
      setIsDemo(false);
      setAccessMode("landing");
      setScreen("week");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "משהו השתבש. נסו שוב.");
    } finally {
      setLoading(false);
    }
  };

  const saveChore = async (draft: ChoreDraft) => {
    if (!store || !sheet) return;
    const existing = sheet.chore;
    const recurring = draft.frequency !== "one_off";
    const fields = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      category: draft.category,
      icon: draft.icon,
      color: draft.color,
      assignedMemberId: draft.assignedMemberId || null,
      frequency: draft.frequency,
      weekdays: draft.frequency === "weekly" || draft.frequency === "biweekly" ? draft.weekdays : [],
      oneOffDate: recurring ? null : draft.oneOffDate,
      startDate: recurring ? draft.startDate || null : null,
      endDate: recurring ? draft.endDate || null : null,
    };
    setLoading(true);
    await run(async () => {
      if (remote) {
        const row = {
          title: fields.title,
          description: fields.description,
          category: fields.category,
          icon: fields.icon,
          color: fields.color,
          assigned_member_id: fields.assignedMemberId,
        };
        const saved = existing
          ? await remote.from("chores").update(row).eq("id", existing.id).select("id").single()
          : await remote
              .from("chores")
              .insert({ ...row, household_id: store.household.id, sort_order: store.chores.length + 1 })
              .select("id")
              .single();
        if (saved.error || !saved.data) throw new Error("שמירת המשימה נכשלה");
        const schedule = await remote.from("chore_schedules").upsert(
          {
            chore_id: saved.data.id,
            frequency: fields.frequency,
            weekdays: fields.weekdays,
            one_off_date: fields.oneOffDate,
            start_date: fields.startDate,
            end_date: fields.endDate,
          },
          { onConflict: "chore_id" },
        );
        if (schedule.error) {
          if (!existing) await remote.from("chores").delete().eq("id", saved.data.id);
          throw new Error("שמירת הימים של המשימה נכשלה");
        }
        await reload();
      } else {
        const chore: Chore = {
          ...fields,
          id: existing?.id ?? newId(),
          householdId: store.household.id,
          active: true,
          sortOrder: existing?.sortOrder ?? store.chores.length + 1,
        };
        commit({
          ...store,
          chores: existing
            ? store.chores.map((item) => (item.id === existing.id ? chore : item))
            : [...store.chores, chore],
        });
      }
      setSheet(null);
      showToast(existing ? "המשימה עודכנה" : "המשימה נוספה");
    }, "שמירת המשימה נכשלה");
    setLoading(false);
  };

  const deleteChore = async (chore: Chore) => {
    if (!store || !chore || !window.confirm(`למחוק את "${chore.title}"?`)) return;
    setLoading(true);
    await run(async () => {
      if (remote) {
        const result = await remote.from("chores").delete().eq("id", chore.id);
        if (result.error) throw new Error("מחיקת המשימה נכשלה");
        await reload();
      } else {
        commit({
          ...store,
          chores: store.chores.filter((item) => item.id !== chore.id),
          completions: store.completions.filter((item) => item.choreId !== chore.id),
        });
      }
      setSheet((current) => current?.chore?.id === chore.id ? null : current);
      showToast("המשימה נמחקה");
    }, "מחיקת המשימה נכשלה");
    setLoading(false);
  };

  const setStatus = async (chore: Chore, date: string, status: CompletionStatus | null) => {
    if (!store) return;
    const existing = completionFor(store.completions, chore.id, date);
    const others = store.completions.filter((item) => item !== existing);
    const memberId = store.currentMemberId ?? null;
    commit({
      ...store,
      completions: status
        ? [...others, {
            id: existing?.id ?? newId(),
            choreId: chore.id,
            occurrenceDate: date,
            status,
            completedBy: memberId,
            completedAt: new Date().toISOString(),
          }]
        : others,
    });
    if (!remote) return;
    await run(async () => {
      const result = status
        ? await remote.from("chore_completions").upsert(
            {
              household_id: store.household.id,
              chore_id: chore.id,
              occurrence_date: date,
              status,
              completed_by: memberId,
              completed_at: new Date().toISOString(),
            },
            { onConflict: "chore_id,occurrence_date" },
          )
        : await remote.from("chore_completions").delete().eq("chore_id", chore.id).eq("occurrence_date", date);
      if (result.error) throw new Error("העדכון לא נשמר. נסו שוב.");
    }, "העדכון לא נשמר");
  };

  const toggleDone = (chore: Chore, date: string) => {
    if (!store) return;
    const current = completionFor(store.completions, chore.id, date)?.status;
    void setStatus(chore, date, current === "completed" ? null : "completed");
  };

  const toggleSkip = (chore: Chore, date: string) => {
    if (!store) return;
    const current = completionFor(store.completions, chore.id, date)?.status;
    void setStatus(chore, date, current === "skipped" ? null : "skipped");
  };

  const createInvite = async () => {
    if (
      !store ||
      !window.confirm("ליצור קוד הזמנה חדש? הקוד הקודם יפסיק לעבוד, אבל טלפונים שכבר מחוברים ימשיכו כרגיל.")
    ) return;
    await run(async () => {
      if (!remote) {
        commit({ ...store, household: { ...store.household, accessCode: createLocalAccessCode() } });
      } else {
        const response = await fetch("/api/access/rotate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ householdId: store.household.id }),
        });
        const result = (await response.json().catch(() => ({}))) as { code?: string; error?: string };
        if (!response.ok || !result.code) throw new Error(result.error ?? "יצירת קוד חדש נכשלה");
        rememberCode(store.household.id, result.code);
        setStore({ ...store, household: { ...store.household, accessCode: result.code } });
      }
      showToast("נוצר קוד הזמנה");
    }, "יצירת קוד חדש נכשלה");
  };

  const createDevicePairing = async () => {
    if (!store || !remote) return;
    await run(async () => {
      const response = await fetch("/api/access/device/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: store.household.id }),
      });
      const result = (await response.json().catch(() => ({}))) as { code?: string; error?: string };
      if (!response.ok || !result.code) throw new Error(result.error ?? "יצירת קוד החיבור נכשלה");
      setDevicePairingCode(result.code);
      showToast("נוצר קוד חיבור למכשיר");
    }, "יצירת קוד החיבור נכשלה");
  };

  const callMembers = async (method: "POST" | "DELETE" | "PATCH", body: Record<string, string>) => {
    const response = await fetch("/api/members", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) throw new Error(result.error ?? "הפעולה נכשלה");
  };

  const addMember = async (nickname: string) => {
    if (!store) return;
    await run(async () => {
      if (remote) {
        await callMembers("POST", { householdId: store.household.id, nickname });
        await reload();
      } else {
        commit({
          ...store,
          members: [
            ...store.members,
            { id: newId(), userId: null, householdId: store.household.id, nickname, role: "member" },
          ],
        });
      }
      showToast(`${nickname} נוסף/ה לבית`);
    }, "ההוספה נכשלה");
  };

  const setManager = async (member: HouseholdMember, manager: boolean) => {
    if (!store) return;
    const question = manager
      ? `למנות את ${member.nickname} כמנהל/ת? מנהלים יכולים לשנות את שם הבית, להסיר בני בית ולמנות מנהלים.`
      : `להסיר את ${member.nickname} מניהול הבית? הוא/היא יישארו בבית כבני בית רגילים.`;
    if (!window.confirm(question)) return;
    await run(async () => {
      const role = manager ? "owner" : "member";
      await callMembers("PATCH", { householdId: store.household.id, memberId: member.id, role });
      await reload();
      showToast(manager ? `${member.nickname} מונה/תה למנהל/ת` : `${member.nickname} כבר לא מנהל/ת`);
    }, "העדכון נכשל");
  };

  const removeMember = async (member: HouseholdMember) => {
    if (!store || !window.confirm(`להסיר את ${member.nickname} מהבית? משימות שלו/ה יעברו ל"כולם".`)) return;
    await run(async () => {
      if (remote) {
        await callMembers("DELETE", { householdId: store.household.id, memberId: member.id });
        await reload();
      } else {
        commit({
          ...store,
          members: store.members.filter((item) => item.id !== member.id),
          chores: store.chores.map((chore) =>
            chore.assignedMemberId === member.id ? { ...chore, assignedMemberId: null } : chore,
          ),
        });
      }
      showToast(`${member.nickname} הוסר/ה`);
    }, "ההסרה נכשלה");
  };

  const renameHousehold = async (name: string) => {
    if (!store) return;
    commit({ ...store, household: { ...store.household, name } });
    if (!remote) return;
    await run(async () => {
      const result = await remote.from("households").update({ name }).eq("id", store.household.id);
      if (result.error) throw new Error("שינוי השם נכשל");
    }, "שינוי השם נכשל");
  };

  const rename = async (nickname: string) => {
    if (!store?.currentMemberId) return;
    const memberId = store.currentMemberId;
    commit({
      ...store,
      members: store.members.map((member) => (member.id === memberId ? { ...member, nickname } : member)),
    });
    if (!remote) return;
    await run(async () => {
      const result = await remote.from("household_members").update({ nickname }).eq("id", memberId).select("id");
      if (result.error || !result.data?.length) throw new Error("שינוי הכינוי נכשל");
    }, "שינוי הכינוי נכשל");
  };

  const changeWeekStart = async (weekStart: 0 | 1) => {
    if (!store) return;
    commit({ ...store, household: { ...store.household, weekStart } });
    if (!remote) return;
    await run(async () => {
      const result = await remote.from("households").update({ week_start: weekStart }).eq("id", store.household.id);
      if (result.error) throw new Error("השינוי לא נשמר");
    }, "השינוי לא נשמר");
  };

  const exportStore = (formatName: "json" | "csv") => {
    if (!store) return;
    if (formatName === "json") {
      const { household, members, chores, completions } = store;
      downloadFile(
        "nakili-backup.json",
        JSON.stringify({ household: { ...household, accessCode: undefined }, members, chores, completions }, null, 2),
        "application/json",
      );
      return;
    }
    const statusLabel = { completed: "בוצע", skipped: "דילוג" } as const;
    const rows = ["תאריך,משימה,סטטוס,הערה"];
    weekDays(weekDate, store.household).forEach((day) => {
      choresForDate(store.chores, day.date).forEach((chore) => {
        const status = completionFor(store.completions, chore.id, day.date)?.status;
        rows.push(
          [day.date, chore.title, status ? statusLabel[status] : "פתוח", chore.description]
            .map((value) => `"${value.replaceAll('"', '""')}"`)
            .join(","),
        );
      });
    });
    downloadFile("nakili-week.csv", `\uFEFF${rows.join("\n")}`, "text/csv;charset=utf-8");
  };

  const signOut = async () => {
    const message = isDemo
      ? null
      : supabase
        ? "לצאת מהבית במכשיר הזה? כדי לחזור תצטרכו את קוד הבית."
        : "לצאת? המשימות במצב המקומי יימחקו מהמכשיר הזה.";
    if (message && !window.confirm(message)) return;
    if (remote && store) {
      forgetCode(store.household.id);
      await remote.auth.signOut();
    }
    commit(null, !supabaseConfigured && !isDemo);
    setIsDemo(false);
    setScreen("week");
    setAccessMode("landing");
    setError("");
  };

  const shift = (amount: number) => {
    if (amount === 0) {
      setWeekDate(new Date());
      setSelectedDate(localDate());
      return;
    }
    const nextWeek = shiftWeek(weekDate, amount);
    setWeekDate(nextWeek);
    setSelectedDate(localDate(shiftWeek(parseLocalDate(selectedDate), amount)));
  };

  if (!hydrated) {
    return (
      <div className="loading">
        <NakiliLogo size={56} title="" />
        <span>טוענים...</span>
      </div>
    );
  }

  if (!store) {
    if (accessMode === "landing") {
      return (
        <Landing
          notice={notice}
          showDevicePairing={Boolean(supabase)}
          onSelect={(mode) => {
            setError("");
            setNotice("");
            setAccessMode(mode);
          }}
          onDemo={() => {
            setIsDemo(true);
            setStore(clone(demoStore));
          }}
        />
      );
    }
    return (
      <AccessForm
        mode={accessMode}
        loading={loading}
        error={error}
        onBack={() => {
          setAccessMode("landing");
          setError("");
        }}
        onSubmit={(values) => void handleAccess(values)}
      />
    );
  }

  if (revealCode) {
    return <CodeReveal code={revealCode} householdName={store.household.name} onContinue={() => setRevealCode(null)} />;
  }

  return (
    <main className="shell app">
      <header className="topbar">
        <div className="brand">
          <NakiliLogo size={40} title="" />
          <span>
            <strong>נקי-לי</strong>
            <small>{isDemo ? "בית לדוגמה" : store.household.name}</small>
          </span>
        </div>
        {screen === "week" ? (
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setScreen("stats")} aria-label="סיכום">
              <BarChart3 size={20} />
            </button>
            <button className="icon-button" onClick={() => setScreen("settings")} aria-label="הגדרות">
              <Settings size={20} />
            </button>
          </div>
        ) : (
          <button className="secondary-button" onClick={() => setScreen("week")}>
            <ArrowRight size={17} /> לשבוע
          </button>
        )}
      </header>

      {isDemo && (
        <div className="notice demo-note">
          זה בית לדוגמה — שינויים לא נשמרים.
          <button
            className="text-button"
            onClick={() => {
              setIsDemo(false);
              setStore(null);
              setScreen("week");
              setAccessMode("create");
            }}
          >
            יצירת בית משלי
          </button>
        </div>
      )}

      {error && (
        <div className="notice error" role="alert">
          <span>{error}</span>
          <button className="icon-button ghost small" onClick={() => setError("")} aria-label="סגירת ההודעה">
            <X size={16} />
          </button>
        </div>
      )}

      {screen === "week" ? (
        <WeekView
          store={store}
          weekDate={weekDate}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onShift={shift}
          onAdd={(date) => setSheet({ chore: null, date })}
          onEdit={(chore) => setSheet({ chore, date: selectedDate })}
          onDelete={(chore) => void deleteChore(chore)}
          onToggle={toggleDone}
          onSkip={toggleSkip}
        />
      ) : screen === "stats" ? (
        <StatsView store={store} />
      ) : (
        <SettingsView
          store={store}
          isDemo={isDemo}
          remote={Boolean(remote)}
          devicePairingCode={devicePairingCode}
          onCreateInvite={() => void createInvite()}
          onCreateDevicePairing={() => void createDevicePairing()}
          onRenameHousehold={(name) => void renameHousehold(name)}
          onRenameMe={(nickname) => void rename(nickname)}
          onAddMember={(nickname) => void addMember(nickname)}
          onRemoveMember={(member) => void removeMember(member)}
          onSetManager={(member, manager) => void setManager(member, manager)}
          onWeekStart={(value) => void changeWeekStart(value)}
          onExport={exportStore}
          onSignOut={() => void signOut()}
        />
      )}

      {sheet && (
        <ChoreSheet
          key={sheet.chore?.id ?? `new-${sheet.date}`}
          chore={sheet.chore}
          date={sheet.date}
          members={store.members}
          saving={loading}
          onClose={() => setSheet(null)}
          onSave={(draft) => void saveChore(draft)}
          onDelete={sheet.chore ? () => void deleteChore(sheet.chore as Chore) : undefined}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
