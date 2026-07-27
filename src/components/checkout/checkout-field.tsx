import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type BaseProps = {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  className?: string;
};

export function CheckoutField({
  label,
  name,
  error,
  required,
  className,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${name}-error`;
  return (
    <div className={className}>
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-bold text-zinc-700"
      >
        {label}
        {required ? (
          <span className="ml-1 text-primary" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <Input
        id={name}
        name={name}
        required={required}
        invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="h-12 rounded-xl bg-white text-base shadow-sm focus:shadow-focus sm:text-sm"
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CheckoutSelect({
  label,
  name,
  error,
  required,
  className,
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const errorId = `${name}-error`;
  return (
    <div className={className}>
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-bold text-zinc-700"
      >
        {label}
        {required ? (
          <span className="ml-1 text-primary" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "h-12 w-full rounded-xl border border-border bg-white px-4 text-base shadow-sm outline-none transition-all duration-200 hover:border-border-strong focus:border-primary focus:shadow-focus sm:text-sm",
          error && "border-danger",
        )}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function CheckoutTextarea({
  label,
  name,
  error,
  required,
  className,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const errorId = `${name}-error`;
  return (
    <div className={className}>
      <label
        htmlFor={name}
        className="mb-2 block text-xs font-bold text-zinc-700"
      >
        {label}
        {required ? (
          <span className="ml-1 text-primary" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <textarea
        id={name}
        name={name}
        required={required}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          "min-h-28 w-full resize-y rounded-xl border border-border bg-white px-4 py-3 text-base shadow-sm outline-none transition-all duration-200 hover:border-border-strong focus:border-primary focus:shadow-focus sm:text-sm",
          error && "border-danger",
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="mt-1.5 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
