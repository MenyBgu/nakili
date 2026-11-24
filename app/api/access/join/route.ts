import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse, getUserOrCreateAnonymousSession, hashAccessCode } from "@/app/api/access/_helpers";

const bodySchema = z.object({
  code: z.string().trim().min(8).max(32),
  nickname: z.string().trim().min(1).max(40),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const { admin, user, session, error } = await getUserOrCreateAnonymousSession();

    if (error || !user) {
      return NextResponse.json({ error: "לא ניתן להתחבר כרגע. נסו שוב בעוד רגע." }, { status: 503 });
    }

    const inviteResult = await admin
      .from("household_access_codes")
      .select("household_id")
      .eq("code_hash", hashAccessCode(body.code))
      .is("revoked_at", null)
      .maybeSingle();

    if (inviteResult.error || !inviteResult.data) {
      return NextResponse.json({ error: "הקוד לא נמצא או שכבר בוטל" }, { status: 404 });
    }

    const householdResult = await admin
      .from("households")
      .select("id,name,timezone,week_start,owner_id")
      .eq("id", inviteResult.data.household_id)
      .single();

    if (householdResult.error || !householdResult.data) {
      return NextResponse.json({ error: "הבית לא נמצא" }, { status: 404 });
    }

    const memberResult = await admin
      .from("household_members")
      .upsert(
        {
          household_id: householdResult.data.id,
          user_id: user.id,
          nickname: body.nickname,
          role: user.id === householdResult.data.owner_id ? "owner" : "member",
        },
        { onConflict: "household_id,user_id" },
      )
      .select("id,user_id,household_id,nickname,role")
      .single();

    if (memberResult.error || !memberResult.data) {
      return NextResponse.json({ error: "ההצטרפות לבית נכשלה" }, { status: 500 });
    }

    return NextResponse.json({
      household: householdResult.data,
      member: memberResult.data,
      session,
    });
  } catch (caught) {
    return errorResponse(caught);
  }
}
