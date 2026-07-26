import { AdminCustomerDetail } from "@/components/admin/admin-customer-detail";
export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminCustomerDetail id={id} />;
}
