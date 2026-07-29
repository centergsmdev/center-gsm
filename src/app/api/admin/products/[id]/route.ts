import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { PRODUCT_IMAGE_BUCKET } from "@/lib/admin/product-images";
import { CACHE_TAGS } from "@/lib/performance/constants";
import { authApi } from "@/lib/supabase/auth-api";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };
type ProductLocation = {
  slug: string;
  category_id: string;
  brand_id: string;
};

const ORDER_HISTORY_ERROR =
  "Bu ürün geçmiş siparişlerde yer aldığı için kalıcı olarak silinemez.\n\nİsterseniz Pasife Al seçeneğini kullanabilirsiniz.";

const responseError = (error: string, status: number) =>
  NextResponse.json({ data: null, error }, { status });

async function getAdminDatabase() {
  const db = await createClient();
  if (!db)
    return {
      db: null,
      error: responseError("Supabase bağlantısı yapılandırılmamış.", 503),
    };
  const {
    data: { user },
  } = await authApi(db).getUser();
  if (user?.app_metadata.role !== "admin")
    return { db: null, error: responseError("Yetkisiz erişim.", 403) };
  return { db, error: null };
}

async function revalidateProductSurfaces(
  db: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  product: ProductLocation,
) {
  const [category, brand] = await Promise.all([
    db
      .from("categories")
      .select("slug")
      .eq("id", product.category_id)
      .maybeSingle(),
    db.from("brands").select("slug").eq("id", product.brand_id).maybeSingle(),
  ]);

  Object.values(CACHE_TAGS).forEach((tag) => revalidateTag(tag));
  ["/", "/urunler", "/arama", "/admin/urunler"].forEach((path) =>
    revalidatePath(path),
  );
  revalidatePath(`/urun/${product.slug}`);
  if (category.data?.slug) revalidatePath(`/kategori/${category.data.slug}`);
  if (brand.data?.slug) revalidatePath(`/marka/${brand.data.slug}`);
}

export async function PATCH(request: Request, context: RouteContext) {
  const { db, error } = await getAdminDatabase();
  if (!db) return error;
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    isActive?: unknown;
  } | null;
  if (typeof body?.isActive !== "boolean")
    return responseError("Ürün durumu geçersiz.", 400);

  const current = await db
    .from("products")
    .select("slug,category_id,brand_id")
    .eq("id", id)
    .maybeSingle();
  if (current.error || !current.data)
    return responseError("Ürün bulunamadı.", 404);

  const updated = await db
    .from("products")
    .update({ is_active: body.isActive })
    .eq("id", id);
  if (updated.error) return responseError("Ürün durumu güncellenemedi.", 400);

  await revalidateProductSurfaces(db, current.data);
  return NextResponse.json({ data: true, error: null });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { db, error } = await getAdminDatabase();
  if (!db) return error;
  const { id } = await context.params;

  const [product, images] = await Promise.all([
    db
      .from("products")
      .select("slug,category_id,brand_id")
      .eq("id", id)
      .maybeSingle(),
    db.from("product_images").select("path,url").eq("product_id", id),
  ]);
  if (product.error || !product.data)
    return responseError("Ürün bulunamadı.", 404);
  if (images.error) return responseError("Ürün görselleri doğrulanamadı.", 400);

  const paths = [
    ...new Set(
      images.data.flatMap((image) => (image.path ? [image.path] : [])),
    ),
  ];
  const urls = [...new Set(images.data.map((image) => image.url))];
  const [sharedPaths, sharedUrls] = await Promise.all([
    paths.length
      ? db
          .from("product_images")
          .select("path")
          .neq("product_id", id)
          .in("path", paths)
      : Promise.resolve({ data: [], error: null }),
    urls.length
      ? db
          .from("product_images")
          .select("url")
          .neq("product_id", id)
          .in("url", urls)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (sharedPaths.error || sharedUrls.error)
    return responseError("Görsel kullanımları doğrulanamadı.", 400);

  const referencedPaths = new Set(sharedPaths.data.map((image) => image.path));
  const referencedUrls = new Set(sharedUrls.data.map((image) => image.url));
  const removablePaths = images.data.flatMap((image) =>
    image.path &&
    !referencedPaths.has(image.path) &&
    !referencedUrls.has(image.url)
      ? [image.path]
      : [],
  );

  const deleted = await db.rpc("admin_delete_product", { p_product_id: id });
  if (deleted.error)
    return responseError("Ürün kalıcı olarak silinemedi.", 400);
  const result = deleted.data as { deleted?: boolean; reason?: string } | null;
  if (!result?.deleted) {
    if (result?.reason === "order_history")
      return responseError(ORDER_HISTORY_ERROR, 409);
    return responseError("Ürün bulunamadı.", 404);
  }

  if (removablePaths.length) {
    const storage = await db.storage
      .from(PRODUCT_IMAGE_BUCKET)
      .remove(removablePaths);
    if (storage.error)
      console.error("Product image storage cleanup failed", {
        productId: id,
        paths: removablePaths,
        error: storage.error,
      });
  }

  await revalidateProductSurfaces(db, product.data);
  return NextResponse.json({ data: true, error: null });
}
