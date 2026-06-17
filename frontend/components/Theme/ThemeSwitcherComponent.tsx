'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Select } from '@/components/UI/Select';

const THEME_OPTIONS = [
  { value: 'light',    label: '☀️ Claro' },
  { value: 'dark',     label: '🌙 Oscuro' },
  { value: 'midnight', label: '🌑 Midnight' },
  { value: 'system',   label: '💻 Sistema' },
] as const;

export function ThemeSwitcherComponent() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch: only render after mount
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-40 h-9 animate-pulse rounded-md bg-muted" />;
  }

  return (
    <Select
      label="Tema"
      value={theme ?? 'system'}
      onChange={(e) => setTheme(e.target.value)}
      options={THEME_OPTIONS}
      className="w-40"
    />
  );
}
