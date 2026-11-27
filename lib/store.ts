import type { SupabaseClient } from "@supabase/supabase-js";
import { demoStore } from "@/lib/demo-data";
import { localDate } from "@/lib/date";
import type { Chore, ChoreCategory, ChoreFrequency, NakiliStore } from "@/lib/types";

export const STORAGE_KEY = "nakili:store:v1";

export type ChoreDraft = {
  title: string;
  description: string;
  category: ChoreCategory;
  icon: string;
  color: string;
  frequency: ChoreFrequency;
  weekdays: number[];
  oneOffDate: string;
  startDate: string;
  endDate: string;
  assignedMemberId: string;
};

export const categoryOptions: Array<{ value: ChoreCategory; label: string; icon: string; color: string }> = [
  { value: "cleaning", label: "ניקיון", icon: "🧽", color: "#dcefe1" },
  { value: "shopping", label: "קניות", icon: "🛒", color: "#fde6d3" },
  { value: "errand", label: "סידורים", icon: "📮", color: "#eee2f8" },
  { value: "organization", label: "סדר וארגון", icon: "📦", color: "#dff1f3" },
  { value: "maintenance", label: "תחזוקה", icon: "🔧", color: "#fff0cf" },
  { value: "other", label: "אחר", icon: "✨", color: "#f6e4e1" },
];

export const iconOptions = ["🧽", "🧺", "🧹", "🧼", "🪟", "🗑️", "🍽️", "🛒", "📦", "👕", "🌿", "🔧", "🐾", "✨"];

export function categoryMeta(category: ChoreCategory) {
  return categoryOptions.find((option) => option.value === category) ?? categoryOptions[categoryOptions.length - 1];
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createLocalAccessCode() {
  const value = Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, "0");
  return `NKI-${value.slice(0, 4)}-${value.slice(4, 8)}`;
}

const categoryKeywords: Array<[ChoreCategory, string[]]> = [
  ["maintenance", ["תיקון", "לתקן", "נורה", "נורות", "מזגן", "פילטר", "סוללה", "ברז", "צביעה", "לצבוע"]],
  ["shopping", ["קניות", "לקנות", "קניה", "סופר", "מכולת"]],
  ["errand", ["דואר", "בנק", "תרופות", "לאסוף", "איסוף", "להחזיר"]],
  ["organization", ["סידור", "לסדר", "ארגון", "לארגן", "ארון", "מזווה", "מקרר", "מגירה", "מיון", "למיין", "קיפול", "לקפל"]],
  ["cleaning", ["ניקוי", "ניקיון", "לנקות", "שטיפה", "שטיפת", "לשטוף", "אבק", "כביסה", "כלים", "כיור", "אמבטיה", "שירותים", "רצפה", "חלונות", "מטבח", "פח", "פחים", "לטאטא", "שואב"]],
];

const iconKeywords: Array<[string, string[]]> = [
  ["🧺", ["כביסה", "כביסות", "לקפל"]],
  ["🍽️", ["כלים", "מדיח"]],
  ["🗑️", ["פח", "פחים", "זבל"]],
  ["🪟", ["חלון", "חלונות"]],
  ["🧹", ["לטאטא", "טאטוא", "רצפה", "שואב", "אבק"]],
  ["🌿", ["עציץ", "עציצים", "צמחים", "להשקות", "השקיית", "גינה"]],
  ["🐾", ["כלב", "חתול", "חיות"]],
  ["👕", ["בגדים", "ארון"]],
  ["🛒", ["קניות", "לקנות", "סופר", "מכולת"]],
];

export function guessFromTitle(title: string) {
  const words = title.trim().split(/\s+/);
  const matches = (word: string, keywords: string[]) =>
    keywords.some((keyword) => word.replace(/^[והבלמש]/, "") === keyword || word === keyword || word.startsWith(keyword));
  const firstMatch = <T,>(table: Array<[T, string[]]>) => {
    for (const word of words) {
      const hit = table.find(([, keywords]) => matches(word, keywords));
      if (hit) return hit[0];
    }
  };
  const meta = categoryMeta(firstMatch(categoryKeywords) ?? "other");
  const icon = firstMatch(iconKeywords) ?? meta.icon;
  return { category: meta.value, icon, color: meta.color };
}

export function blankDraft(date = localDate()): ChoreDraft {
  const category = categoryMeta("other");
  return {
    title: "",
    description: "",
    category: category.value,
    icon: category.icon,
    color: category.color,
    frequency: "one_off",
    weekdays: [new Date(`${date}T12:00:00`).getDay()],
    oneOffDate: date,
    startDate: date,
    endDate: "",
    assignedMemberId: "",
  };
}

