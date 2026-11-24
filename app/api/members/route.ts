import { NextResponse } from "next/server";
import { z } from "zod";
import { errorResponse } from "@/app/api/access/_helpers";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

const addSchema = z.object({
  householdId: z.string().uuid(),
  nickname: z.string().trim().min(1).max(40),
});

const removeSchema = z.object({
  householdId: z.string().uuid(),
  memberId: z.string().uuid(),
});

async function callerMembership(householdId: string) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { admin, membership: null };
  const membership = await admin
    .from("household_members")
    .select("id,role")
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .maybeSingle();
  return { admin, membership: membership.data };
}

export async function POST(request: Request) {
  try {
    const body = addSchema.parse(await request.json());
    const { admin, membership } = await callerMembership(body.householdId);
    if (!membership) return NextResponse.json({ error: "אין הרשאה לבית הזה" }, { status: 403 });

    const created = await admin
      .from("household_members")
      .insert({ household_id: body.householdId, user_id: null, nickname: body.nickname, role: "member" })
      .select("id,user_id,household_id,nickname,role")
      .single();
    if (created.error || !created.data) {
      return NextResponse.json({ error: "ההוספה נכשלה. נסו שוב." }, { status: 500 });
    }
    return NextResponse.json({ member: created.data });
  } catch (caught) {
    return errorResponse(caught);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = removeSchema.parse(await request.json());
    const { admin, membership } = await callerMembership(body.householdId);
    if (membership?.role !== "owner") {
      return NextResponse.json({ error: "רק מי שיצר את הבית יכול להסיר בני בית" }, { status: 403 });
    }
    if (membership.id === body.memberId) {
      return NextResponse.json({ error: "אי אפשר להסיר את עצמך" }, { status: 400 });
    }
    const removed = await admin
      .from("household_members")
      .delete()
      .eq("id", body.memberId)
      .eq("household_id", body.householdId)
      .neq("role", "owner")
      .select("id");
    if (removed.error || !removed.data?.length) {
      return NextResponse.json({ error: "ההסרה נכשלה" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (caught) {
    return errorResponse(caught);
  }
}
