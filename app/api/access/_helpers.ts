import { createHash, randomBytes } from "node:crypto";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

export function hashAccessCode(code: string) {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

export function createAccessCode() {
  const value = randomBytes(8).toString("hex").toUpperCase();
  return `NKI-${value.slice(0, 8)}-${value.slice(8, 16)}`;
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
