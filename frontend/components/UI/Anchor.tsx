import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils/cn';

type AnchorProps = Readonly<{
  external?: boolean;
}> & ComponentPropsWithoutRef<'a'>;

export function Anchor({
  external = false,
  className,
  children,
  href,
  ...props
}: AnchorProps) {
  const externalAttrs = external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <a
      href={href}
      className={cn(
        'text-primary underline-offset-4 hover:underline',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded-sm',
        className,
      )}
      {...externalAttrs}
      {...props}
    >
      {children}
    </a>
  );
}
