import type { NotificationChannel } from "../channels";
import type { ProviderMessage } from "../types";
import {
  notificationProviders,
  type ProviderRegistry,
} from "./provider-registry";

export class NotificationService {
  constructor(private readonly registry: ProviderRegistry) {}

  send(channel: NotificationChannel, message: ProviderMessage) {
    return this.registry.get(channel).send(message);
  }
}

export const notificationService = new NotificationService(
  notificationProviders,
);
