# Chaty - Real-Time Chat Application

> **Version:** 1.0.0
> **Date:** June 2026
> **Stack:** NestJS 11 + TypeScript + Socket.IO + Next.js (planned)

---

## Project Vision

Chaty is a real-time chat application for 2+ users. The backend uses **NestJS** with **Socket.IO** for WebSocket communication. The frontend will be built with **Next.js**, connecting through the browser Socket.IO client for live messaging.

| Layer           | Technology                         | Status     |
| --------------- | ---------------------------------- | ---------- |
| **Backend**     | NestJS 11 + TypeScript + Socket.IO | Done       |
| **Frontend**    | Next.js 15 (planned)               | Upcoming   |
| **Real-time**   | Socket.IO via @nestjs/websockets   | Working    |
| **Dev tooling** | Nest CLI, Jest, ESLint + Prettier  | Configured |

---

## System Architecture

```
     Frontend (Next.js)              Backend (NestJS + Socket.IO)
    +-----------------------+     +-------------------------------+
    |  pages/chat.tsx        | io  |  src/                         |
    |  hooks/useSocket.ts    |<--->|  +-- main.ts                  |
    |  components/ChatBox    |     |  +-- app.module.ts            |
    |  components/MessageList|     |  +-- app.controller.ts        |
    +-----------------------+     |  +-- rooms/                 |
                                  |  |   +-- rooms.module.ts   |
                                  |  |   +-- rooms.gateway.ts   |
                                  |  |   +-- rooms.service.ts   |
                                  |  |   +-- dto/               |
                                  |  |   +-- filters/           |
                                  +-------------------------------+
```

## Socket.IO Chat Flow

```
CLIENT A                      SERVER                       CLIENT B
---------                     ------                       ----------
   |                            |                             |
   |  1. io("ws://host:3000/rooms")                          |
   | -------------------------> |                             |
   |                            |  2. handleConnection()      |
   |  3. emit("joinRoom")       |                             |
   | -------------------------> |                             |
   |                            |  4. join room + broadcast   |
   |                            |  5. emit("userJoined")      |
   |                            | ---------------------------->|
   |  6. emit("sendMessage")    |                             |
   | -------------------------> |                             |
   |                            |  7. validate + broadcast    |
   |                            |  8. emit("newMessage")      |
   |                            | ---------------------------->|
   |  9. disconnect             |                             |
   | --------------------------> |                             |
   |                            | 10. cleanup + userLeft      |
```

---

## Project Structure

```

Chaty/
|-- README.md This document
|-- backend/ NestJS + Socket.IO server
| |-- src/
| | |-- main.ts Entry point (NestFactory + IoAdapter)
| | |-- app.module.ts Root module
| | |-- app.controller.ts GET / health check
| | |-- app.service.ts
| | |-- rooms/ Chat rooms feature module
| | | |-- rooms.module.ts Module definition
| | | |-- rooms.gateway.ts Socket.IO gateway (joinRoom, sendMessage, leaveRoom, getRooms)
| | | |-- rooms.service.ts In-memory room state manager
| | | |-- rooms.gateway.spec.ts Unit tests (Jest)
| | | |-- dto/
| | | | |-- join-room.dto.ts class-validator DTO
| | | | |-- send-message.dto.ts
| | | | |-- leave-room.dto.ts
| | | |-- filters/
| | | |-- ws-exception.filter.ts WsException handler
| | |-- test/
| |-- package.json
| |-- tsconfig.json
| |-- nest-cli.json
|-- frontend/ Next.js (planned)

```

---

## Tech Stack

### Backend

| Component  | Library                                  | Purpose                              |
| ---------- | ---------------------------------------- | ------------------------------------ |
| Framework  | @nestjs/core 11.x                        | Module-based backend framework       |
| CLI        | @nestjs/cli 11.x                         | Generate, build, start commands      |
| HTTP       | @nestjs/platform-express                 | Express adapter                      |
| WebSocket  | @nestjs/websockets 11.x                  | Gateway decorators + lifecycle hooks |
| Transport  | @nestjs/platform-socket.io 11.x          | Socket.IO server adapter             |
| Validation | class-validator 0.15 + class-transformer | DTO validation with decorators       |
| DI         | reflect-metadata + rxjs                  | NestJS dependency injection core     |
| Language   | typescript 5.7                           | Static typing                        |
| Testing    | Jest 30 + @nestjs/testing                | Unit + e2e testing                   |
| Linting    | ESLint 9 (flat config) + Prettier 3.4    | Code quality                         |

