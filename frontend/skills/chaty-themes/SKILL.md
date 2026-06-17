---
name: chaty-themes
description: >
  Multi-theme system for Chaty: dark, light, and midnight palettes using CSS
  custom properties and Tailwind CSS 4 @theme tokens. Covers theme switching via
  data-theme attribute, localStorage persistence, prefers-color-scheme detection,
  and smooth transitions.
  Trigger: Theme configuration, color palettes, dark mode, light mode, midnight
  theme, CSS custom properties, theme switching, Tailwind theme tokens.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
  status: planned
---

# chaty-themes

> ⚠️ **Status: Planned** — This skill will be implemented in a future phase.

## Scope

This skill will define the complete multi-theme architecture for Chaty:

### Three Palettes

| Theme | Character | Use case |
|-------|-----------|----------|
| `light` | High contrast, white backgrounds | Daytime, well-lit environments |
| `dark` | Low brightness, dark backgrounds | Nighttime, low-light environments |
| `midnight` | Opaque/intermediate, muted tones | Transitional, eye-strain reduction |

### Architecture Plan

```
Theme tokens → CSS custom properties → Tailwind @theme → Components
     ↑                ↑
  chaty-themes    globals.css
  (this skill)    (consumed by chaty-ux)
```

### Token Categories (planned)

| Category | Tokens |
|----------|--------|
| Surface | `--color-background`, `--color-surface`, `--color-surface-elevated` |
| Text | `--color-foreground`, `--color-foreground-muted`, `--color-foreground-dim` |
| Border | `--color-border`, `--color-border-hover` |
| Accent | `--color-primary`, `--color-primary-hover` |
| Status | `--color-success`, `--color-warning`, `--color-error` |

### Switching Mechanism (planned)

```html
<!-- Theme set via data-theme attribute on <html> -->
<html lang="en" data-theme="midnight">
```

```tsx
// ThemeProvider.tsx (planned)
'use client';
// 1. Read from localStorage on mount
// 2. Fall back to prefers-color-scheme
// 3. Apply data-theme attribute
// 4. Listen for system preference changes
```

### Integration with chaty-ux

Components never reference themes directly. They use Tailwind theme tokens:

```tsx
// Correct (theme-agnostic)
<div className="bg-background text-foreground">

// Wrong (theme-specific)
<div className="bg-white text-black">
```

## Implementation Phases

1. Define CSS custom property tokens for all 3 palettes
2. Wire tokens into Tailwind CSS 4 `@theme inline` in `globals.css`
3. Build `ThemeProvider` client component with persistence
4. Add smooth transition support (`transition-colors`)
5. Build theme toggle UI component
6. Test all 3 themes against WCAG contrast requirements

## Resources

- **Tailwind CSS 4 theming**: https://tailwindcss.com/docs/theme
- **prefers-color-scheme**: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme
- **Parent skill**: [chaty-ux](../chaty-ux/SKILL.md)
