"use client";

import dynamic from "next/dynamic";

const LiveChatWidget = dynamic(
  () =>
    import("@/components/live-chat/live-chat-widget").then(
      (module) => module.LiveChatWidget,
    ),
  { ssr: false },
);

export function DeferredLiveChat() {
  return <LiveChatWidget />;
}
