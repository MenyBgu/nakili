import { NextResponse } from "next/server";
import { z } from "zod";
import {
  errorResponse,
  getUserOrCreateAnonymousSession,
  hashAccessCode,
} from "@/app/api/access/_helpers";

const bodySchema = z.object({
  code: z.string().trim().min(8).max(32),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const { admin, user, session, error } = await getUserOrCreateAnonymousSession();
    if (error || !user) {
      return NextResponse.json({ error: "לא ניתן להתחבר כרגע. נסו שוב בעוד רגע." }, { status: 503 });
    }

    const token = await admin
      .from("household_device_pairing_tokens")
      .select("id,member_id")
      .eq("token_hash", hashAccessCode(body.code))
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (token.error || !token.data) {
      return NextResponse.json({ error: "קוד החיבור לא נמצא או שפג תוקפו" }, { status: 404 });
    }

    const claimed = await admin
      .from("household_device_pairing_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", token.data.id)
      .is("used_at", null)
      .select("id")
      .maybeSingle();
    if (claimed.error || !claimed.data) {
      return NextResponse.json({ error: "קוד החיבור כבר נוצל. צרו קוד חדש." }, { status: 409 });
    }

    const device = await admin.from("household_member_devices").insert({
      member_id: token.data.member_id,
      user_id: user.id,
    });
    if (device.error) {
      return NextResponse.json({ error: "חיבור המכשיר נכשל. נסו ליצור קוד חדש." }, { status: 500 });
    }

    const member = await admin
      .from("household_members")
      .select("id,household_id")
      .eq("id", token.data.member_id)
      .single();
    if (member.error || !member.data) {
      return NextResponse.json({ error: "הבית לא נמצא" }, { status: 404 });
    }

    return NextResponse.json({
      household: { id: member.data.household_id },
      session,
    });
  } catch (caught) {
    return errorResponse(caught);
  }
}
