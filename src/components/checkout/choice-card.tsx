import type { InputHTMLAttributes, ReactNode } from "react";

export function ChoiceCard({
  title,
  description,
  detail,
  icon,
  checked,
  ...props
}: {
  title: string;
  description: string;
  detail?: string;
  icon: ReactNode;
  checked: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all duration-200 ${checked ? "border-primary bg-red-50/60 shadow-md ring-1 ring-primary" : "border-border bg-white hover:-translate-y-0.5 hover:border-border-strong hover:shadow-sm"}`}
    >
      <input
        {...props}
        type="radio"
        checked={checked}
        className="mt-1 size-4 accent-red-700"
      />
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-lg ${checked ? "bg-primary text-white" : "bg-zinc-100 text-zinc-700"}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">
          {description}
        </span>
      </span>
      {detail ? (
        <span className="text-xs font-black text-foreground">{detail}</span>
      ) : null}
    </label>
  );
}
