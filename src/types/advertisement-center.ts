export const AD_TYPES = [
  ["instagram_feed", "Instagram Feed"],
  ["instagram_story", "Instagram Story"],
  ["instagram_reels", "Instagram Reels"],
  ["facebook_feed", "Facebook Feed"],
  ["dynamic_catalog", "Dynamic Catalog"],
] as const;

export const AD_PRIORITIES = [
  ["very_high", "Çok Yüksek"],
  ["high", "Yüksek"],
  ["normal", "Normal"],
  ["low", "Düşük"],
] as const;

export type AdvertisementProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  price: number;
  oldPrice: number | null;
  stock: number;
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  variantCount: number;
  activeVariantCount: number;
  isIncluded: boolean;
  priority: "very_high" | "high" | "normal" | "low";
  adTypes: string[];
  score: number;
  issues: string[];
};
