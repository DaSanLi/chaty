import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { Title } from '@/components/UI/Title';
import { Text } from '@/components/UI/Text';

type SectionProps = Readonly<{
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}> & ComponentPropsWithoutRef<'section'>;

export function Section({
  id,
  title,
  description,
  children,
  className,
  ...props
}: SectionProps) {
  return (
    <section
      aria-labelledby={`sec-${id}`}
      className={cn(
        'rounded-xl border border-border bg-card p-6 sm:p-8',
        className,
      )}
      {...props}
    >
      <Title as="h2" id={`sec-${id}`}>
        {title}
      </Title>
      {description && (
        <Text size="sm" className="text-muted-foreground mt-1 mb-6">
          {description}
        </Text>
      )}
      <div className={description ? '' : 'mt-6'}>{children}</div>
    </section>
  );
}
