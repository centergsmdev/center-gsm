import { cn } from "@/lib/utils";

type DividerProps = {
  className?: string;
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
};

export function Divider({
  className,
  orientation = "horizontal",
  decorative = true,
}: DividerProps) {
  return (
    <div
      role={decorative ? "none" : "separator"}
      aria-orientation={decorative ? undefined : orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}
