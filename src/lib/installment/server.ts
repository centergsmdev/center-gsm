import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { safeTokenMatch } from "@/lib/installment/access-token";
import type { InstallmentProductSummary } from "@/lib/installment/types";
import { validateProductVariantSelection } from "@/lib/installment/validation";
import { clientIpHash } from "@/lib/installment/server-security";
import { authApi, type AuthUser } from "@/lib/supabase/auth-api";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";
import type { Database, InstallmentApplicationRow } from "@/types/database";

export const INSTALLMENT_STORAGE_BUCKET = "installment-private";

export type InstallmentServiceClient = SupabaseClient<Database>;

export function getInstallmentServiceClient() {
  return createServiceClient();
}

export function getInstallmentHashSecret() {
  return (
    process.env.INSTALLMENT_SECURITY_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    ""
  ).trim();
}

export async function getOptionalSessionUser() {
  const client = await createSessionClient();
  if (!client) return null;
  const result = await authApi(client).getUser();
  return result.error ? null : result.data.user;
}

export async function getAdminContext(): Promise<{
  session: NonNullable<Awaited<ReturnType<typeof createSessionClient>>>;
  service: InstallmentServiceClient;
  user: AuthUser;
} | null> {
  const [session, service] = await Promise.all([
    createSessionClient(),
    Promise.resolve(getInstallmentServiceClient()),
  ]);
  if (!session || !service) return null;
  const result = await authApi(session).getUser();
  const user = result.data.user;
  if (result.error || !user || user.app_metadata.role !== "admin") return null;
  return { session, service, user };
}

export async function resolveInstallmentProduct(
  service: InstallmentServiceClient,
  productId: string,
  variantId: string | null,
): Promise<
  | { data: InstallmentProductSummary; error: null }
  | { data: null; error: string }
> {
  const [productResult, variantsResult, imagesResult] = await Promise.all([
    service.from("products").select("*").eq("id", productId).maybeSingle(),
    service.from("product_variants").select("*").eq("product_id", productId),
    service
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("is_primary", { ascending: false })
      .order("sort_order"),
  ]);
  const product = productResult.data;
  if (
    productResult.error ||
    variantsResult.error ||
    imagesResult.error ||
    !product
  )
    return { data: null, error: "Ürün bulunamadı." };
  const selectionError = validateProductVariantSelection(
    product,
    variantsResult.data,
    variantId,
  );
  if (selectionError === "inactive_product")
    return { data: null, error: "Bu ürün başvuruya açık değil." };
  if (selectionError === "variant_required")
    return { data: null, error: "Lütfen ürün varyantını yeniden seçin." };
  if (selectionError)
    return { data: null, error: "Seçilen varyant ürünle eşleşmiyor." };

  const variant = variantId
    ? (variantsResult.data.find((item) => item.id === variantId) ?? null)
    : null;
  const colorResult = variant?.color_id
    ? await service
        .from("product_colors")
        .select("*")
        .eq("id", variant.color_id)
        .eq("product_id", product.id)
        .eq("is_active", true)
        .maybeSingle()
    : null;
  if (colorResult?.error)
    return { data: null, error: "Varyant rengi doğrulanamadı." };
  const color = colorResult?.data ?? null;
  const attributes =
    variant?.attributes &&
    typeof variant.attributes === "object" &&
    !Array.isArray(variant.attributes)
      ? variant.attributes
      : {};
  const customTitle =
    typeof attributes.variantTitle === "string"
      ? attributes.variantTitle.trim()
      : "";
  const colorImage = variant?.color_id
    ? imagesResult.data.find((image) => image.color_id === variant.color_id)
    : null;
  const image = colorImage ?? imagesResult.data[0] ?? null;

  return {
    data: {
      productId: product.id,
      variantId: variant?.id ?? null,
      productName: product.name,
      variantTitle: variant ? customTitle || variant.name : null,
      sku: variant?.sku ?? product.sku,
      price: Number(variant?.price ?? product.price),
      imageUrl: image?.url ?? null,
      color: color?.display_name ?? color?.name ?? null,
      storageValue: variant?.storage_value ?? null,
      storageUnit: variant?.storage_unit ?? null,
    },
    error: null,
  };
}

export async function consumeInstallmentRateLimit(
  service: InstallmentServiceClient,
  request: Request,
  action: "draft" | "upload" | "submit",
  limit: number,
  windowSeconds: number,
) {
  const secret = getInstallmentHashSecret();
  if (!secret) return false;
  const result = await service.rpc("consume_installment_rate_limit", {
    p_key_hash: clientIpHash(request, secret),
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  return !result.error && result.data === true;
}

export async function getDraftWithAccess(
  service: InstallmentServiceClient,
  applicationId: string,
  token: string | null,
) {
  const result = await service
    .from("installment_applications")
    .select("*")
    .eq("id", applicationId)
    .maybeSingle();
  if (
    result.error ||
    !result.data ||
    !safeTokenMatch(result.data.draft_token_hash, token)
  )
    return null;
  return result.data;
}

export function mapAdminApplication(row: InstallmentApplicationRow) {
  return {
    id: row.id,
    applicationNumber: row.application_number,
    applicantName: row.applicant_name,
    phone: row.phone_e164,
    email: row.email,
    productId: row.product_id,
    variantId: row.variant_id,
    productName: row.product_name_snapshot,
    variantTitle: row.variant_title_snapshot,
    sku: row.sku_snapshot,
    price: Number(row.price_snapshot),
    imageUrl: row.image_url_snapshot,
    color: row.color_snapshot,
    storageValue: row.storage_value_snapshot,
    storageUnit: row.storage_unit_snapshot,
    status: row.status,
    revision: row.revision,
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
  };
}
