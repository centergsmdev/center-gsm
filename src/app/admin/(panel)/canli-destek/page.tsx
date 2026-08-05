import { AdminLiveChat } from "@/components/admin/admin-live-chat";

export default function AdminLiveChatPage() {
  const aiConfigured = Boolean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
  );
  return <AdminLiveChat aiConfigured={aiConfigured} />;
}
