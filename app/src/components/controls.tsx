import * as React from "react";
import { cn } from "../lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-500/60 focus:border-brand-500",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-brand-500",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

/** Comma-separated text <-> string[] helper input */
export function TagsInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      className="h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-500/60 focus:border-brand-500"
      value={value.join(", ")}
      placeholder={placeholder ?? "Comma separated"}
      onChange={(e) =>
        onChange(
          e.target.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        )
      }
    />
  );
}
