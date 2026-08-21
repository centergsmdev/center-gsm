import { parseChatMessageLinks } from "@/lib/live-chat/message-links";

export function ChatMessageText({
  body,
  inverted = false,
}: {
  body: string;
  inverted?: boolean;
}) {
  const parts = parseChatMessageLinks(body);
  return (
    <p className="whitespace-pre-wrap break-words">
      {parts.map((part, index) =>
        part.type === "link" ? (
          <a
            key={`${part.href}-${index}`}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`break-all font-bold underline decoration-1 underline-offset-2 ${
              inverted
                ? "text-white decoration-white/80 hover:decoration-white"
                : "text-blue-700 decoration-blue-400 hover:text-blue-900"
            }`}
          >
            {part.value}
          </a>
        ) : (
          <span key={`text-${index}`}>{part.value}</span>
        ),
      )}
    </p>
  );
}
