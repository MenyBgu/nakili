import { NextResponse } from "next/server";
import {
  createAccessCode,
  getUserOrCreateAnonymousSession,
  hashAccessCode,
} from "@/app/api/access/_helpers";

export async function POST() {
  const { admin, user, error } = await getUserOrCreateAnonymousSession();

  if (error || !user) {
    return NextResponse.json({ error: error?.message ?? "לא ניתן להתחבר כרגע" }, { status: 503 });
  }

  const membership = await admin
    .from("household_members")
    .select("household_id,role")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  if (membership.error || !membership.data) {
    return NextResponse.json({ error: "רק בעל הבית יכול להחליף את הקוד" }, { status: 403 });
  }

  await admin
    .from("household_access_codes")
    .update({ revoked_at: new Date().toISOString() })
    .eq("household_id", membership.data.household_id)
    .is("revoked_at", null);

  const code = createAccessCode();
  const created = await admin.from("household_access_codes").insert({
    household_id: membership.data.household_id,
    code_hash: hashAccessCode(code),
  });

  if (created.error) {
    return NextResponse.json({ error: "החלפת הקוד נכשלה" }, { status: 500 });
  }

  return NextResponse.json({ code });
}
