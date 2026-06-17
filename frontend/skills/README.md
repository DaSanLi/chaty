# Chaty Frontend — Skills Ecosystem

> Modular skill system that guides the AI agent in architecture decisions,
> accessibility, SEO, performance, and UX for the Next.js frontend.

---

## Skills Architecture

```
skills/                     ← Project-specific skills (source of truth)
├── README.md               ← This document
├── chaty-ux/               ← Full frontend architecture (9 modules)
│   └── SKILL.md
└── chaty-themes/           ← Multi-palette theme system (PLANNED)
    └── SKILL.md

~/.agents/skills/           ← Ecosystem-installed skills
├── a11y-audit/             ← WCAG 2.2 Audit
├── seo-in-nextjs/          ← Next.js SEO (Metadata API, sitemap, JSON-LD)
├── vercel-react-best-practices/ ← 69 React/Next.js performance rules
└── html/                   ← Semantic HTML, ARIA basics, forms
```

---

## How Auto-Load Works

The `frontend/AGENTS.md` file contains a trigger table. When the agent detects a context, it automatically loads the corresponding skill **before** writing any code:

| Detects... | Loads... |
|-----------|---------|
| `components/`, `app/`, chat UI, SSR/RSC, server actions, SOLID | `chaty-ux` (master) |
| accessibility, a11y, WCAG, ARIA | `a11y-audit` |
| SEO, metadata, sitemap, JSON-LD | `seo-in-nextjs` |
| performance, bundle, data fetching | `vercel-react-best-practices` |
| semantic HTML, landmarks, forms | `html` |

**Golden Rule**: `chaty-ux` is the master skill. It loads first and the others complement it.

---

## Skills Inventory

### Project (team-created)

| Skill | Status | Modules | File |
|-------|--------|---------|---------|
| **chaty-ux** | ✅ Active | 9: SSR/RSC, HTML5, Components, Mobile-First, UX Chat, Themes, Server Actions, Directories, SOLID | [SKILL.md](chaty-ux/SKILL.md) |
| **chaty-themes** | 🔲 Planned | dark/light/midnight palettes, CSS tokens, ThemeProvider | [SKILL.md](chaty-themes/SKILL.md) |

### Ecosystem (installed via `npx skills add`)

| Skill | Installs | Coverage | File |
|-------|----------|----------|---------|
| **a11y-audit** | 640 | WCAG 2.2 Level A/AA, scan + fix + verify | `~/.agents/skills/a11y-audit/SKILL.md` |
| **seo-in-nextjs** | 70 | Metadata API, Open Graph, JSON-LD, sitemap, robots.txt | `~/.agents/skills/seo-in-nextjs/SKILL.md` |
| **vercel-react-best-practices** | 185K | 69 rules: waterfalls, bundle, SSR, re-renders | `~/.agents/skills/vercel-react-best-practices/SKILL.md` |
| **html** | — | Semantic HTML, ARIA, forms, media | `~/.agents/skills/html/SKILL.md` |

---

## Create a New Project Skill

```bash
# 1. Create directory
mkdir -p frontend/skills/my-skill

# 2. Create SKILL.md from the template:
```

```markdown
---
name: my-skill
description: >
  What it does and when it triggers.
  Trigger: Keywords that fire the auto-load.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use
...

## Critical Patterns
...

## Code Examples
...

## Commands
...
```

```bash
# 3. Register in frontend/AGENTS.md (Skills table)
# 4. Done — the agent will auto-load it
```

---

## Install an Ecosystem Skill

```bash
# Search
npx skills find <keyword>

# Install
npx skills add <owner/repo@skill> -g -y

# View installed skills
ls ~/.agents/skills/
```

---

## Skills Workflow

```
User describes task
        |
        v
AGENTS.md detects context → Activates relevant skills
        |
        v
Master skill (chaty-ux) → Defines architecture and rules
        |
        v
Complementary skills → Contribute specific rules (a11y, SEO, perf)
        |
        v
Agent writes code following ALL active skills
```

---

## Maintenance

- **Project skills** (`frontend/skills/`) → Versioned in git, maintained by the team
- **Installed skills** (`~/.agents/skills/`) → Update with `npx skills update`
- **AGENTS.md** → Update triggers when skills are added/removed
