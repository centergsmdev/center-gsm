import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

export const PAYMENT_RECEIPTS_BUCKET = "payment-receipts";
export const PAYMENT_RECEIPT_MAX_SIZE = 10 * 1024 * 1024;
export const PAYMENT_RECEIPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

const asRecord = (value: Json): Record<string, Json | undefined> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value : null;

export async function uploadPaymentReceipt(
  orderNumber: string,
  contact: string,
  file: File,
): Promise<{ error: string | null }> {
  const client = createClient();
  if (!client) return { error: "Dekont yükleme servisine ulaşılamadı." };

  const prepared = await client.rpc("prepare_payment_receipt_upload", {
    p_order_number: orderNumber,
    p_contact: contact,
    p_original_name: file.name,
    p_mime_type: file.type,
    p_size_bytes: file.size,
  });
  const data = prepared.data ? asRecord(prepared.data) : null;
  if (
    prepared.error ||
    !data ||
    typeof data.upload_token !== "string" ||
    typeof data.storage_path !== "string"
  )
    return { error: "Dekont yükleme izni oluşturulamadı." };

  const upload = await client.storage
    .from(PAYMENT_RECEIPTS_BUCKET)
    .upload(data.storage_path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (upload.error) return { error: "Dekont dosyası yüklenemedi." };

  const finalized = await client.rpc("finalize_payment_receipt_upload", {
    p_order_number: orderNumber,
    p_contact: contact,
    p_upload_token: data.upload_token,
  });
  if (finalized.error || !finalized.data)
    return { error: "Dekont siparişle ilişkilendirilemedi." };
  return { error: null };
}
