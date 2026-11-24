import { createHash, randomBytes } from "node:crypto";
import { addDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { demoStore } from "@/lib/demo-data";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export function hashAccessCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function createAccessCode() {
  const value = randomBytes(8).toString("hex").toUpperCase();
  return `NKI-${value.slice(0, 8)}-${value.slice(8, 16)}`;
}

export function errorResponse(caught: unknown) {
  const message = caught instanceof z.ZodError
    ? "נא למלא את כל השדות כראוי"
    : caught instanceof Error ? caught.message : "בקשה לא תקינה";
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function seedExampleChores(admin: SupabaseClient, householdId: string) {
  const examples = demoStore.chores;
  const inserted = await admin
    .from("chores")
    .insert(examples.map((chore, index) => ({
      household_id: householdId,
      title: chore.title,
      description: chore.description,
      category: chore.category,
      icon: chore.icon,
      color: chore.color,
      sort_order: index + 1,
    })))
    .select("id,sort_order");
  if (inserted.error || !inserted.data) return false;

  const oneOffDate = format(addDays(new Date(), 3), "yyyy-MM-dd");
  const schedules = inserted.data.map((row) => {
    const chore = examples[row.sort_order - 1];
    return {
      chore_id: row.id,
      frequency: chore.frequency,
      weekdays: chore.frequency === "one_off" || chore.frequency === "monthly" ? [] : chore.weekdays,
      one_off_date: chore.frequency === "one_off" ? oneOffDate : null,
    };
  });
  const scheduled = await admin.from("chore_schedules").insert(schedules);
  return !scheduled.error;
}

export async function getUserOrCreateAnonymousSession() {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const current = await supabase.auth.getUser();

  if (current.data.user) {
    return { supabase, admin, user: current.data.user, session: null, error: null };
  }

  const anonymous = await supabase.auth.signInAnonymously();
  if (anonymous.error || !anonymous.data.user) {
    return {
      supabase,
      admin,
      user: null,
      session: null,
      error: anonymous.error ?? new Error("לא ניתן ליצור משתמש זמני"),
    };
  }

  return {
    supabase,
    admin,
    user: anonymous.data.user,
    session: anonymous.data.session,
    error: null,
  };
}
