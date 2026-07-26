import type { NotificationChannel } from "../channels";
import type {
  NotificationProvider,
  ProviderMessage,
  ProviderResponse,
} from "../types";
export class MockNotificationProvider implements NotificationProvider {
  constructor(
    public readonly channel: NotificationChannel,
    public readonly name = `mock-${channel}`,
  ) {}
  async send(message: ProviderMessage): Promise<ProviderResponse> {
    await Promise.resolve();
    return {
      success: true,
      provider: this.name,
      messageId: `mock-${crypto.randomUUID()}`,
      response: { accepted: true, recipient: message.recipient },
    };
  }
}