### Frontend (planned)

| Component | Library                | Purpose               |
| --------- | ---------------------- | --------------------- |
| Framework | Next.js 15             | SSR + routing + React |
| Language  | TypeScript             | Static typing         |
| WebSocket | Socket.IO Client       | Real-time connection  |
| Styling   | Tailwind CSS (planned) | Utility-first CSS     |

---

## Getting Started

### Prerequisites

- Node.js >= 22
- npm >= 9

### Backend

```bash
cd backend
npm install
npm run start:dev     # Development with hot reload
npm run build          # Compile TypeScript
npm run start:prod     # Production

# Socket.IO namespace: /rooms
# HTTP: http://localhost:3000
# WebSocket: connect to http://localhost:3000/rooms (Socket.IO client)
```

---

## Socket.IO Protocol

**Namespace:** `/rooms`

### Client to Server (emit)

| Event         | DTO                                | Description              |
| ------------- | ---------------------------------- | ------------------------ |
| `joinRoom`    | `JoinRoomDto { room, username }`   | Join a chat room         |
| `sendMessage` | `SendMessageDto { room, content }` | Send a message to a room |
| `leaveRoom`   | `LeaveRoomDto { room }`            | Leave a chat room        |
| `getRooms`    | (none)                             | Get list of active rooms |

### Server to Client (broadcast/emit)

| Event        | Payload                            | Description                  |
| ------------ | ---------------------------------- | ---------------------------- |
| `userJoined` | `{ username, timestamp }`          | New user joined the room     |
| `userLeft`   | `{ username, timestamp }`          | User left the room           |
| `roomUsers`  | `{ room, users[] }`                | Updated user list for a room |
| `newMessage` | `{ username, content, timestamp }` | Broadcast message to room    |

### Message Format

```json
{
  "username": "Dan",
  "content": "Hello!",
  "timestamp": "2026-06-11T12:00:00.000Z"
}
```

---

## Architectural Decisions

| Decision                             | Rationale                                                            |
| ------------------------------------ | -------------------------------------------------------------------- |
| NestJS over Express/Fastify          | Module system, DI, decorators, Gateway abstraction for WebSockets    |
| Socket.IO over raw WebSocket         | Auto-reconnect, rooms, namespaces, fallback to HTTP long-polling     |
| Feature-based module structure       | Each domain (rooms) is a self-contained module with DTOs and filters |
| class-validator for DTOs             | Declarative validation on gateway inputs via ValidationPipe          |
| In-memory state for MVP              | Simple, no DB. Migrate to SQLite when needed                         |
| WsExceptionFilter for gateway errors | Centralized WebSocket error handling, consistent error format        |

### Why Next.js for the frontend

- Built-in API routes for SSR/proxy if needed
- File-based routing reduces boilerplate
- React Server Components for fast initial load
- Same TypeScript stack across fullstack
- Vercel deployment with zero config

---

## Testing

```bash
npm test                        # All unit tests
npm run test:e2e                # E2E tests
npm run test:cov                # Coverage report
```

---

## Roadmap

| Phase | Feature                                    | Status  |
| ----- | ------------------------------------------ | ------- |
| 0     | Fix dev environment + clean scaffold       | Done    |
| 1     | Socket.IO gateway with echo handler        | Done    |
| 2     | RoomsService: rooms, join/leave, broadcast | Done    |
| 3     | Frontend: Next.js + Socket.IO client       | Planned |
| 4     | Authentication: JWT + user sessions        | Planned |
| 5     | Message persistence: SQLite or PostgreSQL  | Planned |
| 6     | Private rooms + DM                         | Planned |
| 7     | Typing indicators, read receipts           | Planned |

---

## References

- [NestJS Documentation](https://docs.nestjs.com/)
- [@nestjs/websockets — Gateways](https://docs.nestjs.com/websockets/gateways)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Socket.IO Client API](https://socket.io/docs/v4/client-api/)
- [Next.js Documentation](https://nextjs.org/docs)
