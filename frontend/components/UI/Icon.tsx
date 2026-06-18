import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/lib/utils/cn';

type IconProps = Readonly<{
  name: string;
  size?: 'sm' | 'md' | 'lg';
}> & ComponentPropsWithoutRef<'span'>;

const sizeClasses: Record<NonNullable<IconProps['size']>, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
};

/**
 * PoC: renders a placeholder emoji for each icon name.
 * Replace with SVG sprite or inline SVGs for production.
 */
const iconEmojiMap: Record<string, string> = {
  send: '📤',
  search: '🔍',
  user: '👤',
  settings: '⚙️',
  close: '✕',
  check: '✓',
  plus: '＋',
  trash: '🗑',
  edit: '✎',
  menu: '☰',
  home: '🏠',
  chat: '💬',
  heart: '♥',
  star: '★',
  info: 'ℹ',
};

export function Icon({
  name,
  size = 'md',
  className,
  ...props
}: IconProps) {
  const emoji = iconEmojiMap[name] ?? '●';

  return (
    <span
      aria-hidden="true"
      className={cn('inline-flex items-center justify-center', sizeClasses[size], className)}
      {...props}
    >
      {emoji}
    </span>
  );
}
