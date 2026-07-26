import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StateProps = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

function StateShell({
  icon: Icon,
  iconClassName,
  title,
  description,
  actionLabel,
  onAction,
  className,
  role,
}: StateProps & {
  icon: LucideIcon;
  iconClassName?: string;
  role?: "alert" | "status";
}) {
  return (
    <div
      role={role}
      className={cn(
        "flex min-h-56 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-subtle p-8 text-center",
        className,
      )}
    >
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-surface text-zinc-600 shadow-sm">
        <Icon className={cn("size-5", iconClassName)} aria-hidden="true" />
      </span>
      {title ? <h3 className="font-bold text-foreground">{title}</h3> : null}
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
          {description}
        </p>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="outline" size="sm" className="mt-5" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return (
    <StateShell
      icon={Inbox}
      title={props.title ?? "Henüz içerik yok"}
      description={
        props.description ?? "İçerikler hazır olduğunda burada görüntülenecek."
      }
      {...props}
    />
  );
}

export function LoadingState({
  title = "Yükleniyor",
  description = "İçeriğiniz hazırlanıyor.",
  ...props
}: StateProps) {
  return (
    <StateShell
      icon={LoaderCircle}
      iconClassName="animate-spin motion-reduce:animate-none"
      title={title}
      description={description}
      role="status"
      {...props}
    />
  );
}

export function ErrorState({
  title = "Bir sorun oluştu",
  description = "Lütfen daha sonra yeniden deneyin.",
  ...props
}: StateProps) {
  return (
    <StateShell
      icon={AlertTriangle}
      title={title}
      description={description}
      role="alert"
      {...props}
    />
  );
}
