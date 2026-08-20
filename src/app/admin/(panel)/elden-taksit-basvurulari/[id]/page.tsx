import { AdminInstallmentApplicationDetail } from "@/components/admin/admin-installment-application-detail";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminInstallmentApplicationDetail applicationId={id} />;
}
