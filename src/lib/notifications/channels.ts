export const NOTIFICATION_CHANNELS = [
  "email",
  "sms",
  "whatsapp",
  "push",
  "in_app",
] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  email: "E-posta",
  sms: "SMS",
  whatsapp: "WhatsApp",
  push: "Push",
  in_app: "Uygulama içi",
};
