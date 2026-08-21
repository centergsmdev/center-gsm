import { getSupabasePublicConfig } from "@/lib/supabase/config";

export const REVIEW_IMAGE_BUCKET = "review-images";
export const MAX_REVIEW_IMAGES = 3;
export const MAX_REVIEW_IMAGE_SIZE = 5 * 1024 * 1024;
export const REVIEW_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function getReviewImageUrl(path: string) {
  const config = getSupabasePublicConfig();
  if (!config || !path) return "";
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `${config.url}/storage/v1/object/public/${REVIEW_IMAGE_BUCKET}/${encodedPath}`;
}
