import dynamic from "next/dynamic";

import { AdminLoadingState } from "@/components/admin/admin-states";

const AdminWhatsAppRepresentatives = dynamic(
  () =>
    import("@/components/admin/admin-whatsapp-representatives").then(
      (module) => module.AdminWhatsAppRepresentatives,
    ),
  { loading: () => <AdminLoadingState /> },
);

export default function AdminWhatsAppRepresentativesPage() {
  return <AdminWhatsAppRepresentatives />;
}
