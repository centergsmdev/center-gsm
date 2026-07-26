import type { AuditAction } from "./actions";
import type { AuditEntityType } from "./constants";
import type { Json, Tables } from "@/types/database";

export type AuditLog = Tables<"audit_logs">;
export type AuditFilters = {
  query: string;
  actor: string;
  action: string;
  entityType: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  pageSize: number;
};
export type AuditPage = {
  items: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
};
export type AuditResult<T> = { data: T | null; error: string | null };
export type CreateAuditLogInput = {
  action: AuditAction;
  entityType: AuditEntityType | (string & {});
  entityId?: string | null;
  entityName?: string | null;
  oldData?: Json | null;
  newData?: Json | null;
  metadata?: Json;
};
