import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createDevicePairingCode,
  errorResponse,
  findMemberForUser,
  hashAccessCode,
} from "@/app/api/access/_helpers";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  householdId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return NextResponse.json({ error: "צריך להיות מחוברים לבית" }, { status: 401 });
    }

    const { member, error } = await findMemberForUser(admin, data.user.id, body.householdId);
    if (error || !member) {
      return NextResponse.json({ error: "אין הרשאה לבית הזה" }, { status: 403 });
    }

    await admin
      .from("household_device_pairing_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("member_id", member.id)
      .is("used_at", null);

    const code = createDevicePairingCode();
    const created = await admin.from("household_device_pairing_tokens").insert({
      member_id: member.id,
      token_hash: hashAccessCode(code),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
    if (created.error) {
      return NextResponse.json({ error: "יצירת קוד החיבור נכשלה" }, { status: 500 });
    }

    return NextResponse.json({ code, expiresInSeconds: 600 });
  } catch (caught) {
    return errorResponse(caught);
  }
}
