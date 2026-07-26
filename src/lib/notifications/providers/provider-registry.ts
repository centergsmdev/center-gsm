import type { NotificationChannel } from "../channels";
import type { NotificationProvider } from "../types";
import { MockEmailProvider } from "./mock-email-provider";
import { MockNotificationProvider } from "./mock-provider";
import { MockPushProvider } from "./mock-push-provider";
import { MockSmsProvider } from "./mock-sms-provider";
import { MockWhatsappProvider } from "./mock-whatsapp-provider";
export class ProviderRegistry {
  private readonly providers = new Map<
    NotificationChannel,
    NotificationProvider
  >();
  register(provider: NotificationProvider) {
    this.providers.set(provider.channel, provider);
    return this;
  }
  get(channel: NotificationChannel) {
    const provider = this.providers.get(channel);
    if (!provider) throw new Error(`Provider bulunamadı: ${channel}`);
    return provider;
  }
}
export const notificationProviders = new ProviderRegistry()
  .register(new MockEmailProvider())
  .register(new MockSmsProvider())
  .register(new MockWhatsappProvider())
  .register(new MockPushProvider())
  .register(new MockNotificationProvider("in_app", "mock-in-app"));
