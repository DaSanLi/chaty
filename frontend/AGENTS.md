<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

<!-- BEGIN:project-overview -->
## Chaty Frontend

| Property | Value |
|----------|-------|
| **Project** | Chaty — Real-time chat application |
| **Stack** | Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript 5 |
| **Backend** | NestJS 11 + Socket.IO (see `../backend/`) |
| **Protocol** | Socket.IO namespace `/rooms` (see `../docs/websocketWorkflow.md`) |
| **Skills dir** | [`skills/`](skills/) — project-specific skills home |

### Architecture Decision Record

| Decision | Rationale |
|----------|-----------|
| Next.js 16 App Router | File-based routing, RSC, streaming, ISR |
| Tailwind CSS 4 | Utility-first, `@theme` inline tokens, no config file |
| Socket.IO client-only | WebSocket must live in Client Components only |
| Gateway pattern — root `page.tsx` | Auth check via cookie, only `redirect()`, never renders UI |
| Server Actions per route | `actions.ts` co-located with `page.tsx` in each route directory |
| `lib/` outside `app/` | Shared services, schemas, types — not URL-accessible |
| Cookie-based auth (MVP) | `httpOnly` cookie for username, backed by `cookies()` API |
| Zod for validation | Lightweight, tree-shakeable, TypeScript-native — separate from backend class-validator |
| SOLID principles | Single Responsibility in actions, Dependency Inversion via `lib/services/`, Interface Segregation in props |
| Skills system | Modular AI guidance for a11y, SEO, UX, perf, server actions, SOLID |
<!-- END:project-overview -->

---

<!-- BEGIN:frontend-skill-autoload -->
## Skills — Auto-Load Rules

When you detect any of these contexts, IMMEDIATELY load the corresponding skill BEFORE writing any code.

### Project Skills (`skills/` directory)

| Context | Skill | File |
|--------|-------|------|
| **Chaty frontend**: `components/`, `app/`, chat UI, SSR/RSC decisions, server actions, `actions.ts`, routing structure, SOLID principles, component composition, UX patterns | `chaty-ux` | [skills/chaty-ux/SKILL.md](skills/chaty-ux/SKILL.md) |
| **Theme system**: dark mode, light mode, midnight theme, color palettes, CSS custom properties, theme switching, ThemeProvider | `chaty-themes` | [skills/chaty-themes/SKILL.md](skills/chaty-themes/SKILL.md) |

### Installed Ecosystem Skills (`~/.agents/skills/`)

| Context | Skill | File |
|--------|-------|------|
| **Accessibility**: a11y, WCAG, ARIA, color contrast, screen readers, keyboard navigation, focus management | `a11y-audit` | `~/.agents/skills/a11y-audit/SKILL.md` |
| **SEO**: metadata, Open Graph, JSON-LD, sitemap.xml, robots.txt, search engine visibility | `seo-in-nextjs` | `~/.agents/skills/seo-in-nextjs/SKILL.md` |
| **Performance**: React/Next.js optimization, data fetching, bundle size, re-renders, SSR streaming | `vercel-react-best-practices` | `~/.agents/skills/vercel-react-best-practices/SKILL.md` |
| **HTML semantics**: landmarks, forms, document structure, ARIA basics, media elements | `html` | `~/.agents/skills/html/SKILL.md` |

### Load Order

1. **`chaty-ux`** — Master skill, loaded FIRST for any frontend work
2. Domain-specific skills loaded on demand based on context
3. Skills are additive — each enforces its own rules without conflicting

### Full Skills Documentation

See [`skills/README.md`](skills/README.md) for the complete skills ecosystem:
- How auto-load works
- How to create new project skills
- How to install ecosystem skills
- Workflow diagram
- Maintenance guide
<!-- END:frontend-skill-autoload -->

---

<!-- BEGIN:technical-context -->
## Technical Context

### Route Directory Tree

