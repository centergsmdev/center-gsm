import { Inbox } from "lucide-react";
export function AccountEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center">
      <Inbox className="mx-auto size-9 text-muted" />
      <h2 className="mt-4 font-black">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">
        {description}
      </p>
    </div>
  );
}
