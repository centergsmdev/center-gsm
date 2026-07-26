import { MockNotificationProvider } from "./mock-provider";
export class MockEmailProvider extends MockNotificationProvider {
  constructor() {
    super("email", "mock-email");
  }
}
