"use client";

import { MessageCircle } from "lucide-react";

import { OPEN_LIVE_CHAT_EVENT } from "@/lib/live-chat/events";
import { cn } from "@/lib/utils";

export function OpenLiveChatButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_LIVE_CHAT_EVENT))}
      className={cn(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
        className,
      )}
    >
      <MessageCircle className="size-4" aria-hidden="true" />
      Canlı desteğe bağlan
    </button>
  );
}
