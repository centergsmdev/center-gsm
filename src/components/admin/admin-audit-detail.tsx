"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminCard, AdminCardHeader } from "./admin-card";
import {
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingState,
} from "./admin-states";
import {
  formatAuditDate,
  formatAuditJson,
  getAuditActionLabel,
  getAuditLog,
  summarizeUserAgent,
} from "@/lib/audit";
import type { AuditLog } from "@/lib/audit";

export function AdminAuditDetail({ id }: { id: string }) {
  const [item, setItem] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    void getAuditLog(id).then((result) => {
      setItem(result.data);
      setError(result.error ?? "");
      setLoading(false);
    });
  }, [id]);
  if (loading) return <AdminLoadingState />;
  if (error) return <AdminErrorState />;
  if (!item)
    return (
      <AdminEmptyState
        title="Kayıt bulunamadı"
        description="Bu denetim kaydı mevcut değil veya görüntüleme yetkiniz yok."
      />
    );
  return (
    <div className="space-y-4">
      <Link
        href="/admin/denetim-kayitlari"
        prefetch={false}
        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
      >
        <ArrowLeft className="size-4" />
        Denetim kayıtlarına dön
      </Link>
      <AdminCard>
        <AdminCardHeader
          title={getAuditActionLabel(item.action)}
          description={`${formatAuditDate(item.created_at)} · ${item.entity_type}`}
        />
        <dl className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Admin" value={item.actor_email ?? "Sistem"} />
          <Detail label="Rol" value={item.actor_role ?? "system"} />
          <Detail
            label="Varlık"
            value={item.entity_name ?? item.entity_id ?? "—"}
          />
          <Detail label="IP" value={item.ip_address ?? "—"} />
          <Detail
            label="Tarayıcı"
            value={summarizeUserAgent(item.user_agent)}
          />
          <Detail label="Varlık ID" value={item.entity_id ?? "—"} />
        </dl>
      </AdminCard>
      <div className="grid gap-4 lg:grid-cols-2">
        <JsonCard
          title="Eski değerler"
          value={formatAuditJson(item.old_data)}
        />
        <JsonCard
          title="Yeni değerler"
          value={formatAuditJson(item.new_data)}
        />
      </div>
      <JsonCard title="Metadata" value={formatAuditJson(item.metadata)} />
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-zinc-400">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm font-semibold text-zinc-900">
        {value}
      </dd>
    </div>
  );
}
function JsonCard({ title, value }: { title: string; value: string }) {
  return (
    <AdminCard>
      <AdminCardHeader title={title} />
      <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap break-words p-5 text-xs leading-6 text-zinc-700">
        {value}
      </pre>
    </AdminCard>
  );
}
