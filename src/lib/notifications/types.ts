import type { Json, Tables } from "@/types/database";
import type { NotificationChannel } from "./channels";
import type { NotificationEventType } from "./events";
export type NotificationTemplate = Tables<"notification_templates">;
export type NotificationQueueItem = Tables<"notification_queue">;
export type NotificationLog = Tables<"notification_logs">;
export type NotificationEvent = Tables<"notification_events">;
export type NotificationResult<T> = { data: T | null; error: string | null };
export type PageResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
export type TemplateInput = {
  id?: string;
  code: string;
  name: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  variables: string[];
  is_active: boolean;
};
export type PublishEventInput = {
  eventType: NotificationEventType;
  entityType: string;
  entityId?: string;
  payload: Json;
};
export type ProviderMessage = {
  recipient: string;
  subject: string | null;
  body: string;
  metadata?: Json;
};
export type ProviderResponse = {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  response: Json;
};
export interface NotificationProvider {
  readonly channel: NotificationChannel;
  readonly name: string;
  send(message: ProviderMessage): Promise<ProviderResponse>;
}
export type NotificationFilters = {
  query: string;
  status: string;
  channel: string;
  page: number;
  pageSize: number;
};