```
app/                          ← 🚏 App Router (only routes and layouts)
├── layout.tsx                ← Root layout: <html>, metadata, fonts, providers
├── page.tsx                  ← 🚪 GATEWAY: cookie('username') → redirect
├── welcome/                  ← 📝 Onboarding (pre-auth)
│   ├── page.tsx              ← Form "What's your name?"
│   └── actions.ts            ← 'use server': saveUsername → cookie → redirect
├── room/                     ← 🏠 Domain: room management
│   ├── layout.tsx            ← Shared: header with username, nav
│   └── dashboard/            ← Dashboard post-login
│       ├── page.tsx          ← Room list, create room, active rooms
│       └── actions.ts       ← createRoom, deleteRoom, getRooms
├── chat/                     ← 💬 Domain: real-time chat
│   ├── layout.tsx            ← Shared: sidebar rooms + chat pane
│   └── [roomId]/             ← Dynamic route per room
│       ├── page.tsx          ← ChatClient (Socket.IO lives HERE)
│       └── actions.ts       ← fetchMessageHistory (future)
└── profile/                  ← 👤 Domain: user profile
    ├── layout.tsx            ← Shared: profile nav
    ├── page.tsx              ← Own profile view
    └── settings/             ← Profile editing
        ├── page.tsx
        └── actions.ts       ← updateProfile, uploadAvatar

lib/                          ← 🔧 Shared layer (NOT a route — outside app/)
├── services/                 ← Pure business logic
│   ├── user.service.ts       ← getUsername(), requireUsername()
│   ├── room.service.ts       ← createRoom(), listRooms()
│   └── chat.service.ts       ← fetchMessageHistory()
├── schemas/                  ← Zod validation schemas
│   ├── user.schema.ts
│   ├── room.schema.ts
│   └── message.schema.ts
└── types/                    ← Shared TypeScript types
    └── actions.ts            ← ActionResult<T>
```

### Gateway Auth Flow

```
User lands at /
        |
        v
page.tsx (Server Component)
  reads cookie('username')
        |
   ❌ not found  → redirect('/welcome')
                    WelcomePage: form asks name
                      ↓ submit
                    welcome/actions.ts ('use server')
                      1. Zod validates input
                      2. cookies().set('username', value, { httpOnly: true })
                      3. Returns ActionResult { success: true }
                      ↓
                    useActionState → router.push('/room/dashboard')
        |
   ✅ found      → redirect('/room/dashboard')
```

### Server Actions Convention

- **`actions.ts`** at the same level as `page.tsx` in each route directory
- **`'use server'`** directive at top of file — all exports are server actions
- **`zod`** validation before processing — fail fast with typed errors
- **`ActionResult<T>`** return type — consistent `{ success, data } | { success: false, error }`
- **NEVER** import `socket.io-client` or browser APIs in `actions.ts`
- **Always** delegate business logic to `@/lib/services/*` (Dependency Inversion)

### Component Architecture

```
components/
├── UI/              ← Atoms (pure, server components)
│   ├── Button.tsx   ← <button> proxy, ThemeToken colors
│   ├── Input.tsx    ← <label> + <input> wrapper
│   ├── Text.tsx     ← <p> proxy
│   ├── Title.tsx    ← Polymorphic h1..h6
│   ├── Anchor.tsx   ← <a> proxy, external link handling
│   ├── Icon.tsx     ← SVG icon renderer
│   ├── Select.tsx   ← <label> + <select> wrapper
│   └── Form.tsx     ← <form> wrapper, server action support
├── Chat.tsx         ← Molecules (compose atoms)
├── Room.tsx
├── ChatShell.tsx    ← Server Component: semantic structure
└── ChatClient.tsx   ← Client Component: Socket.IO + state
```

### Data Flow & Boundaries

| Data | Source | Location | Pattern |
|------|--------|----------|---------|
| Auth state (username) | `cookies()` | Gateway `page.tsx` | Redirect or allow |
| Initial page shell | SSR | Server Components | Static rendering |
| Dashboard actions | Server Actions | `room/dashboard/actions.ts` | `'use server'` → `lib/services/` |
| Real-time messages | Socket.IO | `ChatClient` (`'use client'`) | `socket.on('newMessage')` |
| Room list | Socket.IO | `ChatClient` | `socket.emitWithAck('getRooms')` |
| Theme state | localStorage | Client Component | `data-theme` attribute |
<!-- END:technical-context -->
