---
name: chaty-themes
description: >
  Multi-theme system for Chaty: dark, light, and midnight palettes using CSS
  custom properties, Tailwind CSS 4 @theme inline, and next-themes for state
  management. Covers theme switching via data-theme attribute, localStorage
  persistence, prefers-color-scheme detection, and smooth transitions.
  Trigger: Theme configuration, color palettes, dark mode, light mode, midnight
  theme, CSS custom properties, theme switching, Tailwind theme tokens.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "2.0"
  status: active
---

# chaty-themes

> ✅ **Status: Active** — Implemented with Tailwind CSS 4 + next-themes.

## Architecture

```
data-theme attr → CSS custom properties → @theme inline → Tailwind utilities
       ↑                    ↑
  next-themes          globals.css
  (React Context)      (palettes + mapping)
```

### How It Works

1. **`next-themes`** manages theme state via React Context + localStorage
2. Theme changes set `data-theme` attribute on `<html>` (e.g. `data-theme="midnight"`)
3. CSS selectors `[data-theme="dark"]`, `[data-theme="midnight"]` override CSS custom properties
4. `@theme inline` maps CSS variables to Tailwind utility classes (`bg-primary`, `text-foreground`)
5. `@custom-variant dark` enables the `dark:` prefix for conditional utilities

### File Structure

```
components/
├── Theme/
│   ├── ThemeProvider.tsx              ← Wrapper around next-themes (Client Component)
│   └── ThemeSwitcherComponent.tsx     ← Molecule: useTheme() + <Select> atom
└── UI/
    └── Select.tsx                     ← Atom: reusable <select> component

app/
├── globals.css                        ← @theme inline + 3 palettes + @custom-variant
└── layout.tsx                         ← ThemeProvider + suppressHydrationWarning + anti-flash script
```

## Three Palettes

| Theme | Character | Use case |
|-------|-----------|----------|
| `light` | High contrast, white backgrounds | Daytime, well-lit environments |
| `dark` | Low brightness, dark backgrounds | Nighttime, low-light environments |
| `midnight` | Navy/slate base, indigo accent | Eye-strain reduction, transitional |

## Token Categories

### Convention: surface-foreground pairs (shadcn/ui pattern)

Every surface token has a corresponding `-foreground` token for text/icon contrast:

| Category | Tokens |
|----------|--------|
| Surface | `--background` / `--foreground` |
| Card | `--card` / `--card-foreground` |
| Primary | `--primary` / `--primary-foreground` |
| Secondary | `--secondary` / `--secondary-foreground` |
| Subtle | `--muted` / `--muted-foreground` |
| Interactive | `--accent` / `--accent-foreground` |
| Destructive | `--destructive` |
| Status | `--success`, `--warning`, `--error` |
| Border | `--border`, `--input`, `--ring` |
| Radius | `--radius` (base, derives `--radius-sm` through `--radius-xl`) |

## Color Values (Hexadecimal)

### Light

| Token | Value | Description |
|-------|-------|-------------|
| `--background` | `#ffffff` | White |
| `--foreground` | `#171717` | Near-black |
| `--primary` | `#2563eb` | Blue |
| `--card` | `#fafafa` | Off-white |
| `--muted` | `#f4f4f5` | Light gray |
| `--border` | `#e4e4e7` | Border gray |
| `--success` | `#16a34a` | Green |
| `--warning` | `#f59e0b` | Amber |
| `--error` | `#dc2626` | Red |

### Dark

| Token | Value | Description |
|-------|-------|-------------|
| `--background` | `#0a0a0a` | Near-black |
| `--foreground` | `#ededed` | Light gray |
| `--primary` | `#3b82f6` | Lighter blue |
| `--card` | `#18181b` | Dark gray |
| `--muted` | `#27272a` | Muted dark |
| `--border` | `#27272a` | Dark border |
| `--success` | `#22c55e` | Brighter green |
| `--warning` | `#fbbf24` | Brighter amber |
| `--error` | `#ef4444` | Brighter red |

### Midnight

| Token | Value | Description |
|-------|-------|-------------|
| `--background` | `#0f172a` | Navy |
| `--foreground` | `#cbd5e1` | Blue-gray text |
| `--primary` | `#6366f1` | Indigo |
| `--card` | `#1e293b` | Slate |
| `--muted` | `#1e293b` | Slate muted |
| `--border` | `#334155` | Slate border |
| `--success` | `#4ade80` | Soft green |
| `--warning` | `#facc15` | Soft yellow |
| `--error` | `#f87171` | Soft red |

## Theme Switching Flow

```
User clicks ThemeSwitcherComponent
        │
        ▼
setTheme('midnight')
        │
   ┌────┼────────────┐
   ▼    ▼            ▼
Context  localStorage  <html data-theme="midnight">
update   persist       │
                       ▼
              CSS: [data-theme="midnight"] activates
              --primary: #6366f1
              --background: #0f172a
                       │
                       ▼
              @theme inline applies
              --color-primary = var(--primary)
                       │
                       ▼
              All components re-render with new values
              bg-primary → #6366f1 (indigo)
              text-foreground → #cbd5e1 (blue-gray)
```

## Anti-Flash Strategy

A synchronous inline script in `<head>` (before any React code) reads
`localStorage` and sets `data-theme` immediately, preventing the "flash of
wrong theme" (FART) on page load:

```html
<script>
  (function() {
    try {
      var theme = localStorage.getItem('chaty-theme');
      if (theme === 'light' || theme === 'dark' || theme === 'midnight') {
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch(e) {}
  })();
</script>
```

`suppressHydrationWarning` on `<html>` prevents React hydration mismatch
warnings since the server renders without `data-theme` and the client adds it.

## Usage in Components

Components are theme-agnostic — they only use semantic Tailwind utilities:

```tsx
// Correct: theme-agnostic
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground rounded-lg px-4 py-2">
    Send
  </button>
</div>

// Wrong: hardcoded theme values
<div className="bg-white text-black">
  <button className="bg-blue-600 text-white rounded-lg px-4 py-2">
    Send
  </button>
</div>
```

### Dark variant

For elements that need explicit dark-mode overrides beyond what CSS variables provide:

```tsx
{/* The icon inverts only in dark mode */}
<img className="dark:invert" src="/logo.svg" alt="Logo" />
```

## Tailwind CSS v4 Equivalents

| TW3 concept | TW4 equivalent |
|-------------|---------------|
| `tailwind.config.ts` → `theme.extend.colors: { primary: 'var(--primary)' }` | `@theme inline { --color-primary: var(--primary); }` |
| `darkMode: 'class'` | `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))` |
| `@tailwind base/components/utilities` | `@import "tailwindcss"` |

## Dependencies

- **next-themes**: Theme state management, localStorage persistence, anti-flash
- **Tailwind CSS 4**: `@theme inline`, `@custom-variant`

## Resources

- **Parent skill**: [chaty-ux](../chaty-ux/SKILL.md)
- **Tailwind CSS 4 theming**: https://tailwindcss.com/docs/theme
- **Tailwind CSS 4 dark mode**: https://tailwindcss.com/docs/dark-mode
- **next-themes**: https://github.com/pacocoursey/next-themes
- **shadcn/ui theming**: https://ui.shadcn.com/docs/theming
