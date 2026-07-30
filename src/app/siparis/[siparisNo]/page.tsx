import type { Metadata } from "next";
import { OrderDetails } from "@/components/order-tracking/order-details";
import { OrderTrackingBreadcrumb } from "@/components/order-tracking/order-tracking-breadcrumb";
import { Container } from "@/components/ui/container";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ siparisNo: string }>;
}): Promise<Metadata> {
  const { siparisNo } = await params;
  return {
    title: `${decodeURIComponent(siparisNo)} | Sipariş Detayı`,
    description: "CENTER GSM demo sipariş detay ve kargo takip ekranı.",
  };
}
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ siparisNo: string }>;
}) {
  const { siparisNo } = await params;
  const decoded = decodeURIComponent(siparisNo);
  return (
    <main className="min-h-screen max-w-full overflow-x-clip bg-surface-subtle/50 pb-12 pt-4 sm:pb-20 sm:pt-8">
      <Container>
        <OrderTrackingBreadcrumb current={decoded} />
        <div className="mt-5 min-w-0 max-w-full sm:mt-7">
          <OrderDetails orderNumber={siparisNo} />
        </div>
      </Container>
    </main>
  );
}
