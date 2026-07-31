import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { authApi } from "@/lib/supabase/auth-api";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const client = await createClient();
  if (!client) {
    return NextResponse.json(
      { error: "Supabase unavailable" },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await authApi(client).getUser();
  if (user?.app_metadata.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  revalidatePath("/");
  return NextResponse.json({ revalidated: true });
}
