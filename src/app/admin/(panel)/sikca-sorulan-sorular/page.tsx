import dynamic from "next/dynamic";

import { AdminLoadingState } from "@/components/admin/admin-states";

const AdminFaqs = dynamic(
  () =>
    import("@/components/admin/admin-faqs").then((module) => module.AdminFaqs),
  { loading: () => <AdminLoadingState /> },
);

export default function AdminFrequentlyAskedQuestionsPage() {
  return <AdminFaqs />;
}
