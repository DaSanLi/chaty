# Chaty — WebSocket Workflow & Event Reference

> Documentación completa del sistema de comunicación en tiempo real.
> Stack: NestJS 11 + Socket.IO v4 + `@nestjs/platform-socket.io`.

---

## 📋 Tabla de Contenido

1. [Visión General de Arquitectura](#1-visión-general-de-arquitectura)
2. [Diagrama de Arquitectura](#2-diagrama-de-arquitectura)
3. [Conexión al Servidor](#3-conexión-al-servidor)
4. [Modelo de Clases (UML)](#4-modelo-de-clases-uml)
5. [Eventos Cliente → Servidor](#5-eventos-cliente--servidor)
6. [Eventos Servidor → Cliente](#6-eventos-servidor--cliente)
7. [Diagrama de Secuencia (UML)](#7-diagrama-de-secuencia-uml)
8. [Diagrama de Estados del Cliente](#8-diagrama-de-estados-del-cliente)
9. [Manejo de Errores](#9-manejo-de-errores)
10. [Postman — Guía Rápida](#10-postman--guía-rápida)
11. [Referencia Rápida (Cheatsheet)](#11-referencia-rápida-cheatsheet)

---

## 1. Visión General de Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Navegador   │  │  Node.js     │  │   Postman    │       │
│  │ socket.io.js │  │ socket.io-cl │  │  Socket.IO   │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
     Socket.IO           Socket.IO          Socket.IO
     (EIO v4)            (EIO v4)           (EIO v4)
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                    ws://localhost:3000
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                        BACKEND                               │
│                            │                                 │
│  ┌─────────────────────────▼────────────────────────────┐   │
│  │                  main.ts                             │   │
│  │  NestFactory.create(AppModule) + IoAdapter          │   │
│  │  app.useWebSocketAdapter(new IoAdapter(app))        │   │
│  │  app.listen(process.env.PORT ?? 3000)               │   │
│  └─────────────────────────┬────────────────────────────┘   │
│                            │                                 │
│  ┌─────────────────────────▼────────────────────────────┐   │
│  │              RoomsModule                             │   │
│  │  ┌─────────────────────┐  ┌───────────────────────┐ │   │
│  │  │   RoomsGateway       │  │   RoomsService        │ │   │
│  │  │   @WebSocketGateway  │──│   Map<room, RoomInfo> │ │   │
│  │  │   namespace: /rooms  │  │   in-memory state     │ │   │
│  │  │                     │  └───────────────────────┘ │   │
│  │  │ Event Handlers:      │                           │   │
│  │  │  · joinRoom          │                           │   │
│  │  │  · sendMessage       │                           │   │
│  │  │  · leaveRoom         │                           │   │
│  │  │  · getRooms          │                           │   │
│  │  │                     │                           │   │
│  │  │ Lifecycle Hooks:     │                           │   │
│  │  │  · afterInit()       │                           │   │
│  │  │  · handleConnection()│                           │   │
│  │  │  · handleDisconnect()│                           │   │
│  │  └─────────────────────┘                           │   │
│  └────────────────────────────────────────────────────┘   │
│                            │                                 │
│  ┌─────────────────────────▼────────────────────────────┐   │
│  │              WsExceptionFilter                       │   │
│  │  @Catch() — todas las excepciones                   │   │
│  │  WsException   → client.emit('error', {message})    │   │
│  │  Unexpected    → client.emit('error', {message})    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 🔑 Principios Clave

| Principio | Explicación |
|-----------|------------|
| **Broadcast sin eco** | `client.to(room).emit()` excluye al emisor. El frontend usa optimistic UI para mostrar acciones propias. |
| **Namespace scoping** | Socket.IO aísla rooms por namespace. `/rooms` es independiente de `/` (raíz). |
| **Estado volátil** | `RoomsService` usa `Map<string, RoomInfo>` en memoria. Se pierde al reiniciar el servidor. |
| **Broadcast en desconexión** | `handleDisconnect` usa `namespaceServer.to(room)` en lugar de `client.to()` porque el socket ya se está cerrando. |

### 📦 Stack Técnico

| Componente | Versión | Rol |
|-----------|---------|-----|
| NestJS | 11.x | Framework backend |
| `@nestjs/platform-socket.io` | 11.1.26 | Adaptador Socket.IO |
| `@nestjs/websockets` | 11.1.26 | Decoradores + lifecycle |
| Socket.IO (server) | v4 (via adapter) | Motor de WebSocket |
| `socket.io-client` | latest | Cliente para testing |
| `class-validator` | 0.15.1 | Validación de DTOs |

---

## 2. Diagrama de Arquitectura

### 📡 Flujo de Broadcast

```
┌──────────────────────────────────────────────────────────────────┐
│                    FLUJO DE BROADCAST                            │
│                                                                  │
│  ┌─────────┐                        ┌─────────┐                  │
│  │Cliente A│                        │Cliente B│                  │
│  │(Angela) │                        │(Daniel) │                  │
│  └────┬────┘                        └────┬────┘                  │
│       │                                  │                       │
│       │ ① emit('joinRoom',              │                       │
│       │    {room:"lobby",               │                       │
│       │     username:"Angela"})         │                       │
│       │──────────────────────────────►  │                       │
│       │         ┌──────────────┐        │                       │
│       │         │   SERVIDOR   │        │                       │
│       │         │              │        │                       │
│       │         │ client.join  │        │                       │
│       │         │  ("lobby")   │        │                       │
│       │         │              │        │                       │
│       │         │ client.to    │        │                       │
│       │         │  ("lobby")   │        │                       │
│       │         │  .emit(      │        │                       │
│       │         │   "userJoined"───►   │ ② recibe userJoined  │
│       │         │   "roomUsers" ───►   │    {username:"Angela"} │
│       │         └──────────────┘        │                       │
│       │                                  │                       │
│       │                                  │ ③ emit('sendMessage', │
│       │                                  │    {room:"lobby",     │
│       │                                  │     content:"Hola!"}) │
│       │         ┌──────────────┐        │                       │
│ ④ recibe        │              │◄───────│                       │
│   newMessage ◄──│ client.to    │        │                       │
│   {username:    │  ("lobby")   │        │                       │
│    "Daniel",    │  .emit(      │        │                       │
│    content:     │   "newMessage")       │                       │
│    "Hola!"}     │              │        │                       │
│       │         └──────────────┘        │                       │
└───────┼──────────────────────────────────┼───────────────────────┘
        │                                  │
        ▼                                  ▼
   ┌─────────┐                        ┌─────────┐
   │  Muestra │                        │  Muestra │
   │ "Daniel: │                        │ "Angela  │
   │  Hola!"  │                        │  se unió"│
   └─────────┘                        └─────────┘
```

### 🌐 Namespace Isolation — Dónde y por qué conectarse

Socket.IO divide el servidor en **namespaces** — canales de comunicación independientes entre sí.
Nuestro gateway está registrado en el namespace `/rooms`. Por diseño, todo el tráfico de chat
debe ocurrir dentro de ese namespace.

```
┌─────────────────────────────────────────────────────────────┐
│                    Socket.IO Server                          │
│                                                             │
│  ┌───────────────────┐       ┌───────────────────┐          │
│  │  Namespace "/"    │       │  Namespace        │          │
│  │    (raíz)         │       │   "/rooms"        │          │
│  │                   │       │                   │          │
│  │  · HTTP + WS      │       │  · Chat Gateway   │          │
│  │    sin usar       │       │                   │          │
│  │                   │       │  Room "lobby" ───►│          │
│  │  Room "lobby"     │       │    Cliente A ✅   │          │
│  │    (aislada,      │       │    Cliente B ✅   │          │
│  │     no se mezcla) │       │                   │          │
│  └───────────────────┘       └───────────────────┘          │
│           ↑                           ↑                     │
│           │                           │                     │
│    NO conectarse aquí          CONECTARSE aquí              │
│    http://localhost:3000       http://localhost:3000/rooms   │
└─────────────────────────────────────────────────────────────┘
```

**¿Por qué en `/rooms`?**

| Razón | Explicación |
|-------|------------|
| **Gateway mapeado ahí** | `@WebSocketGateway({ namespace: 'rooms' })` — el servidor solo procesa eventos de chat en este namespace |
| **Aislamiento** | Los eventos de `/rooms` (chat) no interfieren con otros posibles usos del namespace raíz (HTTP, health checks, futuros features) |
| **Broadcast automático** | `client.to(room).emit()` emite dentro del namespace del socket — el cliente hereda el scope de donde se conectó |
| **Escalabilidad** | Permite agregar otros namespaces en el futuro (`/admin`, `/notifications`) sin mezclar lógica |

**URL de conexión del cliente:**
```
http://localhost:3000/rooms
       └────┬────┘ └─┬─┘
         host     namespace
```

---

## 3. Conexión al Servidor

### 🔌 Endpoint

| Parámetro | Valor |
|-----------|-------|
| **URL** | `http://localhost:3000` (o `http://127.0.0.1:3000` si `localhost` falla) |
| **Namespace** | `/rooms` |
| **Protocolo** | Socket.IO (Engine.IO v4 sobre WebSocket) |
| **CORS** | `origin: '*'` (abierto en desarrollo) |
| **Transporte** | `websocket` (recomendado) |
| **Puerto** | `3000` (configurable vía `PORT` env var) |

### 📡 Handshake de Socket.IO (Engine.IO v4)

```
Cliente                              Servidor
   │                                     │
   │ ① GET /socket.io/?EIO=4             │
   │    &transport=polling                │
   │────────────────────────────────────►│
   │◄────────────────────────────────────│
   │  { sid: "abc123", upgrades:         │
   │    ["websocket"], ... }              │
   │                                     │
   │ ② GET /socket.io/?EIO=4             │
   │    &transport=websocket             │
   │    &sid=abc123                      │
   │    Upgrade: websocket               │
   │────────────────────────────────────►│
   │◄────────────────────────────────────│
   │  101 Switching Protocols            │
   │                                     │
   │ ③ "2/rooms,"  ← namespace connect   │
   │────────────────────────────────────►│
   │◄────────────────────────────────────│
   │  "2/rooms,"     ← confirmado        │
   │                                     │
   │  ✅ Conectado al namespace /rooms   │
```

> ⚠️ **Socket.IO NO es WebSocket crudo (RFC 6455).** Conectar con `new WebSocket()` directamente falla porque falta el handshake Engine.IO. Usa siempre `socket.io-client`.

### 💻 Ejemplos de Conexión

**Node.js:**
```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/rooms', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Conectado:', socket.id);
});
```

**Navegador:**
```html
<script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
<script>
  const socket = io('http://localhost:3000/rooms');
</script>
```

---

## 4. Modelo de Clases (UML)

```
┌──────────────────────────────────────────────────────┐
│                   RoomsGateway                       │
├──────────────────────────────────────────────────────┤
│ - server: Server              // @WebSocketServer()  │
│ - namespaceServer: Server     // saved from afterInit│
│ - logger: Logger                                     │
│ - roomsService: RoomsService  // DI                  │
├──────────────────────────────────────────────────────┤
│ + afterInit(server: Server): void                    │
│ + handleConnection(client: Socket): Promise<void>    │
│ + handleDisconnect(client: Socket): Promise<void>    │
│ + handleJoinRoom(                                   │
│     @MessageBody dto: JoinRoomDto,                   │
│     @ConnectedSocket client: Socket                  │
│   ): Promise<void>                                  │
│ + handleSendMessage(                                │
│     @MessageBody dto: SendMessageDto,                │
│     @ConnectedSocket client: Socket                  │
│   ): Promise<void>                                  │
│ + handleLeaveRoom(                                  │
│     @MessageBody dto: LeaveRoomDto,                  │
│     @ConnectedSocket client: Socket                  │
│   ): Promise<void>                                  │
│ + handleGetRooms(): { rooms: string[] }              │
└───────────────────────┬──────────────────────────────┘
                        │ delegates state to
                        ▼
┌──────────────────────────────────────────────────────┐
│                   RoomsService                       │
├──────────────────────────────────────────────────────┤
│ - rooms: Map<string, RoomInfo>  // in-memory        │
│ - logger: Logger                                     │
├──────────────────────────────────────────────────────┤
│ + addUser(room, socketId, username): void            │
│ + removeUser(room, socketId): void                   │
│ + removeUserFromAllRooms(client: Socket): void       │
│ + getUsername(socketId, room): string | undefined    │
│ + getUsersInRoom(room): RoomUser[]                   │
│ + getAllRoomNames(): string[]                        │
│ + hasRoom(room): boolean                            │
└───────────────────────┬──────────────────────────────┘
                        │ uses
                        ▼
┌──────────────────────────────────────────────────────┐
│                       DTOs                           │
├──────────────────────────────────────────────────────┤
│ JoinRoomDto                                         │
│   - room: string      (@MinLength 3, @MaxLength 30) │
│   - username: string  (@MinLength 2, @MaxLength 20) │
├──────────────────────────────────────────────────────┤
│ SendMessageDto                                      │
│   - room: string      (@MinLength 3, @MaxLength 30) │
│   - content: string   (@MinLength 1, @MaxLength 500)│
├──────────────────────────────────────────────────────┤
│ LeaveRoomDto                                        │
│   - room: string      (@MinLength 3, @MaxLength 30) │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                 WsExceptionFilter                    │
│                 extends BaseWsExceptionFilter        │
├──────────────────────────────────────────────────────┤
│ + catch(exception: unknown, host: ArgumentsHost)    │
│     ┌─ WsException → client.emit('error', {...})    │
│     └─ Unexpected  → client.emit('error', {...})    │
│                      + logger.error(stack)           │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│               Estructuras de Datos                   │
├──────────────────────────────────────────────────────┤
│ RoomUser {                                          │
│   socketId: string                                   │
│   username: string                                   │
│   joinedAt: Date                                     │
│ }                                                   │
│                                                      │
│ RoomInfo {                                          │
│   name: string                                       │
│   users: Map<string, RoomUser>                       │
│ }                                                   │
└──────────────────────────────────────────────────────┘
```

---

## 5. Eventos Cliente → Servidor

### 📨 Tabla General

| Evento | Handler | Payload | Validación | Broadcast a otros | Eco al emisor |
|--------|---------|---------|-----------|-------------------|---------------|
| `joinRoom` | `handleJoinRoom` | `room`, `username` | `class-validator` | `userJoined`, `roomUsers` | ❌ No |
| `sendMessage` | `handleSendMessage` | `room`, `content` | `class-validator` | `newMessage` | ❌ No |
| `leaveRoom` | `handleLeaveRoom` | `room` | `class-validator` | `userLeft`, `roomUsers` | ❌ No |
| `getRooms` | `handleGetRooms` | _(ninguno)_ | — | — | ✅ ACK: `{ rooms }` |

---

### `joinRoom` — Unirse a una sala

**Payload:**
```json
{
  "room": "lobby",
  "username": "Angela"
}
```

**Validación (DTO):**

| Campo | Reglas |
|-------|--------|
| `room` | `@IsString`, `@IsNotEmpty`, `@MinLength(3)`, `@MaxLength(30)` |
| `username` | `@IsString`, `@IsNotEmpty`, `@MinLength(2)`, `@MaxLength(20)` |

**Flujo en el servidor:**
```
1. ValidationPipe valida el DTO → si falla, lanza WsException
2. Verifica que el cliente NO esté ya en la sala (client.rooms.has)
   → si ya está: lanza WsException "Already in room"
3. await client.join(room) → suscribe al canal Socket.IO
4. roomsService.addUser(room, socketId, username) → tracking en memoria
5. client.to(room).emit('userJoined', {...}) → broadcast a OTROS
6. client.to(room).emit('roomUsers', {...}) → broadcast a OTROS
```

**Ejemplo en socket.io-client:**
```js
socket.emit('joinRoom', { room: 'lobby', username: 'Angela' });
```

---

### `sendMessage` — Enviar mensaje a una sala

**Payload:**
```json
{
  "room": "lobby",
  "content": "Hola a todos!"
}
```

**Validación:**

| Campo | Reglas |
|-------|--------|
| `room` | `@IsString`, `@IsNotEmpty`, `@MinLength(3)`, `@MaxLength(30)` |
| `content` | `@IsString`, `@IsNotEmpty`, `@MinLength(1)`, `@MaxLength(500)` |

**Flujo en el servidor:**
```
1. ValidationPipe valida el DTO
2. Verifica que el cliente esté en la sala (roomsService.getUsername)
   → si no está: lanza WsException "You must join room..."
3. client.to(room).emit('newMessage', {username, content, timestamp})
   → broadcast a OTROS (excluye al emisor)
```

**Ejemplo:**
```js
socket.emit('sendMessage', { room: 'lobby', content: 'Hola!' });
```

---

### `leaveRoom` — Salir de una sala

**Payload:**
```json
{
  "room": "lobby"
}
```

**Validación:**

| Campo | Reglas |
|-------|--------|
| `room` | `@IsString`, `@IsNotEmpty`, `@MinLength(3)`, `@MaxLength(30)` |

**Flujo en el servidor:**
```
1. ValidationPipe valida el DTO
2. Obtiene el username antes de salir (roomsService.getUsername)
3. await client.leave(room) → desuscribe del canal
4. roomsService.removeUser(room, socketId) → limpia tracking
5. Si el username existe:
     client.to(room).emit('userLeft', {...}) → broadcast a OTROS
6. client.to(room).emit('roomUsers', {...}) → broadcast a OTROS
```

---

### `getRooms` — Listar salas activas

**Payload:** Ninguno requerido (cualquier valor se ignora).

**Flujo:**
```
1. roomsService.getAllRoomNames() → string[]
2. Retorna { rooms: string[] } vía ACK (acknowledgment)
```

> ⚠️ Este evento usa el mecanismo de **ACK** de Socket.IO, no emite un evento de vuelta. El cliente debe usar `emitWithAck()` o el callback de `emit()`.

**Ejemplo:**
```js
// Con ACK (recomendado)
const data = await socket.emitWithAck('getRooms');
console.log(data.rooms); // ["lobby", "general"]
```

---

## 6. Eventos Servidor → Cliente

### 📡 Tabla General

| Evento | Emitido por | Payload | Quién lo recibe |
|--------|------------|---------|----------------|
| `userJoined` | `handleJoinRoom` | `username`, `timestamp` | Otros clientes en la sala |
| `newMessage` | `handleSendMessage` | `username`, `content`, `timestamp` | Otros clientes en la sala |
| `userLeft` | `handleLeaveRoom`, `handleDisconnect` | `username`, `timestamp` | Otros clientes en la sala |
| `roomUsers` | `handleJoinRoom`, `handleLeaveRoom`, `handleDisconnect` | `room`, `users[]` | Otros clientes en la sala |
| `error` | `WsExceptionFilter` | `message`, `timestamp` | Cliente que provocó el error |

---

### `userJoined`

```json
{
  "username": "Angela",
  "timestamp": "2026-06-15T14:30:00.000Z"
}
```

**Cuándo se emite:** Después de que otro cliente ejecuta `joinRoom` exitosamente.

**Quién NO lo recibe:** El cliente que ejecutó `joinRoom` (excluido por `client.to()`).

---

### `newMessage`

```json
{
  "username": "Angela",
  "content": "Hola a todos!",
  "timestamp": "2026-06-15T14:30:05.000Z"
}
```

**Cuándo se emite:** Después de que otro cliente ejecuta `sendMessage` exitosamente.

**Quién NO lo recibe:** El cliente que envió el mensaje (excluido por `client.to()`). El frontend debe mostrar el mensaje inmediatamente (optimistic UI).

---

### `userLeft`

```json
{
  "username": "Angela",
  "timestamp": "2026-06-15T14:30:10.000Z"
}
```

**Cuándo se emite:** Cuando otro cliente ejecuta `leaveRoom` o se desconecta (el servidor detecta `disconnect`).

---

### `roomUsers`

```json
{
  "room": "lobby",
  "users": [
    {
      "socketId": "abc123",
      "username": "Daniel",
      "joinedAt": "2026-06-15T14:29:30.000Z"
    },
    {
      "socketId": "def456",
      "username": "Angela",
      "joinedAt": "2026-06-15T14:28:30.000Z"
    }
  ]
}
```

**Cuándo se emite:** Después de cada `joinRoom`, `leaveRoom`, o `disconnect`. Contiene la lista completa actualizada de usuarios en la sala.

---

### `error`

```json
{
  "message": "You must join room \"lobby\" before sending messages",
  "timestamp": "2026-06-15T14:30:00.000Z"
}
```

**Cuándo se emite:** Directamente al cliente que provocó un error (no es broadcast).

---

## 7. Diagrama de Secuencia (UML)

### Flujo Completo: Join → Message → Leave → Disconnect

```
 Cliente A          SERVIDOR            Cliente B
 (Angela)     RoomsGateway  RoomsService  (Daniel)
    │              │             │            │
    │── connect ──►│             │            │
    │              │ handleConnection()       │
    │              │             │            │◄── connect ──
    │              │             │            │ handleConnection()
    │              │             │            │
    │              │             │            │
    │  ╔══════════ JOIN ROOM — ANGELA ═══════╗           │
    │  ║          │             │            ║           │
    │── joinRoom─►│             │            │           │
    │ {room:      │             │            │           │
    │  "lobby",   │ client.rooms.has()       │           │
    │  username:  │ → false (no está)        │           │
    │  "Angela"}  │ client.join("lobby")     │           │
    │              │ addUser("lobby",A,"Angela")         │
    │              │             │            │           │
    │              │ client.to("lobby")       │           │
    │              │  .emit(userJoined) ──────────────► │
    │              │             │            │  recibe:  │
    │              │             │            │  {username:│
    │              │             │            │   "Angela"}│
    │              │  .emit(roomUsers) ───────────────► │
    │              │             │            │  recibe:  │
    │              │             │            │  {room,   │
    │              │             │            │   users[]}│
    │  ╚══════════════════════════════════════╝           │
    │              │             │            │           │
    │              │             │            │           │
    │  ╔══════════ JOIN ROOM — DANIEL ═══════╗           │
    │  ║          │             │            ║           │
    │              │             │◄── joinRoom ─          │
    │              │             │ {room:"lobby",         │
    │              │             │  username:"Daniel"}    │
    │              │ client.join("lobby")                 │
    │              │ addUser("lobby",B,"Daniel")          │
    │              │             │            │           │
    │              │ client.to("lobby")       │           │
    │◄── userJoined ──────────────┼───────────┼────────   │
    │ {username:   │             │            │           │
    │  "Daniel"}   │             │            │           │
    │◄── roomUsers ──────────────┼───────────┼────────   │
    │              │             │            │           │
    │  ╚══════════════════════════════════════╝           │
    │              │             │            │           │
    │              │             │            │           │
    │  ╔══════ SEND MESSAGE — DANIEL ═════════╗          │
    │  ║          │             │            ║           │
    │              │             │◄── sendMessage ─       │
    │              │             │ {room:"lobby",         │
    │              │             │  content:"Hola!"}      │
    │              │ getUsername(B, "lobby")              │
    │              │ → "Daniel" (sí está)                 │
    │              │ client.to("lobby")       │           │
    │              │  .emit(newMessage) ─────────────────►│
    │◄─ recibe ────│─────────────┼───────────┼─────────  │
    │ {username:   │             │            │           │
    │  "Daniel",   │             │            │ (no recibe│
    │  content:    │             │            │  eco por  │
    │  "Hola!"}    │             │            │  client.to│
    │              │             │            │  — excluye│
    │              │             │            │  al emisor│
    │  ╚══════════════════════════════════════╝           │
    │              │             │            │           │
    │              │             │            │           │
    │  ╔══════ LEAVE ROOM — DANIEL ═══════════╗          │
    │  ║          │             │            ║           │
    │              │             │◄── leaveRoom ─         │
    │              │             │ {room:"lobby"}         │
    │              │ getUsername(B, "lobby")              │
    │              │ → "Daniel"                           │
    │              │ client.leave("lobby")                │
    │              │ removeUser("lobby", B)               │
    │              │ client.to("lobby")       │           │
    │              │  .emit(userLeft) ──────────────────► │
    │◄─ recibe ────│─────────────┼───────────┼─────────  │
    │ {username:   │             │            │           │
    │  "Daniel"}   │             │            │           │
    │              │  .emit(roomUsers) ─────────────────► │
    │  ╚══════════════════════════════════════╝           │
    │              │             │            │           │
    │              │             │            │           │
    │  ╔══════ DISCONNECT — ANGELA ═══════════╗          │
    │  ║          │             │            ║           │
    │── disconnect ►             │            │           │
    │  (navegador │ handleDisconnect(A)       │           │
    │   cerrado)  │             │            │           │
    │              │ itera client.rooms        │           │
    │              │ → encuentra "lobby"       │           │
    │              │ getUsername(A, "lobby")   │           │
    │              │ → "Angela"                │           │
    │              │ namespaceServer.to("lobby")           │
    │              │  .emit(userLeft) ───────────────────► │
    │              │  .emit(roomUsers) ──────────────────► │
    │              │ removeUserFromAllRooms(A)             │
    │              │ → room "lobby" queda vacía            │
    │              │ → room eliminada de memoria           │
    │  ╚══════════════════════════════════════╝           │
```

---

## 8. Diagrama de Estados del Cliente

```
                        ┌──────────────────┐
                        │   DESCONECTADO   │
                        │                  │
                        │  · No conectado  │
                        │  · Sin sesión    │
                        └────────┬─────────┘
                                 │
                     connect()   │
                   (socket.io-client)
                                 │
                                 ▼
                        ┌──────────────────┐
               ┌───────│    CONECTADO     │───────┐
               │       │                  │       │
               │       │  · socket.id     │       │
               │       │  · Transporte WS │       │
               │       └────────┬─────────┘       │
               │                │                 │
               │    joinRoom()  │                 │
               │   {room,       │                 │
               │    username}   │                 │
               │                │                 │
               │                ▼                 │
               │       ┌──────────────────┐       │
               │       │    EN SALA       │       │
               │       │                  │       │
               │       │  · Recibe eventos│       │
               │       │    de broadcast: │       │
               │       │    userJoined    │       │
               │       │    newMessage    │       │
               │       │    userLeft      │       │
               │       │    roomUsers     │       │
               │       │                  │       │
               │       │  · Puede emitir: │       │
               │       │    sendMessage   │       │
               │       │    leaveRoom     │       │
               │       │    getRooms      │       │
               │       └──┬───────────┬───┘       │
               │          │           │           │
               │          │           │           │
               │ leaveRoom()     disconnect()     │
               │ (explícito)    (implícito)       │
               │          │           │           │
               │          ▼           │           │
               │  ┌──────────────┐    │           │
               │  │  EN SALA     │    │           │
               │  │  (otras)     │    │           │
               │  └──────┬───────┘    │           │
               │         │            │           │
               └─────────┴────────────┘           │
                         │                        │
                         ▼                        ▼
                ┌──────────────────┐    ┌──────────────────┐
                │  DESCONECTADO    │    │  DESCONECTADO    │
                │  (voluntario)    │    │  (pérdida de red,│
                │                  │    │   cierre browser)│
                └──────────────────┘    └──────────────────┘
```

### 📊 Tabla de Transiciones

| Estado Actual | Evento | Estado Siguiente | Acciones del Servidor |
|--------------|--------|-----------------|----------------------|
| Desconectado | `connect` | Conectado | `handleConnection()` — registra en log |
| Conectado | `joinRoom` | En Sala | Suscribe a room, emite `userJoined` + `roomUsers` a otros |
| Conectado | `disconnect` | Desconectado | Cleanup — no estaba en salas |
| En Sala | `sendMessage` | En Sala | Broadcast `newMessage` a otros en la sala |
| En Sala | `leaveRoom` | En Sala (otras) o Conectado | Desuscribe, emite `userLeft` + `roomUsers` a otros |
| En Sala | `disconnect` | Desconectado | Itera todas las salas, emite `userLeft` + `roomUsers`, cleanup |
| En Sala | `error` (payload inválido) | En Sala | Emite evento `error` al cliente que falló |

---

## 9. Manejo de Errores

### 🔄 Flujo de errores

```
Cliente emite evento con datos inválidos
        │
        ▼
ValidationPipe (class-validator)
        │
        ├── DTO válido → handler se ejecuta normalmente
        │
        └── DTO inválido → exceptionFactory → WsException
                │
                ▼
        @UseFilters(WsExceptionFilter)
                │
                ├── WsException → client.emit('error', {
                │       message: "room must be longer than...",
                │       timestamp: "2026-06-15T..."
                │   })
                │
                └── Error inesperado → logger.error(stack)
                        └── client.emit('error', {
                                message: "Internal server error",
                                timestamp: "2026-06-15T..."
                            })
```

### 📋 Tabla de Errores

| Causa | Evento | Mensaje | Tipo |
|-------|--------|---------|------|
| Ya estás en la sala | `joinRoom` | `Already in room "X"` | `WsException` |
| No estás en la sala | `sendMessage` | `You must join room "X" before sending messages` | `WsException` |
| room < 3 caracteres | cualquiera | `room must be longer than or equal to 3 characters` | Validación DTO |
| room > 30 caracteres | cualquiera | `room must be shorter than or equal to 30 characters` | Validación DTO |
| username < 2 caracteres | `joinRoom` | `username must be longer than or equal to 2 characters` | Validación DTO |
| username > 20 caracteres | `joinRoom` | `username must be shorter than or equal to 20 characters` | Validación DTO |
| content < 1 carácter | `sendMessage` | `content must be longer than or equal to 1 characters` | Validación DTO |
| content > 500 caracteres | `sendMessage` | `content must be shorter than or equal to 500 characters` | Validación DTO |
| room vacío | cualquiera | `room should not be empty` | Validación DTO |
| username vacío | `joinRoom` | `username should not be empty` | Validación DTO |
| content vacío | `sendMessage` | `content should not be empty` | Validación DTO |
| Error interno inesperado | cualquiera | `Internal server error` | `Error` genérico |

### 📡 Formato del evento `error`

```json
{
  "message": "You must join room \"lobby\" before sending messages",
  "timestamp": "2026-06-15T14:30:00.000Z"
}
```

- **Siempre** se envía al cliente que provocó el error
- **Nunca** se hace broadcast a otros clientes
- Los errores de validación pueden contener múltiples mensajes concatenados con `;`

**Ejemplo de escucha en el cliente:**
```js
socket.on('error', (data) => {
  console.error(`Error del servidor: ${data.message}`);
  // Mostrar toast/notificación al usuario
});
```

---

## 10. Postman — Guía Rápida

### ⚙️ Configuración

```
┌─────────────────────────────────────────────┐
│  Tipo de Request:  Socket.IO               │
│  URL:              http://127.0.0.1:3000   │  ← usa 127.0.0.1, NO localhost
│  Namespace:        /rooms                   │
└─────────────────────────────────────────────┘
```

### 📤 Eventos a EMITIR

| Evento | Payload |
|--------|---------|
| `joinRoom` | `{ "room": "lobby", "username": "Daniel" }` |
| `sendMessage` | `{ "room": "lobby", "content": "Hola!" }` |
| `leaveRoom` | `{ "room": "lobby" }` |
| `getRooms` | _vacío_ |

> ⚠️ En Postman, el nombre del evento se escribe en el campo **"Event name"**, NO en el payload.

### 📥 Eventos a ESCUCHAR (Listeners)

| Evento | ¿Cuándo se recibe? |
|--------|-------------------|
| `userJoined` | Otro cliente entra a tu sala |
| `newMessage` | Otro cliente envía mensaje en tu sala |
| `userLeft` | Otro cliente sale de tu sala |
| `roomUsers` | Cambia la membresía de la sala |
| `error` | Tus acciones inválidas |

### 🧪 Flujo de Prueba con 2 Clientes

```
Pestaña 1 (Daniel)                  Pestaña 2 (Angela)
─────────────────                   ─────────────────
1. Connect                          1. Connect
2. Escuchar: userJoined,            2. Escuchar: userJoined,
   newMessage, userLeft,               newMessage, userLeft,
   roomUsers, error                    roomUsers, error
3. Emitir: joinRoom {               3. Emitir: joinRoom {
     room: "lobby",                       room: "lobby",
     username: "Daniel"                   username: "Angela"
   }                                   }
                                     → Daniel recibe userJoined {Angela} ✅
4. Emitir: sendMessage {
     room: "lobby",
     content: "Hola Angela!"
   }
                                     → Angela recibe newMessage ✅
5. Emitir: leaveRoom {
     room: "lobby"
   }
                                     → Angela recibe userLeft ✅
```

---

## 11. Referencia Rápida (Cheatsheet)

### 📊 Matriz de Eventos

```
┌──────────────┬──────────────────────┬─────────────────────────────┬──────────────┐
│   ACCIÓN     │   EMITIR (cliente)   │   RECIBIR (otros clientes)  │   EMISOR     │
├──────────────┼──────────────────────┼─────────────────────────────┼──────────────┤
│ Conectarse   │ (automático)         │ —                           │ evento       │
│              │                      │                             │ 'connect'    │
├──────────────┼──────────────────────┼─────────────────────────────┼──────────────┤
│ Unirse a     │ joinRoom             │ userJoined {username,       │ ❌ Nada      │
│ sala         │ {room, username}     │  timestamp}                 │              │
│              │                      │ roomUsers {room, users[]}   │              │
├──────────────┼──────────────────────┼─────────────────────────────┼──────────────┤
│ Enviar       │ sendMessage          │ newMessage {username,       │ ❌ Nada      │
│ mensaje      │ {room, content}      │  content, timestamp}        │              │
├──────────────┼──────────────────────┼─────────────────────────────┼──────────────┤
│ Salir de     │ leaveRoom            │ userLeft {username,         │ ❌ Nada      │
│ sala         │ {room}               │  timestamp}                 │              │
│              │                      │ roomUsers {room, users[]}   │              │
├──────────────┼──────────────────────┼─────────────────────────────┼──────────────┤
│ Listar       │ getRooms             │ —                           │ ✅ ACK:      │
│ salas        │ (vacío)              │                             │ {rooms:[]}   │
├──────────────┼──────────────────────┼─────────────────────────────┼──────────────┤
│ Desconectar  │ (automático)         │ userLeft {username,         │ ❌ Nada      │
│              │                      │  timestamp}                 │              │
│              │                      │ roomUsers {room, users[]}   │              │
├──────────────┼──────────────────────┼─────────────────────────────┼──────────────┤
│ Error de     │ cualquiera           │ —                           │ ✅ error     │
│ validación   │ (payload inválido)   │                             │ {message,    │
│              │                      │                             │  timestamp}  │
└──────────────┴──────────────────────┴─────────────────────────────┴──────────────┘
```

### 🎯 Reglas Clave

| # | Regla |
|---|-------|
| 1 | Los payloads usan `room`, `username`, `content` — NO `message`, `nickname`, `user` |
| 2 | El emisor **nunca** recibe sus propios eventos de broadcast |
| 3 | `getRooms` es el único evento que responde al emisor (vía ACK) |
| 4 | `handleDisconnect` usa `namespaceServer.to()` — es el único handler que no usa `client.to()` |
| 5 | Los nombres de evento son **case-sensitive**: `joinRoom` ≠ `joinedRoom` ≠ `JoinRoom` |
| 6 | En Postman, usa `127.0.0.1` en vez de `localhost` si falla la conexión |
| 7 | Socket.IO NO es WebSocket crudo — requiere `socket.io-client` (no `ws` package) |
| 8 | El estado (rooms, usuarios) es volátil — se pierde al reiniciar el servidor |

### 🧪 Comandos Rápidos

```bash
# Iniciar servidor en modo desarrollo
cd backend && npm run start:dev

# Ejecutar tests unitarios (10 tests)
cd backend && npm test -- --testPathPatterns="rooms.gateway"

# Ejecutar tests E2E WebSocket (18 tests)
# Terminal 1: cd backend && npm run start
# Terminal 2: cd backend && node test/websocket-test.mjs

# Compilar
cd backend && npm run build
```

---

> **Última actualización:** 2026-06-15
> **Autor:** Chaty team
> **Versión:** 1.0.0
