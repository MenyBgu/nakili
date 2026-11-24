import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAccessCode,
  getUserOrCreateAnonymousSession,
  hashAccessCode,
} from "@/app/api/access/_helpers";

const bodySchema = z.object({
  householdName: z.string().trim().min(1).max(80),
  nickname: z.string().trim().min(1).max(40),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const { admin, user, session, error } = await getUserOrCreateAnonymousSession();

    if (error || !user) {
      return NextResponse.json({ error: error?.message ?? "לא ניתן להתחבר כרגע" }, { status: 503 });
    }

    const code = createAccessCode();
    const householdResult = await admin
      .from("households")
      .insert({
        name: body.householdName,
        owner_id: user.id,
        timezone: "Asia/Jerusalem",
        week_start: 0,
      })
      .select("id,name,timezone,week_start,owner_id")
      .single();

    if (householdResult.error || !householdResult.data) {
      return NextResponse.json({ error: householdResult.error?.message ?? "יצירת הבית נכשלה" }, { status: 500 });
    }

    const household = householdResult.data;
    const memberResult = await admin
      .from("household_members")
      .insert({
        household_id: household.id,
        user_id: user.id,
        nickname: body.nickname,
        role: "owner",
      })
      .select("id,user_id,household_id,nickname,role")
      .single();

    const codeResult = await admin.from("household_access_codes").insert({
      household_id: household.id,
      code_hash: hashAccessCode(code),
    });

    if (memberResult.error || codeResult.error) {
      await admin.from("households").delete().eq("id", household.id);
      return NextResponse.json({ error: "שמירת פרטי הבית נכשלה" }, { status: 500 });
    }

    return NextResponse.json({
      household,
      member: memberResult.data,
      code,
      session,
    });
  } catch (caught) {
    return NextResponse.json(
      { error: caught instanceof Error ? caught.message : "בקשה לא תקינה" },
      { status: 400 },
    );
  }
}
