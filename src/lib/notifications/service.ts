import { createClient } from "@/lib/supabase/client";
import { notificationService } from "./providers";
import { jsonVariables, renderTemplate } from "./helpers";
import { getQueueContext } from "./repository";
import {
  NOTIFICATION_NOT_CONFIGURED,
  NOTIFICATION_SAFE_ERROR,
} from "./constants";
import type { NotificationResult, PublishEventInput } from "./types";
export async function publishNotificationEvent(
  input: PublishEventInput,
): Promise<NotificationResult<string>> {
  const db = createClient();
  if (!db) return { data: null, error: NOTIFICATION_NOT_CONFIGURED };
  const result = await db.rpc("publish_notification_event", {
    p_event_type: input.eventType,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? "",
    p_payload: input.payload,
  });
  return result.error
    ? { data: null, error: NOTIFICATION_SAFE_ERROR }
    : { data: result.data, error: null };
}
export async function processNotificationQueueItem(
  queueId: string,
): Promise<NotificationResult<true>> {
  const db = createClient();
  if (!db) return { data: null, error: NOTIFICATION_NOT_CONFIGURED };
  const context = await getQueueContext(queueId);
  if (!context.data) return { data: null, error: context.error };
  const { queue, template, event } = context.data;
  if (!template) return { data: null, error: "Bildirim şablonu bulunamadı." };
  const variables = jsonVariables(event.payload);
  let response;
  try {
    response = await notificationService.send(queue.channel, {
      recipient: queue.recipient,
      subject: template.subject
        ? renderTemplate(template.subject, variables)
        : null,
      body: renderTemplate(template.body, variables),
      metadata: { event_id: event.id },
    });
  } catch {
    response = {
      success: false,
      provider: `mock-${queue.channel}`,
      error: NOTIFICATION_SAFE_ERROR,
      response: {},
    };
  }
  const completed = await db.rpc("admin_complete_notification", {
    p_queue_id: queue.id,
    p_success: response.success,
    p_provider: response.provider,
    p_response: response.response,
    p_error: response.error ?? null,
  });
  return completed.error
    ? { data: null, error: NOTIFICATION_SAFE_ERROR }
    : { data: true, error: null };
}
