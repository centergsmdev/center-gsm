import { AdminCard, AdminCardHeader } from "./admin-card";
import type { Tables } from "@/types/database";
export function AdminOrderShippingPreference({
  order,
}: {
  order: Tables<"orders">;
}) {
  return (
    <AdminCard>
      <AdminCardHeader
        title="Müşteri Kargo Tercihi"
        description="Checkout sırasında sipariş snapshot'ına kaydedilen seçim"
      />
      <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Info
          label="Seçilen firma"
          value={order.selected_shipping_name ?? "—"}
        />
        <Info
          label="Provider"
          value={order.selected_shipping_provider ?? "—"}
        />
        <Info
          label="Tahmini teslimat"
          value={
            order.estimated_delivery_days
              ? `${order.estimated_delivery_days} iş günü`
              : "—"
          }
        />
        <Info label="Kargo notu" value={order.shipping_note ?? "—"} />
      </dl>
    </AdminCard>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase text-zinc-500">{label}</dt>
      <dd className="mt-1 font-bold">{value}</dd>
    </div>
  );
}
