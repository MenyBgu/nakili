import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAccessCode,
  errorResponse,
  getUserOrCreateAnonymousSession,
  hashAccessCode,
} from "@/app/api/access/_helpers";

const bodySchema = z.object({
  householdId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const { admin, user, error } = await getUserOrCreateAnonymousSession();

    if (error || !user) {
      return NextResponse.json({ error: "לא ניתן להתחבר כרגע. נסו שוב בעוד רגע." }, { status: 503 });
    }

    const membership = await admin
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .eq("household_id", body.householdId)
      .eq("role", "owner")
      .maybeSingle();

    if (membership.error || !membership.data) {
      return NextResponse.json({ error: "רק מי שיצר את הבית יכול להחליף את הקוד" }, { status: 403 });
    }

    await admin
      .from("household_access_codes")
      .update({ revoked_at: new Date().toISOString() })
      .eq("household_id", body.householdId)
      .is("revoked_at", null);

    const code = createAccessCode();
    const created = await admin.from("household_access_codes").insert({
      household_id: body.householdId,
      code_hash: hashAccessCode(code),
    });

    if (created.error) {
      return NextResponse.json({ error: "החלפת הקוד נכשלה" }, { status: 500 });
    }

    return NextResponse.json({ code });
  } catch (caught) {
    return errorResponse(caught);
  }
}
