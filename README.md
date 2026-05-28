# Chaty - Real-Time Chat Application

> **Version:** 1.0.0
> **Date:** May 2026
> **Stack:** Fastify 5.x + TypeScript + WebSocket + Next.js (planned)

---

## Project Vision

Chaty is a real-time chat application for 2+ users. The backend uses **Fastify** with native **WebSocket** support via the official plugin. The frontend will be built with **Next.js**, connecting through the browser WebSocket API for live messaging.

| Layer | Technology | Status |
|-------|-----------|--------|
| **Backend** | Fastify 5 + TypeScript + @fastify/websocket | Done |
| **Frontend** | Next.js 15 (planned) | Upcoming |
| **Real-time** | WebSocket (ws) via @fastify/websocket | Echo working |
| **Dev tooling** | tsx watch, tsc, Node.js test runner | Configured |

---

## System Architecture

```
     Frontend (Next.js)             Backend (Fastify + WS)
    +-----------------------+     +---------------------------+
    |  pages/chat.tsx        | WSS |  src/                    |
    |  hooks/useWebSocket.ts |<--->|  +-- server.ts           |
    |  components/ChatBox    |     |  +-- app.ts              |
    |  components/MessageList|     |  |   +-- websocket.ts    |
    +-----------------------+     |  |   +-- sensible.ts    |
                               |  +-- routes/            |
                               |  |   +-- root.ts        |
                               |  |   +-- chat/          |
                               |  |       +-- index.ts   |
                               |  +-- services/          |
                               |      +-- chat.service.ts|
                               +---------------------------+|
```

---

## WebSocket Chat Flow

```
CLIENT A                     SERVER                      CLIENT B
---------                     ------                      ----------
   |                            |                            |
   |  1. ws://host:3000/chat    |                            |
   | -------------------------> |                            |
   |                            |  2. register client        |
   |  3. send message           |                            |
   | -------------------------> |                            |
   |                            |  4. parse + validate       |
   |                            |  5. broadcast to all       |
   |                            | --------------------------->|
   |                            |   6. receive message       |
   |  7. close                  |                            |
   | --------------------------> |                            |
   |                            |  8. cleanup client         |
```

---

## Project Structure

```
Chaty/
|-- README.md                        This document
|-- backend/                          Fastify + WebSocket server
|   |-- src/
|   |   |-- server.ts                Entry point
|   |   |-- app.ts                   Root plugin (autoload)
|   |   |-- plugins/                 Infrastructure (autoloaded)
|   |   |   |-- websocket.ts         Registers @fastify/websocket
|   |   |   |-- sensible.ts          HTTP error utilities
|   |   |   |-- support.ts           Example decorator
|   |   |-- routes/                  Route plugins (autoloaded)
|   |   |   |-- root.ts              GET / health check
|   |   |   |-- chat/                Prefixed as /chat
|   |   |       |-- index.ts         HTTP + WebSocket handlers
|   |   |-- services/                Business logic (pure TS)
|   |       |-- chat.service.ts      Room manager
|   |-- test/
|   |-- docs/
|   |   |-- architecture.md          Detailed backend architecture
|   |-- package.json
|   |-- tsconfig.json
|-- frontend/                         Next.js (planned)
```


---

## Tech Stack

### Backend

| Component | Library | Purpose |
|-----------|---------|---------|
| Framework | fastify 5.x | HTTP server + plugin system |
| CLI | fastify-cli 7.x | Boot, test helpers |
| WebSocket | @fastify/websocket | Native WS over HTTP |
| Autoload | @fastify/autoload 6.x | Auto-discover plugins |
| Errors | @fastify/sensible 6.x | Semantic HTTP errors |
| Encapsulation | fastify-plugin 5.x | Cross-context decorators |
| Language | typescript 6.x | Static typing |
| Dev runner | tsx 4.x | Watch mode + TS execution |
| Testing | node:test + c8 | Unit/integration + coverage |

### Frontend (planned)

| Component | Library | Purpose |
|-----------|---------|---------|
| Framework | Next.js 15 | SSR + routing + React |
| Language | TypeScript | Static typing |
| WebSocket | Browser WebSocket API | Real-time connection |
| Styling | Tailwind CSS (planned) | Utility-first CSS |

---

## Getting Started

### Prerequisites

- Node.js >= 22
- npm >= 9

### Backend

```bash
cd backend
npm install
npm run dev          # Development with hot reload
npm run build:ts     # Compile TypeScript
npm start            # Production
```

Server starts at **http://localhost:3000**.

### Verify

```bash
curl http://localhost:3000/           # Health check
curl http://localhost:3000/chat       # Chat HTTP endpoint
# WebSocket: connect to ws://localhost:3000/chat (Postman or browser)
```

---

## WebSocket Protocol

### Client to Server

| Event | Payload | Description |
|-------|---------|-------------|
| message | join payload | Join a chat room |
| message | message payload | Send a message |
| close | -- | Disconnect |

### Server to Client

| Event | Payload | Description |
|-------|---------|-------------|
| message | joined event | User joined room |
| message | message event | Broadcast message |
| message | left event | User left room |
| message | users event | Online users list |
| message | error event | Error notification |

### Message Format

```json
{
  "type": "message",
  "roomId": "general",
  "username": "Dan",
  "content": "Hello!",
  "timestamp": 1716939600000
}
```

---

## Architectural Decisions

| Decision | Rationale |
|-----------|-----------|
| Fastify over Express | Plugin system, schema validation, TS-native |
| @fastify/websocket over socket.io | Lighter, official plugin, same port |
| Hybrid NestJS-like structure | Autoload + service layer = clarity + speed |
| tsx over tsc -w | chokidar works on Windows |
| Services as plain classes | Testable without server, replaceable |
| In-memory state for MVP | Simple, no DB. Migrate to SQLite when needed |

### Why Next.js for the frontend

- Built-in API routes for SSR/proxy if needed
- File-based routing reduces boilerplate
- React Server Components for fast initial load
- Same TypeScript stack across fullstack
- Vercel deployment with zero config

---

## Testing

```bash
npm test                                   # All tests
node --test test/routes/chat.test.ts       # Chat only
```

---

## Roadmap

| Phase | Feature | Status |
|-------|--------|--------|
| 0 | Fix dev environment + clean scaffold | Done |
| 1 | WebSocket echo handler | Done |
| 2 | ChatService: rooms, join/leave, broadcast | In progress |
| 3 | Chat HTTP endpoints: rooms list, status | Planned |
| 4 | Frontend: Next.js + WebSocket client | Planned |
| 5 | Authentication: JWT + user sessions | Planned |
| 6 | Message persistence: SQLite | Planned |
| 7 | Private rooms + DM | Planned |

---

## References

- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [@fastify/websocket](https://github.com/fastify/fastify-websocket)
- [WebSocket API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Next.js Documentation](https://nextjs.org/docs)
- [Backend Architecture Details](backend/docs/architecture.md)