import { createClient } from "@/lib/supabase/client";
import { AUDIT_NOT_CONFIGURED, AUDIT_SAFE_ERROR } from "./constants";
import type { AuditResult, CreateAuditLogInput } from "./types";

export async function createAuditLog(
  input: CreateAuditLogInput,
): Promise<AuditResult<string>> {
  const client = createClient();
  if (!client) return { data: null, error: AUDIT_NOT_CONFIGURED };
  const result = await client.rpc("write_audit_log", {
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId ?? null,
    p_entity_name: input.entityName ?? null,
    p_old_data: input.oldData ?? null,
    p_new_data: input.newData ?? null,
    p_metadata: input.metadata ?? {},
  });
  return result.error
    ? { data: null, error: AUDIT_SAFE_ERROR }
    : { data: result.data, error: null };
}
