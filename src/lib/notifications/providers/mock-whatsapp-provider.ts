import { MockNotificationProvider } from "./mock-provider";
export class MockWhatsappProvider extends MockNotificationProvider {
  constructor() {
    super("whatsapp", "mock-whatsapp");
  }
}
