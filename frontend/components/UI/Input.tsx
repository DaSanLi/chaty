import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils/cn';

type InputProps = Readonly<{
  label: string;
}> & ComponentPropsWithoutRef<'input'>;

export function Input({
  label,
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-muted-foreground"
      >
        {label}
      </label>
      <input
        id={inputId}
        className={cn(
          'rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring',
          'min-h-11',
          className,
        )}
        {...props}
      />
    </div>
  );
}
