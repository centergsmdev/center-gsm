import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

export function CheckoutSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-white/80 bg-white/90 p-4 shadow-sm backdrop-blur sm:p-6">
      <div className="flex gap-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-950 text-xs font-black text-white">
          {number}
        </span>
        <div>
          <h2 className="text-lg font-black tracking-tight">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}
