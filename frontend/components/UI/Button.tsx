import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils/cn';

type ButtonProps = Readonly<{
  variant?: 'primary' | 'secondary' | 'ghost';
}> & ComponentPropsWithoutRef<'button'>;

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-primary text-primary-foreground hover:opacity-90 shadow-sm',
  secondary:
    'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost:
    'text-foreground hover:bg-muted',
};

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-medium text-sm transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        'min-h-11 min-w-11',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
