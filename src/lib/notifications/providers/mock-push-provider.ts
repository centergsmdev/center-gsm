import { MockNotificationProvider } from "./mock-provider";
export class MockPushProvider extends MockNotificationProvider {
  constructor() {
    super("push", "mock-push");
  }
}
