import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils/cn';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

type TitleProps = Readonly<{
  as?: HeadingLevel;
}> & ComponentPropsWithoutRef<'h2'>;

const levelClasses: Record<HeadingLevel, string> = {
  h1: 'text-4xl font-bold tracking-tight',
  h2: 'text-3xl font-semibold tracking-tight',
  h3: 'text-2xl font-semibold',
  h4: 'text-xl font-medium',
  h5: 'text-lg font-medium',
  h6: 'text-base font-medium',
};

export function Title({
  as: Tag = 'h2',
  className,
  children,
  ...props
}: TitleProps) {
  return (
    <Tag
      className={cn('text-foreground', levelClasses[Tag], className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
