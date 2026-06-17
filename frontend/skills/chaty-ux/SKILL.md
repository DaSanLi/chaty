---
name: chaty-ux
description: >
  Frontend architecture for Chaty: SSR/RSC strategy, HTML5 semantic markup,
  reusable UI component system, mobile-first responsive design, real-time
  chat UX patterns, server actions architecture, directory-based routing,
  and SOLID principles.
  Trigger: Working on Chaty frontend (components/, app/), real-time chat UI,
  SSR/RSC decisions, server actions, routing structure, or SOLID patterns.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

This skill activates when working on the Chaty frontend (`frontend/` directory) for:
- Creating or refactoring pages in `app/`
- Building or composing components in `components/` or `components/UI/`
- Making SSR vs Client Component decisions
- Implementing real-time chat UX flows
- Writing `actions.ts` server actions with zod validation
- Defining route directory structure and bounded contexts
- Applying SOLID principles to components and services
- Establishing responsive breakpoints and mobile-first layouts
- Writing semantic HTML for accessibility

**Stack**: Next.js 16 + React 19 + Tailwind CSS 4 + TypeScript 5 + Zod (validation)
**Sibling skills**: `a11y-audit` (accessibility), `seo-in-nextjs` (SEO), `vercel-react-best-practices` (performance), `html` (semantic HTML)
**Future skill**: `chaty-themes` (dark/light/midnight palette system)

---

## 1. SSR/RSC Architecture Strategy

### The Golden Rule

**Socket.IO is 100% client-side.** Never import or initialize Socket.IO inside a Server Component, `page.tsx` at the root level, or `layout.tsx`. The WebSocket connection must live inside a Client Component with `'use client'` directive.

```
WRONG:                          CORRECT:
+------------------------+      +-----------------------+
| app/page.tsx           |      | app/page.tsx (server) |
|                        |      | +- ChatShell (server) |
| import { io } ...      |      | +- ChatClient (client)|
| const socket = io()    |      |    +- io() lives here |
+------------------------+      +-----------------------+
```

### Component Boundary Strategy

| Layer | Type | Responsibility |
|-------|------|---------------|
| `layout.tsx` | **Server Component** | Root HTML, metadata, font loading, theme provider wrapper |
| `page.tsx` | **Server Component** | Initial data fetch (if any), compose Shell + Client boundary |
| Chat Shell (`ChatShell.tsx`) | **Server Component** | Static parts: header, sidebar skeleton, semantic structure |
| Chat Client (`ChatClient.tsx`) | **Client Component** | Socket.IO connection, message state, user interactions |
| UI Atoms (`components/UI/*`) | **Server Components** | Pure presentational, zero side effects, no hooks |

### `'use client'` boundary placement

- Place the boundary at the **leaf** level, not the root
- `ChatClient` is the single client entry point for real-time features
- UI atoms remain server components — they receive data via props
- Never pass Server Component as children to a Client Component directly (use composition pattern)

```tsx
// app/page.tsx (Server Component) — NO 'use client'
import { ChatShell } from '@/components/ChatShell';
import { ChatClient } from '@/components/ChatClient';

export default function ChatPage() {
  return (
    <ChatShell>
      <ChatClient /> {/* Client boundary starts HERE */}
    </ChatShell>
  );
}
```

### Data Fetching Pattern

| Data | Source | Where | Strategy |
|------|--------|-------|----------|
| Initial messages (history) | HTTP API (future) | Server Component | `fetch()` in RSC, stream to client |
| Real-time messages | Socket.IO | Client Component | `socket.on('newMessage')` |
| Room list | Socket.IO | Client Component | `socket.emitWithAck('getRooms')` |
| User list in room | Socket.IO | Client Component | `socket.on('roomUsers')` |
| Static page copy | — | Server Component | Direct JSX, no fetch needed |

### Streaming Pattern

For pages where message history is loaded from an API, wrap the history section in `<Suspense>`:

