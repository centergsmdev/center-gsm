import { AdminNotificationQueue } from "@/components/admin/admin-notification-queue";
export default async function NotificationQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return (
    <AdminNotificationQueue initialView={view === "logs" ? "logs" : "queue"} />
  );
}
