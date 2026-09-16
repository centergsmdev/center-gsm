import { AdminTradeInDetail } from "@/components/admin/admin-trade-in-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminTradeInDetail applicationId={id} />;
}