```tsx
// ChatShell.tsx
import { Suspense } from 'react';
import { MessageHistory } from './MessageHistory';
import { MessageHistorySkeleton } from './MessageHistorySkeleton';

export function ChatShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <aside>{/* Room list */}</aside>
      <main>
        <Suspense fallback={<MessageHistorySkeleton />}>
          <MessageHistory />
        </Suspense>
        {children /* ChatClient with real-time input */}
      </main>
    </div>
  );
}
```

---

## 2. HTML5 Semantic Foundation

### Page Landmarks (mandatory structure)

Every Chaty page MUST use this landmark hierarchy:

```
<html lang="en">
  <body>
    <header>         <- App title, theme toggle, user avatar
    <main>           <- Single <main> per page
      <nav>          <- Room list / sidebar navigation
      <section>      <- Active room (aria-label="Chat room: lobby")
        <ul>         <- Message list
          <li>       <- Each message
            <article> <- Message content (self-contained)
        </ul>
        <form>       <- Message input (uses <form> onSubmit, not div+onClick)
      </section>
    </main>
    <footer>         <- Connection status, app version
  </body>
</html>
```

### Chat-Specific Semantic Rules

| Element | Usage | aria |
|---------|-------|------|
| `<section>` per room | `aria-label="Chat room: {roomName}"` | Identifies the active room for screen readers |
| `<article>` per message | Self-contained message block | `aria-labelledby` pointing to author name |
| `<ul>` / `<ol>` for message list | Messages are an ordered list | `aria-live="polite"` for new messages |
| `<form>` for message input | Native submit behavior | `<label>` associated with `<input>` |
| `<output>` for connection status | Live region | `aria-live="assertive"` for disconnection alerts |
| `<time>` for timestamps | `datetime="2026-06-17T14:30:00Z"` | Machine-readable format |

### ARIA Live Regions for Real-Time Chat

```
Region                  | aria-live value  | Behavior
------------------------|------------------|--------------------------
Message list            | polite           | Announces new messages after user idle
Connection status       | assertive        | Immediately announces disconnect
User join/leave         | polite           | Announces room membership changes
Error toasts            | assertive        | Immediately announces errors
```

**Critical**: `aria-live` regions MUST exist in the DOM on initial render (empty). Adding them dynamically after interaction breaks screen readers.

```tsx
// MessageList.tsx — the <ul> is ALWAYS in the DOM
<ul aria-live="polite" aria-label="Messages">
  {messages.map(msg => (
    <li key={msg.id}>
      <article aria-labelledby={`msg-${msg.id}-author`}>
        <span id={`msg-${msg.id}-author`}>{msg.username}</span>
        <p>{msg.content}</p>
        <time dateTime={msg.timestamp}>
          {new Date(msg.timestamp).toLocaleTimeString()}
        </time>
      </article>
    </li>
  ))}
</ul>
```

### Heading Hierarchy

```
h1 — "Chaty" (once per page, in <header>)
h2 — Room name in active <section>
h3 — (optional) section within room, e.g., "Pinned Messages"
h4+ — not used unless a deep content structure exists
```

---

## 3. Component System (components/UI/)

### Atomic Design Architecture

```
components/
├── UI/           <- ATOMS: single-purpose, no business logic
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Text.tsx
│   ├── Title.tsx
│   ├── Anchor.tsx
│   ├── Icon.tsx
│   ├── Select.tsx
│   └── Form.tsx
├── Chat.tsx      <- MOLECULE: composes atoms
├── Room.tsx      <- MOLECULE: composes atoms
└── ...           <- ORGANISMS: pages, layouts
```

### Atom Contract (EVERY atom MUST follow this)

