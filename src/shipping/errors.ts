import type { ShippingErrorCode } from "./types";

export const SHIPPING_SAFE_MESSAGES: Record<ShippingErrorCode, string> = {
  provider_not_configured: "Kargo sağlayıcısı yapılandırılmamış.",
  provider_unavailable: "Kargo sağlayıcısına ulaşılamıyor.",
  invalid_address: "Teslimat adresi geçersiz.",
  invalid_package: "Paket bilgileri geçersiz.",
  shipment_already_exists: "Bu gönderi daha önce oluşturulmuş.",
  shipment_not_found: "Gönderi bulunamadı.",
  tracking_unavailable: "Takip bilgisi alınamıyor.",
  label_unavailable: "Etiket hazırlanamadı.",
  invalid_webhook_signature: "Webhook doğrulanamadı.",
  webhook_replayed: "Webhook daha önce işlendi.",
  rate_limit_exceeded: "Çok fazla istek gönderildi.",
  provider_timeout: "Kargo sağlayıcısı zamanında yanıt vermedi.",
  operation_failed: "Kargo işlemi tamamlanamadı.",
};
export class ShippingGatewayError extends Error {
  constructor(readonly code: ShippingErrorCode) {
    super(SHIPPING_SAFE_MESSAGES[code]);
    this.name = "ShippingGatewayError";
  }
}
