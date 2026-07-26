import { createClient } from "@/lib/supabase/client";
import { CRM_NOT_CONFIGURED, CRM_SAFE_ERROR } from "./constants";
import type { ActivityInput, CrmResult, UpdateCustomerInput } from "./types";
const rpc = async <T>(
  name:
    | "admin_update_customer"
    | "admin_add_customer_note"
    | "admin_add_customer_tag"
    | "admin_remove_customer_tag"
    | "admin_log_customer_activity",
  args: Record<string, unknown>,
): Promise<CrmResult<T>> => {
  const db = createClient();
  if (!db) return { data: null, error: CRM_NOT_CONFIGURED };
  const result = await db.rpc(name, args as never);
  return result.error
    ? { data: null, error: CRM_SAFE_ERROR }
    : { data: result.data as T, error: null };
};
export const updateCustomerProfile = (input: UpdateCustomerInput) =>
  rpc<boolean>("admin_update_customer", {
    p_customer_id: input.customerId,
    p_status: input.status,
    p_segment: input.segment,
    p_marketing_opt_in: input.marketingOptIn,
  });
export const addCustomerNote = (
  customerId: string,
  note: string,
  isPrivate = true,
) =>
  rpc<string>("admin_add_customer_note", {
    p_customer_id: customerId,
    p_note: note,
    p_is_private: isPrivate,
  });
export const addCustomerTag = (
  customerId: string,
  name: string,
  color: string,
  description = "",
) =>
  rpc<string>("admin_add_customer_tag", {
    p_customer_id: customerId,
    p_tag_name: name,
    p_color: color,
    p_description: description,
  });
export const removeCustomerTag = (customerId: string, tagId: string) =>
  rpc<boolean>("admin_remove_customer_tag", {
    p_customer_id: customerId,
    p_tag_id: tagId,
  });
export const logCustomerActivity = (input: ActivityInput) =>
  rpc<string>("admin_log_customer_activity", {
    p_customer_id: input.customerId,
    p_activity_type: input.activityType,
    p_description: input.description,
    p_metadata: input.metadata ?? {},
  });
