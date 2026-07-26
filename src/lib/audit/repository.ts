import { createClient } from "@/lib/supabase/client";
import { AUDIT_NOT_CONFIGURED, AUDIT_SAFE_ERROR } from "./constants";
import type { AuditFilters, AuditPage, AuditResult } from "./types";

const safeSearch = (value: string) => value.trim().replace(/[,%()]/g, " ");

export async function getAuditLogs(
  filters: AuditFilters,
): Promise<AuditResult<AuditPage>> {
  const client = createClient();
  if (!client) return { data: null, error: AUDIT_NOT_CONFIGURED };
  const from = (filters.page - 1) * filters.pageSize;
  let query = client.from("audit_logs").select("*", { count: "exact" });
  const search = safeSearch(filters.query);
  if (search)
    query = query.or(
      `entity_name.ilike.%${search}%,entity_id.ilike.%${search}%,actor_email.ilike.%${search}%,action.ilike.%${search}%`,
    );
  if (filters.actor) query = query.eq("actor_email", filters.actor);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.dateFrom)
    query = query.gte("created_at", `${filters.dateFrom}T00:00:00.000Z`);
  if (filters.dateTo)
    query = query.lte("created_at", `${filters.dateTo}T23:59:59.999Z`);
  const result = await query
    .order("created_at", { ascending: false })
    .range(from, from + filters.pageSize - 1);
  return result.error
    ? { data: null, error: AUDIT_SAFE_ERROR }
    : {
        data: {
          items: result.data,
          total: result.count ?? 0,
          page: filters.page,
          pageSize: filters.pageSize,
        },
        error: null,
      };
}

export async function getAuditLog(id: string) {
  const client = createClient();
  if (!client) return { data: null, error: AUDIT_NOT_CONFIGURED };
  const result = await client
    .from("audit_logs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return result.error
    ? { data: null, error: AUDIT_SAFE_ERROR }
    : { data: result.data, error: null };
}
