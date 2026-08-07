import { AdminAdvertisementCenter } from "@/components/admin/admin-advertisement-center";

export default function AdvertisementCenterPage() {
  return (
    <AdminAdvertisementCenter
      metaReadiness={{
        pixel: /^\d{5,30}$/.test(
          process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() ?? "",
        ),
        capi: Boolean(
          process.env.META_DATASET_ID?.trim() &&
          process.env.META_ACCESS_TOKEN?.trim(),
        ),
      }}
    />
  );
}
