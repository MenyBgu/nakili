import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccessCode, errorResponse, findMemberForUser, hashAccessCode } from "@/app/api/access/_helpers";
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

    const membership = await findMemberForUser(admin, data.user.id, body.householdId);
    if (membership.error || !membership.member) {
      return NextResponse.json({ error: "אין הרשאה לבית הזה" }, { status: 403 });
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
      return NextResponse.json({ error: "יצירת הקוד נכשלה" }, { status: 500 });
    }

    return NextResponse.json({ code });
  } catch (caught) {
    return errorResponse(caught);
  }
}
