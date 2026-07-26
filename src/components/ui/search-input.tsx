import { Search, X } from "lucide-react";

import { IconButton } from "@/components/ui/icon-button";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchInputProps = InputProps & { onClear?: () => void };

export function SearchInput({
  className,
  onClear,
  ...props
}: SearchInputProps) {
  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
      />
      <Input
        type="search"
        className={cn("rounded-full pl-11", onClear && "pr-12", className)}
        {...props}
      />
      {onClear ? (
        <IconButton
          label="Aramayı temizle"
          size="sm"
          variant="ghost"
          className="absolute right-1.5 top-1/2 -translate-y-1/2"
          onClick={onClear}
        >
          <X className="size-4" />
        </IconButton>
      ) : null}
    </div>
  );
}
