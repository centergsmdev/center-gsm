import { AdminAuditDetail } from "@/components/admin/admin-audit-detail";

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminAuditDetail id={id} />;
}
