import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils/cn';

type SelectOption = Readonly<{
  value: string;
  label: string;
}>;

type SelectProps = Readonly<{
  label: string;
  options: readonly SelectOption[];
}> & ComponentPropsWithoutRef<'select'>;

export function Select({ label, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <select
        className={cn(
          'rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