export function choreToDraft(chore: Chore): ChoreDraft {
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

export function normalizeStore(value: NakiliStore): NakiliStore {
  return {
    ...value,
    currentMemberId: value.currentMemberId ?? value.members[0]?.id,
    chores: value.chores.map((chore) => ({
      ...chore,
      category: chore.category ?? "cleaning",
    })),
  };
}

export function createLocalStore(name: string, nickname: string, includeExamples: boolean): NakiliStore {
  const householdId = newId();
  const memberId = newId();
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
      accessCode: createLocalAccessCode(),
    },
    members: [{ id: memberId, userId: memberId, householdId, nickname, role: "owner" }],
    chores: examples,
    completions: [],
    currentMemberId: memberId,
  };
}

type ChoreRow = {
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
  chore_schedules?:
    | {
        frequency: ChoreFrequency;
        weekdays: number[];
        one_off_date: string | null;
        start_date: string | null;
        end_date: string | null;
      }
    | Array<{
        frequency: ChoreFrequency;
        weekdays: number[];
        one_off_date: string | null;
        start_date: string | null;
        end_date: string | null;
      }>
    | null;
};

function choreFromRow(chore: ChoreRow): Chore {
  const schedule = Array.isArray(chore.chore_schedules) ? chore.chore_schedules[0] : chore.chore_schedules;
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
}

export async function fetchRemoteStore(client: SupabaseClient): Promise<NakiliStore | null> {
  const userResult = await client.auth.getUser();
  const user = userResult.data.user;
  if (!user) return null;

  const [directMembership, deviceLink] = await Promise.all([
    client
      .from("household_members")
      .select("id,household_id")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    client.from("household_member_devices").select("member_id").eq("user_id", user.id).maybeSingle(),
  ]);
  const deviceTableMissing = deviceLink.error && ["42P01", "PGRST205"].includes(deviceLink.error.code);
  if (directMembership.error || (deviceLink.error && !deviceTableMissing)) throw new Error("טעינת הבית נכשלה");

  let membership: { id: string; household_id: string } | null = directMembership.data;
  if (!membership && !deviceTableMissing && deviceLink.data) {
    const paired = await client
      .from("household_members")
      .select("id,household_id")
      .eq("id", deviceLink.data.member_id)
      .single();
    if (paired.error) throw new Error("טעינת הבית נכשלה");
    membership = paired.data;
  }
  if (!membership) return null;

  const householdId = membership.household_id;
  const [household, members, chores, completions] = await Promise.all([
    client.from("households").select("id,name,timezone,week_start,owner_id").eq("id", householdId).single(),
    client
      .from("household_members")
      .select("id,user_id,household_id,nickname,role")
      .eq("household_id", householdId)
      .order("joined_at"),
    client
      .from("chores")
      .select("id,household_id,title,description,category,icon,color,assigned_member_id,active,sort_order,chore_schedules(frequency,weekdays,one_off_date,start_date,end_date)")
      .eq("household_id", householdId)
      .eq("active", true)
      .order("sort_order"),
    client
      .from("chore_completions")
      .select("id,chore_id,occurrence_date,status,completed_by,completed_at")
      .eq("household_id", householdId),
  ]);

  if (household.error || members.error || chores.error || completions.error || !household.data) {
    throw new Error("טעינת נתוני הבית נכשלה");
  }

  return {
    household: {
      id: household.data.id,
      name: household.data.name,
      timezone: household.data.timezone,
      weekStart: household.data.week_start === 1 ? 1 : 0,
      ownerId: household.data.owner_id,
    },
    members: (members.data ?? []).map((member) => ({
      id: member.id,
      userId: member.user_id,
      householdId: member.household_id,
      nickname: member.nickname,
      role: member.role,
    })),
    chores: ((chores.data ?? []) as ChoreRow[]).map(choreFromRow),
    completions: (completions.data ?? []).map((completion) => ({
      id: completion.id,
      choreId: completion.chore_id,
      occurrenceDate: completion.occurrence_date,
      status: completion.status,
      completedBy: completion.completed_by,
      completedAt: completion.completed_at,
    })),
    currentMemberId: membership.id,
  };
}

const codeKey = (householdId: string) => `nakili:code:${householdId}`;

export function rememberCode(householdId: string, code: string) {
  localStorage.setItem(codeKey(householdId), code);
}

export function recallCode(householdId: string) {
  return localStorage.getItem(codeKey(householdId)) ?? undefined;
}

export function forgetCode(householdId: string) {
  localStorage.removeItem(codeKey(householdId));
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
