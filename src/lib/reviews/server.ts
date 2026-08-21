import "server-only";

import { randomUUID } from "node:crypto";

import { processReviewImage } from "@/lib/reviews/image-pipeline";
import {
  MAX_REVIEW_IMAGES,
  MAX_REVIEW_IMAGE_SIZE,
  REVIEW_IMAGE_BUCKET,
  REVIEW_IMAGE_TYPES,
} from "@/lib/reviews/images";
import { createServiceClient } from "@/lib/supabase/admin";

const allowedTypes = new Set<string>(REVIEW_IMAGE_TYPES);

export function getReviewFiles(formData: FormData) {
  return formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
}

export function validateReviewFiles(files: File[]) {
  if (files.length > MAX_REVIEW_IMAGES)
    return `En fazla ${MAX_REVIEW_IMAGES} görsel yükleyebilirsiniz.`;
  for (const file of files) {
    if (!allowedTypes.has(file.type))
      return `${file.name}: Yalnızca JPEG, PNG veya WebP yükleyebilirsiniz.`;
    if (file.size > MAX_REVIEW_IMAGE_SIZE)
      return `${file.name}: Görsel en fazla 5 MB olabilir.`;
  }
  return null;
}

export async function uploadReviewImages(files: File[], ownerPath: string) {
  const service = createServiceClient();
  if (!service) throw new Error("storage_unavailable");
  const paths: string[] = [];
  try {
    for (const file of files) {
      const processed = await processReviewImage(
        Buffer.from(await file.arrayBuffer()),
      );
      const path = `${ownerPath}/${randomUUID()}.webp`;
      const uploaded = await service.storage
        .from(REVIEW_IMAGE_BUCKET)
        .upload(path, processed, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: false,
        });
      if (uploaded.error) throw uploaded.error;
      paths.push(path);
    }
    return paths;
  } catch (error) {
    await removeReviewImages(paths);
    throw error;
  }
}

export async function removeReviewImages(paths: string[]) {
  if (!paths.length) return;
  const service = createServiceClient();
  if (!service) return;
  await service.storage.from(REVIEW_IMAGE_BUCKET).remove(paths);
}