```tsx
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

// 1. Props interface with Readonly<T>, extending native element props
type ButtonProps = Readonly<{
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
}> & ComponentPropsWithoutRef<'button'>;

// 2. Server Component by default (no "use client" unless necessary)
// 3. Use Tailwind classes, never inline styles
export function Button({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-full font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2';
  const variantClasses = {
    primary: 'bg-foreground text-background hover:bg-foreground/90',
    secondary: 'border border-foreground/10 hover:bg-foreground/5',
    ghost: 'hover:bg-foreground/5',
  };

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
```

### Atom Inventory & Conventions

| Atom | Extends | Key Props | Notes |
|------|---------|-----------|-------|
| `Title` | `ComponentPropsWithoutRef<'h1'>` | `as`, `children` | Polymorphic heading: `as` = h1..h6. Defaults to `h2`. |
| `Text` | `ComponentPropsWithoutRef<'p'>` | `size`, `children` | Single `<p>`, no inner divs. `size` = sm|base|lg. |
| `Anchor` | `ComponentPropsWithoutRef<'a'>` | `href` (required), `external` | External links auto-add `target="_blank" rel="noopener noreferrer"`. |
| `Button` | `ComponentPropsWithoutRef<'button'>` | `variant`, `children` | Always `type="button"` by default (not submit). |
| `Input` | `ComponentPropsWithoutRef<'input'>` | `label` (required) | Wraps `<label>` + `<input>` together. |
| `Icon` | `ComponentPropsWithoutRef<'span'>` | `name`, `size` | Renders SVG icon by name. `aria-hidden="true"`. |
| `Select` | `ComponentPropsWithoutRef<'select'>` | `label` (required), `options` | Wraps `<label>` + `<select>`. Options: `{value, label}[]`. |
| `Form` | `ComponentPropsWithoutRef<'form'>` | `action`, `children` | Native `<form>` wrapper. Supports server action via `action={}` prop. No `method` override needed — Next.js handles it. |

### Composition Rules

1. **Atoms NEVER import other atoms** — they are leaf nodes
2. **Molecules import atoms only** — `Chat.tsx` imports `Button`, `Input`, `Text`, etc.
3. **Organisms import molecules and atoms** — `ChatShell.tsx` imports `Chat`, `Room`
4. **Never import from `components/UI/` into `app/` directly** — go through molecules

### Component File Template

```tsx
// components/Example.tsx
import type { ReactNode } from 'react';
import { Button } from '@/components/UI/Button';
import { Text } from '@/components/UI/Text';

type ExampleProps = Readonly<{
  title: string;
  children: ReactNode;
  onAction?: () => void;
}>;

export function Example({ title, children, onAction }: ExampleProps) {
  return (
    <section>
      <header>
        <h2>{title}</h2>
      </header>
      <Text>{children}</Text>
      {onAction && (
        <Button onClick={onAction}>
          Action
        </Button>
      )}
    </section>
  );
}
```

---

## 4. Mobile-First Design

### Breakpoint Strategy (Tailwind CSS 4 defaults)

```
Base (mobile)  ->  sm (640px)  ->  md (768px)  ->  lg (1024px)  ->  xl (1280px)
     ^                ^              ^              ^               ^
  Start here     Large phones    Tablets       Small desktop   Large desktop
  ALL styles      @media query   @media query  @media query    @media query
  without prefix  sm:            md:           lg:             xl:
```

**Rule**: Write styles for mobile FIRST (no prefix), then override with breakpoint prefixes for larger screens.

### Chat Layout per Breakpoint

```
MOBILE (< 768px)                 DESKTOP (>= 768px)
+------------------------+       +----------+---------------------------+
| <header>               |       | <header>                            |
+------------------------+       +----------+---------------------------+
|                        |       | <nav>    | <main>                    |
|    <main>              |       | Room     | +----------------------+  |
|  (full width chat)     |       | list     | | Active Room          |  |
|                        |       | (280px)  | |                      |  |
|                        |       |          | | Messages             |  |
|                        |       |          | +----------------------+  |
+------------------------+       |          | +----------------------+  |
| Message Input          |       |          | | Message Input        |  |
| (fixed bottom)         |       |          | +----------------------+  |
+------------------------+       +----------+---------------------------+
```

