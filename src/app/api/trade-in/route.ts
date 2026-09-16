import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { normalizeWhatsAppPhone } from "@/lib/contact/whatsapp";
import {
  BODY_CONDITION_LABELS,
  REPAIR_STATUS_LABELS,
  SCREEN_CONDITION_LABELS,
  TRADE_IN_BUCKET,
  TRADE_IN_MAX_PHOTOS,
  TRADE_IN_MIN_PHOTOS,
} from "@/lib/trade-in/constants";
import {
  processTradeInImage,
  TradeInImageError,
} from "@/lib/trade-in/image-validation";
import {
  createTradeInApplicationNumber,
  isTradeInSameOrigin,
  safeTradeInUserAgent,
  tradeInHashSecret,
  tradeInIpHash,
} from "@/lib/trade-in/security";
import { createServiceClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const text = (form: FormData, key: string, max: number) =>
  String(form.get(key) ?? "")
    .normalize("NFKC")
    .trim()
    .slice(0, max);

function error(message: string, status = 400) {
  return NextResponse.json({ data: null, error: message }, { status });
}

export async function POST(request: Request) {
  if (!isTradeInSameOrigin(request))
    return error("Geçersiz istek kaynağı.", 403);
  const service = createServiceClient();
  const secret = tradeInHashSecret();
  if (!service || !secret)
    return error("Takas başvurusu şu anda kullanılamıyor.", 503);

  const limit = await service.rpc("consume_trade_in_rate_limit", {
    p_key_hash: tradeInIpHash(request, secret),
    p_limit: 4,
    p_window_seconds: 3600,
  });
  if (limit.error)
    return error("Başvuru güvenlik kontrolü tamamlanamadı.", 503);
  if (limit.data !== true)
    return error(
      "Çok fazla deneme yaptınız. Lütfen daha sonra tekrar deneyin.",
      429,
    );

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return error("Başvuru bilgileri okunamadı.");
  }

  if (text(form, "website", 200)) return error("Başvuru doğrulanamadı.");
  const customerName = text(form, "customerName", 120);
  const phone = normalizeWhatsAppPhone(text(form, "phone", 30));
  const deviceBrand = text(form, "deviceBrand", 60);
  const deviceModel = text(form, "deviceModel", 120);
  const storageCapacity = text(form, "storageCapacity", 40) || null;
  const screenCondition = text(form, "screenCondition", 20);
  const bodyCondition = text(form, "bodyCondition", 20);
  const repairStatus = text(form, "repairStatus", 20);
  const batteryRaw = text(form, "batteryHealth", 3);
  const batteryHealth = batteryRaw ? Number(batteryRaw) : null;
  const desiredProduct = text(form, "desiredProduct", 160) || null;
  const customerNote = text(form, "customerNote", 1000) || null;
  const powersOn = form.get("powersOn") === "true";
  const hasBox = form.get("hasBox") === "true";
  const consent = form.get("consent") === "true";
  const photos = form
    .getAll("photos")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (customerName.length < 2) return error("Ad soyad bilgisi eksik.");
  if (!phone || !/^\+905\d{9}$/.test(phone))
    return error("Geçerli bir Türkiye cep telefonu numarası girin.");
  if (!deviceBrand || !deviceModel)
    return error("Telefon marka ve modelini girin.");
  if (!(screenCondition in SCREEN_CONDITION_LABELS))
    return error("Ekran durumunu seçin.");
  if (!(bodyCondition in BODY_CONDITION_LABELS))
    return error("Kasa durumunu seçin.");
  if (!(repairStatus in REPAIR_STATUS_LABELS))
    return error("Onarım durumunu seçin.");
  if (
    batteryHealth !== null &&
    (!Number.isInteger(batteryHealth) ||
      batteryHealth < 1 ||
      batteryHealth > 100)
  )
    return error("Pil sağlığı 1–100 arasında olmalıdır.");
  if (!consent) return error("Bilgilendirme ve iletişim onayını işaretleyin.");
  if (
    photos.length < TRADE_IN_MIN_PHOTOS ||
    photos.length > TRADE_IN_MAX_PHOTOS
  )
    return error("Telefonunuza ait 2–4 fotoğraf yükleyin.");

  let processed: Awaited<ReturnType<typeof processTradeInImage>>[];
  try {
    processed = [];
    for (const photo of photos)
      processed.push(await processTradeInImage(photo));
  } catch (caught) {
    return error(
      caught instanceof TradeInImageError
        ? caught.message
        : "Fotoğraflar işlenemedi.",
      422,
    );
  }

  const applicationNumber = createTradeInApplicationNumber();
  const application = await service
    .from("trade_in_applications")
    .insert({
      application_number: applicationNumber,
      customer_name: customerName,
      phone_e164: phone,
      device_brand: deviceBrand,
      device_model: deviceModel,
      storage_capacity: storageCapacity,
      screen_condition: screenCondition as keyof typeof SCREEN_CONDITION_LABELS,
      body_condition: bodyCondition as keyof typeof BODY_CONDITION_LABELS,
      powers_on: powersOn,
      repair_status: repairStatus as keyof typeof REPAIR_STATUS_LABELS,
      battery_health: batteryHealth,
      has_box: hasBox,
      desired_product: desiredProduct,
      customer_note: customerNote,
      consented_at: new Date().toISOString(),
      request_ip_hash: tradeInIpHash(request, secret),
      user_agent_summary: safeTradeInUserAgent(request),
    })
    .select("id, application_number")
    .single();
  if (application.error || !application.data)
    return error("Başvuru kaydı oluşturulamadı. Lütfen tekrar deneyin.", 422);

  const uploadedPaths: string[] = [];
  try {
    const photoRows = [];
    for (let index = 0; index < processed.length; index += 1) {
      const photo = processed[index];
      const path = `${application.data.id}/${index}-${randomUUID()}.webp`;
      const upload = await service.storage
        .from(TRADE_IN_BUCKET)
        .upload(path, photo.buffer, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: false,
        });
      if (upload.error) throw upload.error;
      uploadedPaths.push(path);
      photoRows.push({
        application_id: application.data.id,
        storage_path: path,
        sort_order: index,
        stored_mime_type: "image/webp" as const,
        size_bytes: photo.sizeBytes,
        sha256: photo.sha256,
        width: photo.width,
        height: photo.height,
      });
    }
    const photoInsert = await service.from("trade_in_photos").insert(photoRows);
    if (photoInsert.error) throw photoInsert.error;
  } catch {
    if (uploadedPaths.length)
      await service.storage.from(TRADE_IN_BUCKET).remove(uploadedPaths);
    await service
      .from("trade_in_applications")
      .delete()
      .eq("id", application.data.id);
    return error("Fotoğraflar kaydedilemedi. Lütfen tekrar deneyin.", 422);
  }

  return NextResponse.json({
    data: { applicationNumber: application.data.application_number },
    error: null,
  });
}
