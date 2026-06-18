import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils/cn';

type FormProps = ComponentPropsWithoutRef<'form'>;

export function Form({
  className,
  children,
  ...props
}: FormProps) {
  return (
    <form
      className={cn('flex flex-col gap-4', className)}
      {...props}
    >
      {children}
    </form>
  );
}