```tsx
// ChatShell.tsx — mobile-first layout
export function ChatShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-full md:flex-row">
      {/* Room list: hidden on mobile, sidebar on desktop */}
      <nav className="hidden md:block md:w-72 md:shrink-0 md:border-r">
        <RoomList />
      </nav>

      {/* Chat area: full width on mobile */}
      <main className="flex flex-1 flex-col min-h-0">
        {children}
      </main>

      {/* Mobile room selector: bottom sheet or drawer */}
      <MobileRoomDrawer className="md:hidden" />
    </div>
  );
}
```

### Touch Target Requirements

| Element | Minimum Size | Implementation |
|---------|-------------|----------------|
| Buttons | **44x44px** | `min-h-11 min-w-11` |
| Input fields | **44px height** | `h-11` |
| Room list items | **48px height** | `h-12` for comfortable touch |
| Icon buttons | **44x44px** with padding | `p-2.5` + 24px icon |
| Links in message text | inline + adequate spacing | Ensure `py-1` for tap area |

### Safe Areas (iOS)

```css
/* globals.css — safe area support */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .chat-input-container {
    padding-bottom: env(safe-area-inset-bottom);
  }
  .mobile-header {
    padding-top: env(safe-area-inset-top);
  }
}
```

### Responsive Typography

```css
/* globals.css — fluid type scale */
@theme inline {
  --text-chat-message: 1rem;
  --text-chat-message--line-height: 1.5;
  --text-room-name: clamp(1.125rem, 3vw, 1.5rem);
}
```

---

## 5. UX Patterns for Real-Time Chat

### 5.1 Optimistic UI — Send Message

**Pattern**: Message appears instantly in the UI, server-confirmed version replaces it if different.

```tsx
// ChatClient.tsx — optimistic message sending
'use client';
import { useOptimistic, useState, useRef } from 'react';
import type { Socket } from 'socket.io-client';

type Message = {
  id: string;
  username: string;
  content: string;
  timestamp: string;
  pending?: boolean;
};

export function ChatClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage: Message) => [...state, newMessage]
  );
  const socketRef = useRef<Socket | null>(null);

  async function sendMessage(formData: FormData) {
    const content = formData.get('message') as string;
    if (!content?.trim()) return;

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      username: 'You',
      content,
      timestamp: new Date().toISOString(),
      pending: true,
    };

    addOptimisticMessage(optimistic);

    socketRef.current?.emit('sendMessage', {
      room: activeRoom,
      content,
    });
  }
}
```

### 5.2 Connection State Indicator

Three states: **connected** (green), **connecting** (yellow, pulse), **disconnected** (red).
Use `<output aria-live="assertive">` so screen readers announce disconnections immediately.

```tsx
// ConnectionStatus.tsx
'use client';
import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';

type ConnectionState = 'connected' | 'connecting' | 'disconnected';

const config: Record<ConnectionState, { label: string; css: string }> = {
  connected:    { label: 'Connected',    css: 'text-green-600' },
  connecting:   { label: 'Connecting…', css: 'text-yellow-600 animate-pulse' },
  disconnected: { label: 'Disconnected', css: 'text-red-600' },
};

export function ConnectionStatus({ socket }: { socket: Socket | null }) {
  const [state, setState] = useState<ConnectionState>('connecting');

  useEffect(() => {
    if (!socket) return;
    socket.on('connect', () => setState('connected'));
    socket.on('disconnect', () => setState('disconnected'));
    socket.on('connect_error', () => setState('disconnected'));
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [socket]);

  return (
    <output aria-live="assertive" className={config[state].css}>
      {config[state].label}
    </output>
  );
}
```

### 5.3 Error Handling & Toast Notifications

