import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { CACHE_TAGS } from "@/lib/performance/constants";
import { authApi } from "@/lib/supabase/auth-api";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
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

  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "Missing productId" }, { status: 400 });
  }

  const { data: product } = await client
    .from("products")
    .select("slug")
    .eq("id", productId)
    .maybeSingle();

  revalidateTag(CACHE_TAGS.products);
  revalidateTag(CACHE_TAGS.homepage);
  revalidatePath("/");
  revalidatePath("/urunler");
  revalidatePath("/musteri-memnuniyeti");
  if (product?.slug) revalidatePath(`/urun/${product.slug}`);

  return NextResponse.json({ revalidated: true });
}
