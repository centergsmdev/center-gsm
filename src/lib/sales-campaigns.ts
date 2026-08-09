import type { CatalogProduct } from "@/types/product";
import type { SalesCampaign } from "@/types/sales-campaign";

export function isCampaignCurrent(campaign: SalesCampaign, now = Date.now()) {
  return (
    campaign.is_active &&
    new Date(campaign.starts_at).getTime() <= now &&
    new Date(campaign.ends_at).getTime() > now
  );
}

export function campaignMatchesProduct(
  campaign: SalesCampaign,
  product: CatalogProduct,
) {
  if (!isCampaignCurrent(campaign)) return false;
  if (campaign.scope_type === "all") return true;
  if (campaign.scope_type === "products")
    return campaign.product_ids.includes(product.id);
  if (campaign.scope_type === "brands") {
    return campaign.brand_names.some(
      (name) =>
        name.toLocaleLowerCase("tr-TR") ===
        product.brand.toLocaleLowerCase("tr-TR"),
    );
  }
  return campaign.category_names.some(
    (name) =>
      name.toLocaleLowerCase("tr-TR") ===
      product.category.toLocaleLowerCase("tr-TR"),
  );
}

export function formatCountdown(milliseconds: number) {
  const total = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${days ? `${days}g ` : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
