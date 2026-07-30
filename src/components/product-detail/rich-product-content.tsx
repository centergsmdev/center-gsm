import { cn } from "@/lib/utils";

export function RichProductContent({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rich-product-content max-w-4xl text-sm leading-7 text-muted",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
