import { MockNotificationProvider } from "./mock-provider";
export class MockSmsProvider extends MockNotificationProvider {
  constructor() {
    super("sms", "mock-sms");
  }
}
