import { AdminShipmentDetail } from "@/components/admin/admin-shipment-detail";
import { ManualShipmentEditor } from "@/components/admin/manual-shipment-editor";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="space-y-5">
      <ManualShipmentEditor id={id} />
      <AdminShipmentDetail id={id} />
    </div>
  );
}
