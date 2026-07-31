import { AnimatedHeading } from "@/components/motion/motion-system";
import { cn } from "@/lib/utils";

export function MobileSectionHeading({
  id,
  children,
  inverted = false,
}: {
  id: string;
  children: React.ReactNode;
  inverted?: boolean;
}) {
  return (
    <AnimatedHeading
      className={cn(
        "mb-3 text-center text-xs font-black uppercase tracking-[0.24em] sm:hidden",
        inverted ? "text-white" : "text-zinc-950",
      )}
    >
      <h2 id={id}>{children}</h2>
    </AnimatedHeading>
  );
}
