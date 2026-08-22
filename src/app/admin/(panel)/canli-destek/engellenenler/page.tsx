import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AdminLiveChatBlockList } from "@/components/admin/admin-live-chat-block-list";

export default function BlockedLiveChatUsersPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Engellenen Kullanıcılar</h1>
          <p className="text-sm text-zinc-500">
            Canlı destek ve kontrollü site erişim engelleri
          </p>
        </div>
        <Link
          href="/admin/canli-destek"
          className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-black"
        >
          <ArrowLeft className="size-4" />
          Canlı Desteğe Dön
        </Link>
      </div>
      <AdminLiveChatBlockList />
    </div>
  );
}
