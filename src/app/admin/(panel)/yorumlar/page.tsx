import dynamic from "next/dynamic";

import { AdminLoadingState } from "@/components/admin/admin-states";

const AdminReviews = dynamic(
  () =>
    import("@/components/admin/admin-reviews").then(
      (module) => module.AdminReviews,
    ),
  { loading: () => <AdminLoadingState /> },
);

export default function ReviewsPage() {
  return <AdminReviews />;
}
