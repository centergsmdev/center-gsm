import sanitizeHtml from "sanitize-html";

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "h2",
    "h3",
    "ul",
    "ol",
    "li",
    "blockquote",
  ],
  allowedAttributes: {},
  disallowedTagsMode: "discard",
};

export function sanitizeRichText(value: string | null | undefined) {
  return sanitizeHtml(value ?? "", options).trim();
}
