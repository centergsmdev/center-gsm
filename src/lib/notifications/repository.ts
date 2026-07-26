import { createClient } from "@/lib/supabase/client";
import {
  NOTIFICATION_NOT_CONFIGURED,
  NOTIFICATION_SAFE_ERROR,
} from "./constants";
import type {
  NotificationFilters,
  NotificationLog,
  NotificationQueueItem,
  NotificationResult,
  NotificationTemplate,
  PageResult,
  TemplateInput,
} from "./types";
const client = () => createClient();
const safe = (value: string) => value.trim().replace(/[,%()]/g, " ");
export async function getNotificationTemplates(
  query = "",
): Promise<NotificationResult<NotificationTemplate[]>> {
  const db = client();
  if (!db) return { data: null, error: NOTIFICATION_NOT_CONFIGURED };
  let request = db
    .from("notification_templates")
    .select("*")
    .order("updated_at", { ascending: false });
  if (safe(query))
    request = request.or(
      `name.ilike.%${safe(query)}%,code.ilike.%${safe(query)}%`,
    );
  const result = await request;
  return result.error
    ? { data: null, error: NOTIFICATION_SAFE_ERROR }
    : { data: result.data, error: null };
}
export async function saveNotificationTemplate(
  input: TemplateInput,
): Promise<NotificationResult<string>> {
  const db = client();
  if (!db) return { data: null, error: NOTIFICATION_NOT_CONFIGURED };
  const result = await db.rpc("admin_save_notification_template", {
    p_template: { ...input, variables: input.variables },
  });
  return result.error
    ? { data: null, error: NOTIFICATION_SAFE_ERROR }
    : { data: result.data, error: null };
}
async function paged<T extends NotificationQueueItem | NotificationLog>(
  table: "notification_queue" | "notification_logs",
  filters: NotificationFilters,
): Promise<NotificationResult<PageResult<T>>> {
  const db = client();
  if (!db) return { data: null, error: NOTIFICATION_NOT_CONFIGURED };
  const from = (filters.page - 1) * filters.pageSize;
  let request = db.from(table).select("*", { count: "exact" });
  if (filters.status)
    request = request.eq(
      "status",
      filters.status as NotificationQueueItem["status"],
    );
  if (filters.channel)
    request = request.eq(
      "channel",
      filters.channel as NotificationQueueItem["channel"],
    );
  if (safe(filters.query))
    request = request.ilike("recipient", `%${safe(filters.query)}%`);
  const result = await request
    .order("created_at", { ascending: false })
    .range(from, from + filters.pageSize - 1);
  return result.error
    ? { data: null, error: NOTIFICATION_SAFE_ERROR }
    : {
        data: {
          items: result.data as T[],
          total: result.count ?? 0,
          page: filters.page,
          pageSize: filters.pageSize,
        },
        error: null,
      };
}
export const getNotificationQueue = (filters: NotificationFilters) =>
  paged<NotificationQueueItem>("notification_queue", filters);
export const getNotificationLogs = (filters: NotificationFilters) =>
  paged<NotificationLog>("notification_logs", filters);
export async function getNotificationDashboard(): Promise<
  NotificationResult<{
    templates: number;
    pending: number;
    sent: number;
    failed: number;
  }>
> {
  const db = client();
  if (!db) return { data: null, error: NOTIFICATION_NOT_CONFIGURED };
  const [templates, pending, sent, failed] = await Promise.all([
    db
      .from("notification_templates")
      .select("id", { count: "exact", head: true }),
    db
      .from("notification_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("notification_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent"),
    db
      .from("notification_logs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed"),
  ]);
  if (templates.error || pending.error || sent.error || failed.error)
    return { data: null, error: NOTIFICATION_SAFE_ERROR };
  return {
    data: {
      templates: templates.count ?? 0,
      pending: pending.count ?? 0,
      sent: sent.count ?? 0,
      failed: failed.count ?? 0,
    },
    error: null,
  };
}
export async function getQueueContext(queueId: string) {
  const db = client();
  if (!db) return { data: null, error: NOTIFICATION_NOT_CONFIGURED };
  const queue = await db
    .from("notification_queue")
    .select("*")
    .eq("id", queueId)
    .single();
  if (queue.error) return { data: null, error: NOTIFICATION_SAFE_ERROR };
  const [template, event] = await Promise.all([
    queue.data.template_id
      ? db
          .from("notification_templates")
          .select("*")
          .eq("id", queue.data.template_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    db
      .from("notification_events")
      .select("*")
      .eq("id", queue.data.event_id)
      .single(),
  ]);
  return template.error || event.error
    ? { data: null, error: NOTIFICATION_SAFE_ERROR }
    : {
        data: { queue: queue.data, template: template.data, event: event.data },
        error: null,
      };
}
