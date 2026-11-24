export type ChoreFrequency = "weekly" | "one_off";
export type ChoreCategory = "cleaning" | "errand" | "organization" | "maintenance" | "other";
export type CompletionStatus = "completed" | "skipped";
export type MemberRole = "owner" | "member";

export type Household = {
  id: string;
  name: string;
  timezone: string;
  weekStart: 0 | 1;
  ownerId: string;
  accessCode?: string;
};

export type HouseholdMember = {
  id: string;
  userId: string;
  householdId: string;
  nickname: string;
  role: MemberRole;
};

export type Chore = {
  id: string;
  householdId: string;
  title: string;
  description: string;
  category: ChoreCategory;
  icon: string;
  color: string;
  assignedMemberId: string | null;
  active: boolean;
  sortOrder: number;
  frequency: ChoreFrequency;
  weekdays: number[];
  oneOffDate: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type Completion = {
  id: string;
  choreId: string;
  occurrenceDate: string;
  status: CompletionStatus;
  completedBy: string | null;
  completedAt: string;
};

export type NakiliStore = {
  household: Household;
  members: HouseholdMember[];
  chores: Chore[];
  completions: Completion[];
};

export type WeekDay = {
  date: string;
  label: string;
  shortLabel: string;
  dayNumber: string;
  isToday: boolean;
};