Listen for server `error` events and display as toast:

```tsx
useEffect(() => {
  if (!socket) return;
  socket.on('error', (data: { message: string; timestamp: string }) => {
    setToasts(prev => [...prev, {
      id: crypto.randomUUID(),
      message: data.message,
      type: 'error'
    }]);
  });
  return () => { socket.off('error'); };
}, [socket]);
```

### 5.4 Loading Skeleton States

| State | Component | Behavior |
|-------|-----------|----------|
| Initial page load | `<MessageHistorySkeleton />` | Show N animated placeholder lines |
| Room switch | `<Suspense>` boundary around room content | Fallback during room load |
| Socket connecting | `<ConnectionStatus>` + dimmed UI | Visual affordance that chat is unavailable |

```tsx
// MessageHistorySkeleton.tsx
export function MessageHistorySkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul aria-busy="true" aria-label="Loading messages">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="animate-pulse flex gap-3 p-4">
          <div className="w-8 h-8 rounded-full bg-foreground/10" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-foreground/10 rounded" />
            <div className="h-3 w-48 bg-foreground/5 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}
```

### 5.5 Auto-Scroll to New Messages

```tsx
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [optimisticMessages]);
```

**Condition**: ONLY auto-scroll if user is already near the bottom (< 150px). If user scrolled up to read history, do NOT yank them.

### 5.6 Empty States

| Context | Empty State |
|---------|-------------|
| No rooms joined | "Join a room to start chatting" with room list prompt |
| Room has no messages | "No messages yet. Say hello!" |
| Room list empty | "No active rooms. Create one to get started." |

---

## 6. Theme System Integration

### Reference to chaty-themes

This skill integrates with the **chaty-themes** skill (created separately). Themes are applied via CSS custom properties consumed through Tailwind CSS 4 `@theme` tokens.

### How Components Consume Theme Colors

```tsx
// Correct: Use Tailwind theme tokens
<button className="bg-foreground text-background">Send</button>

// Wrong: Hardcoded hex values
<button className="bg-[#171717] text-[#ffffff]">Send</button>
```

### Theme-Aware Classes

```css
/* globals.css — theme tokens reference */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

### Theme Switching

Theme switching is handled by `chaty-themes` via `data-theme` attribute on `<html>`:

```html
<html data-theme="midnight">
```

Components are theme-agnostic — they only consume `--color-background`, `--color-foreground`, etc. The actual palette values are defined in `chaty-themes`.

**Do NOT hardcode theme-specific colors in components.**

---

## 7. Server Actions Architecture

### Convention: `actions.ts` per route directory

Every route directory that has server-side logic MUST contain an `actions.ts` file at the **same level as `page.tsx`**:

```
app/
├── welcome/
│   ├── page.tsx        ← UI: form "What's your name?"
│   └── actions.ts      ← 'use server': saveUsername()
├── room/dashboard/
│   ├── page.tsx        ← UI: room list, create room
│   └── actions.ts      ← 'use server': createRoom(), deleteRoom()
└── chat/[roomId]/
    ├── page.tsx        ← UI: real-time chat
    └── actions.ts      ← 'use server': fetchMessageHistory()
```

### Gateway Pattern — `app/page.tsx`

The root `app/page.tsx` is **NOT a dashboard**. It is a **gateway** that checks auth state and redirects. It NEVER renders UI:

```tsx
// app/page.tsx — GATEWAY (Server Component, never renders UI)
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function Gateway() {
  const cookieStore = cookies();
  const username = cookieStore.get('username')?.value;

  if (!username) {
    redirect('/welcome');
  }

  redirect('/room/dashboard');
}
```

### Cookie-Based Auth Flow (pre-login phase)

Since there is no login/register system yet, auth is session-based via cookies:

```
User lands at /
      |
      v
