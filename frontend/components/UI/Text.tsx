import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils/cn';

type TextProps = Readonly<{
  size?: 'sm' | 'base' | 'lg';
}> & ComponentPropsWithoutRef<'p'>;

const sizeClasses: Record<NonNullable<TextProps['size']>, string> = {
  sm: 'text-sm leading-relaxed',
  base: 'text-base leading-relaxed',
  lg: 'text-lg leading-relaxed',
};

export function Text({
  size = 'base',
  className,
  children,
  ...props
}: TextProps) {
  return (
    <p
      className={cn('text-foreground', sizeClasses[size], className)}
      {...props}
    >
      {children}
    </p>
  );
}
