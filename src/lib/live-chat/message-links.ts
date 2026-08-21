export type ChatMessagePart =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"']+/giu;
const TRAILING_PUNCTUATION = /[.,!?;:)\]}]+$/u;

export function parseChatMessageLinks(message: string): ChatMessagePart[] {
  const parts: ChatMessagePart[] = [];
  let cursor = 0;

  for (const match of message.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    const raw = match[0];
    const value = raw.replace(TRAILING_PUNCTUATION, "");
    const trailing = raw.slice(value.length);
    const href = value.toLocaleLowerCase("en-US").startsWith("www.")
      ? `https://${value}`
      : value;

    let valid = false;
    try {
      const url = new URL(href);
      valid = url.protocol === "http:" || url.protocol === "https:";
    } catch {
      valid = false;
    }

    if (!valid || !value) continue;
    if (index > cursor)
      parts.push({ type: "text", value: message.slice(cursor, index) });
    parts.push({ type: "link", value, href });
    if (trailing) parts.push({ type: "text", value: trailing });
    cursor = index + raw.length;
  }

  if (cursor < message.length)
    parts.push({ type: "text", value: message.slice(cursor) });
  return parts.length ? parts : [{ type: "text", value: message }];
}