page.tsx reads cookie 'username'
      |
   ❌ not found  ─→ /welcome  →  form asks name  →  actions.ts saves cookie  →  redirect /room/dashboard
   ✅ found      ─→ redirect /room/dashboard
```

### Server Action Template

```tsx
// welcome/actions.ts
'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';

// 1. Schema — zod for lightweight TypeScript-native validation
const UsernameSchema = z.object({
  username: z
    .string()
    .min(2, 'Minimum 2 characters')
    .max(20, 'Maximum 20 characters'),
});

// 2. Result type — unified success/error contract
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

// 3. Server action — receives FormData, validates, acts
export async function saveUsername(
  formData: FormData
): Promise<ActionResult> {
  const parsed = UsernameSchema.safeParse({
    username: formData.get('username'),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const cookieStore = cookies();
  cookieStore.set('username', parsed.data.username, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    sameSite: 'lax',
  });

  return { success: true };
}
```

### Server Action Rules

| Rule | Rationale |
|------|-----------|
| `'use server'` at file top | Marks all exports as server actions |
| **NEVER** Socket.IO in `actions.ts` | Server actions run on server/RSC runtime — Socket.IO is client-only |
| Validate with zod BEFORE processing | Fail fast, return typed errors |
| Use `ActionResult<T>` consistently | Client knows shape of every response |
| `cookies().set()` with `httpOnly: true` | Username cookie readable by server but not JavaScript |
| `cookies().get()` in `page.tsx` gateways | Check auth before rendering or redirecting |
| Import from `@/lib/services/*` not raw logic | **Dependency Inversion** — actions depend on abstractions, not implementation |

### Client-Side Consumption

```tsx
// welcome/page.tsx — Client Component consuming server action
'use client';
import { useActionState } from 'react';
import { saveUsername } from './actions';
import { useRouter } from 'next/navigation';

export default function WelcomePage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: unknown, formData: FormData) => {
      const result = await saveUsername(formData);
      if (result.success) {
        router.push('/room/dashboard');
      }
      return result;
    },
    null
  );

  return (
    <form action={formAction}>
      <input name="username" required minLength={2} maxLength={20} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Guardando...' : 'Entrar'}
      </button>
      {state && !state.success && <p role="alert">{state.error}</p>}
    </form>
  );
}
```

---

## 8. Directory Structure & Routing

### Full Route Tree

```
frontend/
├── app/                          ← 🚏 App Router (ONLY routes and layouts)
│   ├── layout.tsx                ← Root layout: <html>, metadata, fonts
│   ├── page.tsx                  ← 🚪 GATEWAY: cookie check → redirect
│   │
│   ├── welcome/                  ← Onboarding (pre-auth)
│   │   ├── page.tsx              ← Form "What's your name?"
│   │   └── actions.ts            ← 'use server': saveUsername → cookie
│   │
│   ├── room/                     ← 🏠 Domain: room management
│   │   ├── layout.tsx            ← Shared: header with username, nav
│   │   └── dashboard/            ← Dashboard post-login
│   │       ├── page.tsx          ← Room list, create room, active rooms
│   │       └── actions.ts       ← createRoom, deleteRoom, getRooms
│   │
│   ├── chat/                     ← 💬 Domain: real-time chat
│   │   ├── layout.tsx            ← Shared: sidebar rooms + chat pane
│   │   └── [roomId]/             ← Dynamic route per room
│   │       ├── page.tsx          ← ChatClient (Socket.IO lives HERE)
│   │       └── actions.ts       ← fetchMessageHistory (future)
│   │
│   └── profile/                  ← 👤 Domain: user profile
│       ├── layout.tsx            ← Shared: profile nav
│       ├── page.tsx              ← Own profile view
│       └── settings/             ← Profile editing
│           ├── page.tsx
│           └── actions.ts       ← updateProfile, uploadAvatar
│
├── lib/                          ← 🔧 Shared layer (NOT a route!)
│   ├── services/                 ← Pure business logic
│   │   ├── user.service.ts       ← getUsername(), requireUsername()
│   │   ├── room.service.ts       ← createRoom(), listRooms()
│   │   └── chat.service.ts       ← fetchMessageHistory()
│   ├── schemas/                  ← Zod validation schemas
│   │   ├── user.schema.ts        ← username: z.string().min(2).max(20)
│   │   ├── room.schema.ts
│   │   └── message.schema.ts
│   └── types/                    ← Shared TypeScript types
│       └── actions.ts            ← ActionResult<T> generic
│
├── components/                   ← 🧩 React components
│   ├── UI/                       ← Atoms (presentational, no business logic)
│   ├── Chat.tsx                  ← Molecules
│   └── Room.tsx
│
└── skills/                       ← 📚 Agent skills (this directory)
```

### Key Principles

| Principle | Rule |
|-----------|------|
| `app/` = only routes | Every folder becomes a URL segment. No `lib/` or `utils/` inside `app/`. |
| `lib/` = outside `app/` | Shared services, schemas, types. Not accessible via URL. |
| One domain per directory | `room/`, `chat/`, `profile/` are bounded contexts |
| `actions.ts` co-located with `page.tsx` | Server actions live in the route directory they serve |
| Gateway `page.tsx` at root | Checks auth, never renders UI, only `redirect()` |

### Boundary System (SOLID — Single Responsibility)

```
app/welcome/actions.ts → lib/services/user.service.ts → cookies API
app/room/dashboard/actions.ts → lib/services/room.service.ts → in-memory/DB
app/chat/[roomId]/actions.ts → lib/services/chat.service.ts → DB (future)

Each actions.ts:
  1. Receives formData
  2. Validates with zod schema (from lib/schemas/)
  3. Delegates to lib/services/
  4. Returns ActionResult<T>
```

---

## 9. SOLID Principles Applied

### S — Single Responsibility Principle

**Each module has ONE reason to change.**

| Module | Single Responsibility |
|--------|----------------------|
| `actions.ts` | Handles ONE domain entity (users, rooms, messages) |
| `lib/services/*.ts` | Pure business logic, no HTTP/Next.js concerns |
| `components/UI/*` | Pure presentation, no state, no side effects |
| `page.tsx` (gateway) | Auth check + redirect, never renders UI |

```tsx
// Anti-pattern (violates SRP): page.tsx does everything
export default function Page() {
  const name = cookies().get('username')?.value; // auth
  const rooms = await fetch('/api/rooms');       // data fetching
  const socket = io('...');                      // WebSocket
  return <div>...</div>;                         // UI
}

// Correct: Each concern in its own module
export default function Gateway() {
  const name = cookies().get('username')?.value;
  if (!name) redirect('/welcome');
  redirect('/room/dashboard');
}
```

### O — Open/Closed Principle

**Components are open for extension, closed for modification.**

- Extend via `children`, `className`, slots — never modify source
- Variants handled via props map, not `if/else` chains in the component

```tsx
// Correct: closed for modification, open via className
export function Button({ children, className = '', ...props }: ButtonProps) {
  return (
    <button className={`base-styles ${className}`} {...props}>
      {children}
    </button>
  );
}

// Usage: extension without modification
<Button className="bg-red-500 hover:bg-red-600">Delete</Button>
```

### L — Liskov Substitution Principle

**Subtypes must be substitutable for their base types.**

- All component atoms extend `ComponentPropsWithoutRef<"nativeElement">`
- Any `<Button>` must work anywhere a `<button>` works

```tsx
// Correct: Button IS a <button>
type ButtonProps = Readonly<{
  variant?: 'primary' | 'secondary' | 'ghost';
}> & ComponentPropsWithoutRef<'button'>;

// Liskov check: both are valid
<button onClick={handler}>Click</button>
<Button onClick={handler}>Click</Button>
```

### I — Interface Segregation Principle

**No component should depend on props it doesn't use.**

- Split fat props into focused interfaces
- Server actions receive only required fields

```tsx
// Anti-pattern: fat props
type MessageProps = {
  id: string; content: string; author: string; avatar: string;
  timestamp: Date; roomId: string; isPinned: boolean; isEdited: boolean;
  reactions: Reaction[]; // 🔴 Most components don't need all of this
};

// Correct: segregated interfaces
type MessageContentProps = { content: string };
type MessageMetaProps = { author: string; timestamp: Date };
type MessageActionsProps = { onPin?: () => void; onEdit?: () => void };
```

### D — Dependency Inversion Principle

**Depend on abstractions, not concretions.**

| Layer | Depends on | Does NOT depend on |
|-------|-----------|-------------------|
| `page.tsx` | `actions.ts` interface | Implementation details |
| `actions.ts` | `lib/services/*` (abstraction) | Raw `cookies()`, `fetch()` directly |
| `components/` | Props interface (abstraction) | `io()`, `cookies()`, `fetch()` |
| `lib/services/` | `cookies()`, `fetch()` | Nothing higher |

```tsx
// Correct: ChatClient depends on socket abstraction, not io() directly
type ChatClientProps = {
  socket: Socket | null;  // Abstraction — injected via hook
  username: string;       // From cookie, injected via prop
};

export function ChatClient({ socket, username }: ChatClientProps) {
  // Uses socket.on() — doesn't care how socket was created
}

// The hook is the inversion point
export function useChatSocket(username: string) {
  // Creates io(), manages lifecycle — implementation detail
  return socketRef.current;
}
```

---

## Component Checklist (Pre-Code Review)

### UI Components

Before writing ANY new component, verify:



- [ ] Semantic HTML element chosen over `<div>`/`<span>`
- [ ] `<form>` used for inputs with native onSubmit
- [ ] `aria-label` on landmark regions
- [ ] `aria-live` on dynamic content regions
- [ ] Touch targets >= 44px
- [ ] Mobile-first base styles, no desktop-only defaults
- [ ] Tailwind theme tokens used, no hardcoded hex
- [ ] `Readonly<T>Props` interface exported
- [ ] No `'use client'` on UI atoms
- [ ] No Socket.IO import in Server Components
- [ ] `useOptimistic` for message sending
- [ ] Error boundaries for Socket.IO failures
- [ ] `<Suspense>` for async data sections
- [ ] Empty states for all dynamic lists

### Server Actions

- [ ] `actions.ts` co-located with `page.tsx` at same directory level
- [ ] `'use server'` directive at top of file
- [ ] Zod schema validation before processing input
- [ ] `ActionResult<T>` return type used consistently
- [ ] NEVER import Socket.IO or browser APIs in server actions
- [ ] `cookies().set()` with `httpOnly: true` for auth cookies
- [ ] Gateway `page.tsx` at root only does `redirect()`, never renders UI

### SOLID Principles

- [ ] **S**: Each file has ONE responsibility (actions ≠ UI ≠ services)
- [ ] **O**: Components extended via `children`/`className`, not source edits
- [ ] **L**: All atom components extend `ComponentPropsWithoutRef<"nativeElement">`
- [ ] **I**: Props interfaces are minimal and focused, not fat blobs
- [ ] **D**: `actions.ts` depend on `@/lib/services/*`, not raw `fetch()`/`cookies()`
- [ ] **D**: `ChatClient` receives `socket` by prop, not `io()` internally

---

## Commands

```bash
cd frontend
npm run dev      # Start Next.js dev server (port 3000)
npm run build    # Production build
npm run lint     # ESLint check
```

## Resources

- **Backend docs**: [../../docs/websocketWorkflow.md](../../docs/websocketWorkflow.md)
- **Socket.IO protocol**: [../../docs/websocketWorkflow.md](../../docs/websocketWorkflow.md)
