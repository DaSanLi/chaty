# 🏗️ Arquitectura Chaty — Chat con WebSocket sobre Fastify

> **Versión:** 1.0.0  
> **Fecha:** Mayo 2026  
> **Stack:** Fastify 5.x + TypeScript + WebSocket (@fastify/websocket)  
> **Paradigma:** Híbrido — Fastify idiomático con separación NestJS de concerns

---

## 🎯 Visión del Proyecto

Chaty es una aplicación de chat en tiempo real con enfoque en UX intuitiva. La comunicación entre usuarios se realiza mediante WebSocket, y la arquitectura del servidor debe ser **escalable, mantenible y didáctica**.

Este documento define la arquitectura del backend: la estructura de carpetas, el rol de cada archivo, el flujo de datos del WebSocket, y el plan de implementación paso a paso.

---

## 🧠 Filosofía de la Arquitectura

### El problema de fondo

Existen dos polos al diseñar un backend con Fastify:

| Polo | Descripción | Riesgo |
|------|-------------|--------|
| **Fastify puro** | Todo es un plugin. Rutas + lógica en un mismo archivo. | Código acoplado, difícil de testear aisladamente. |
| **NestJS-like** | Módulos, controladores, servicios, DI. | Lucha contra el diseño de Fastify, pierde autoload. |

### La solución híbrida

**Principio rector:** Usar Fastify como fue diseñado (plugins + autoload), pero separar la lógica de negocio en una capa de servicios independiente.

El flujo de responsabilidades:

1. **Fastify Instance** — Raíz de la aplicación, punto de arranque
2. **plugins/** — Infraestructura reutilizable. Cargado por autoload. Ej: `@fastify/websocket`, `@fastify/sensible`
3. **routes/** — Definición de endpoints HTTP y WebSocket. Solo ORQUESTAN (no contienen lógica). Cargado por autoload.
4. **services/** — Lógica de negocio PURA. Sin dependencia de HTTP/WebSocket. NO cargado por autoload.
5. **types/** — Interfaces y tipos compartidos. Puro TypeScript.

**Analogía con NestJS:**

| Concepto NestJS | Nuestra implementación en Fastify |
|---|---|
| `@Module()` | Plugin de Fastify (archivo en `routes/`) |
| `@Controller()` | Handler definitions dentro del plugin |
| `@Injectable()` Service | Clase en `services/` |
| `@Injectable()` Provider | Instancia pasada por `opts` o `fastify.decorate()` |
| DTO / Pipes | JSON Schema en `*.schema.ts` |
| Guard | `fastify.addHook('onRequest', ...)` |

### ¿Por qué NO usamos módulos NestJS-style (`modules/chat/chat.module.ts`)?

1. **Autoload**: Fastify-CLI escanea `routes/` y `plugins/` automáticamente. Una carpeta `modules/` sería ignorada.
2. **Convención de la comunidad**: Los proyectos Fastify organizan su código en `routes/` + `plugins/`. Forzar `modules/` va contra la corriente.
3. **Simplicidad**: No necesitamos un contenedor DI cuando el sistema de plugins de Fastify ya maneja encapsulación e inyección vía `opts` y `decorate`.

---

## 📁 Estructura de Directorios

```
backend/
├── src/
│   ├── app.ts                          # Punto de entrada. Registra autoload.
│   │
│   ├── plugins/                        # Plugins de infraestructura (autoload)
│   │   ├── sensible.ts                 # Manejo de errores HTTP (@fastify/sensible)
│   │   ├── support.ts                  # Decorator de ejemplo (someSupport)
│   │   └── websocket.ts               # 🆕 Registra @fastify/websocket
│   │
│   ├── routes/                         # Plugins de rutas (autoload)
│   │   ├── root.ts                     # GET /  → health check / bienvenida
│   │   └── chat/                       # 🆕 Dominio del chat
│   │       ├── index.ts                # Plugin: rutas HTTP + WebSocket del chat
│   │       └── chat.schema.ts          # Schemas de validación (body, params, response)
│   │
│   ├── services/                       # 🆕 Lógica de negocio pura
│   │   ├── chat.service.ts             # Servicio del chat (enviar/recibir mensajes)
│   │   └── index.ts                    # Barrel export
│   │
│   └── types/                          # 🆕 Tipos compartidos
│       ├── chat.types.ts               # Interfaces: Message, Client, Room
│       └── index.ts                    # Barrel export
│
├── test/
│   ├── helper.ts                       # Helper de tests (build + teardown)
│   ├── plugins/
│   │   └── support.test.ts
│   └── routes/
│       ├── root.test.ts
│       ├── example.test.ts
│       └── chat.test.ts               # 🆕 Tests del chat
│
├── docs/
│   └── architecture.md                 # 📍 Este documento
│
├── package.json
├── tsconfig.json
└── dist/                               # Compilado (no se toca manualmente)
```

### Explicación de cada archivo nuevo (🆕)

#### `src/plugins/websocket.ts` — Registro del plugin WebSocket

- **Rol:** Registra `@fastify/websocket` en la instancia de Fastify para que esté disponible en todas las rutas.
- **¿Por qué en plugins/?** Porque es infraestructura, no lógica de dominio. Autoload lo carga automáticamente.
- **¿Por qué `fastify-plugin`?** Para que el decorator `websocketServer` sea visible en el scope global (rompe la encapsulación).
- **Contenido típico:**
  ```typescript
  import fp from 'fastify-plugin'
  import websocket from '@fastify/websocket'

  export default fp(async (fastify) => {
    fastify.register(websocket)
  })
  ```

#### `src/routes/chat/index.ts` — Plugin del dominio chat

- **Rol:** Define las rutas HTTP y el endpoint WebSocket del chat.
- **¿Por qué en routes/chat/?** El nombre de la carpeta (`chat`) se convierte en el prefijo de URL: `/chat`.
- **¿Qué NO contiene?** No contiene lógica de negocio. Solo orquesta: recibe request, llama al service, devuelve respuesta.
- **Contenido típico:**
  ```typescript
  import { FastifyPluginAsync } from 'fastify'
  import { ChatService } from '../../services/chat.service.js'

  const chatRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
    const chatService = new ChatService()

    // Ruta WebSocket
    fastify.get('/', { websocket: true }, (socket, req) => {
      chatService.addClient(socket)
      socket.on('message', (data) => chatService.handleMessage(socket, data))
      socket.on('close', () => chatService.removeClient(socket))
    })

    // Ruta HTTP opcional: obtener historial
    fastify.get('/history', async (request, reply) => {
      return chatService.getHistory()
    })
  }

  export default chatRoutes
  ```

#### `src/services/chat.service.ts` — Lógica de negocio del chat

- **Rol:** Contiene TODA la lógica del chat. Gestiona conexiones, procesa mensajes, broadcast.
- **¿Qué NO sabe?** No sabe nada de Fastify, `request`, `reply`, ni `fastify.get()`. Es TypeScript puro.
- **¿Por qué separado?** Para testear la lógica SIN necesidad de levantar un servidor WebSocket.
- **Patrón:** Clase con estado interno (`Set<WebSocket>`) y métodos públicos.
- **Contenido típico:**
  ```typescript
  import { ChatMessage } from '../types/chat.types.js'

  export class ChatService {
    private clients = new Set<WebSocket>()
    private messages: ChatMessage[] = []

    addClient(socket: WebSocket): void { ... }
    removeClient(socket: WebSocket): void { ... }
    handleMessage(socket: WebSocket, data: unknown): void { ... }
    private broadcast(message: ChatMessage, sender: WebSocket): void { ... }
    getHistory(): ChatMessage[] { ... }
  }
  ```

#### `src/types/chat.types.ts` — Tipos del dominio

- **Rol:** Define las interfaces y tipos que comparten `chat.service.ts`, `chat.schema.ts`, y los tests.
- **Contenido típico:**
  ```typescript
  export interface ChatMessage {
    id: string
    text: string
    user: string
    timestamp: number
  }

  export interface ChatClient {
    id: string
    username: string
  }
  ```

#### `src/routes/chat/chat.schema.ts` — Schemas de validación

- **Rol:** Define schemas JSON Schema para validar entrada y serializar salida.
- **¿Por qué separado?** Mantiene el plugin de rutas limpio. Reutilizable en tests.

---

## 🔄 Flujo de Datos del Chat WebSocket

### Diagrama de secuencia

```
CLIENTE A                    SERVIDOR                       CLIENTE B
─────────                    ────────                       ─────────
   │                            │                               │
   │  1. ws://host:3000/chat    │                               │
   │ ─────────────────────────► │                               │
   │                            │  2. ChatService.addClient()    │
   │                            │     Guarda socket en Set       │
   │                            │                               │
   │  3. socket.send(JSON)      │                               │
   │  {"text":"Hola","user":"A"}│                               │
   │ ─────────────────────────► │                               │
   │                            │  4. ChatService.handleMessage()│
   │                            │     Parsea, valida, timestamps │
   │                            │                               │
   │                            │  5. ChatService.broadcast()    │
   │                            │     Itera Set<WebSocket>       │
   │                            │ ──────────────────────────────►│
   │                            │     6. socket.send(JSON)       │
   │                            │     Cliente B recibe mensaje   │
   │                            │                               │
   │  7. socket.close()         │                               │
   │ ─────────────────────────► │                               │
   │                            │  8. ChatService.removeClient() │
   │                            │     Elimina socket del Set     │
```

### Paso a paso detallado

#### 1. Conexión WebSocket
El cliente JavaScript se conecta:
```javascript
const ws = new WebSocket('ws://localhost:3000/chat')
```
El navegador envía una petición HTTP con header `Upgrade: websocket`. Fastify + `@fastify/websocket` reconocen el upgrade y ejecutan el handler con `{ websocket: true }`.

#### 2. Registro de conexión
```typescript
// En routes/chat/index.ts
fastify.get('/', { websocket: true }, (socket, req) => {
  chatService.addClient(socket)
  // ...
})
```
`ChatService.addClient()` añade el socket a un `Set<WebSocket>`.

#### 3. Envío de mensaje (cliente → servidor)
```javascript
// Cliente A
ws.send(JSON.stringify({ text: 'Hola', user: 'Daniel' }))
```

#### 4. Procesamiento del mensaje
```typescript
// ChatService.handleMessage()
handleMessage(socket: WebSocket, data: unknown): void {
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    text: String(data), // o JSON.parse si el cliente envía objetos
    user: 'Anónimo',    // MVP: sin autenticación
    timestamp: Date.now()
  }
  this.messages.push(message) // guardar historial
  this.broadcast(message, socket) // enviar a todos
}
```

#### 5. Broadcast
```typescript
// ChatService.broadcast()
private broadcast(message: ChatMessage, sender: WebSocket): void {
  const payload = JSON.stringify(message)
  for (const client of this.clients) {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  }
}
```
Itera todas las conexiones y envía el mensaje. Salta al sender para evitar eco. Verifica `readyState === OPEN` para no enviar a sockets cerrados.

#### 6. Recepción (servidor → cliente)
```javascript
// Cliente B
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  // Renderizar en la UI
}
```

#### 7. Desconexión
```javascript
// Cliente cierra
ws.close()
```

#### 8. Limpieza
```typescript
// Evento 'close' en el handler WebSocket
socket.on('close', () => {
  chatService.removeClient(socket)
})
```
`ChatService.removeClient()` elimina el socket del Set. Opcional: notificar a los demás que un usuario se fue.

---

## 📐 Decisiones de Diseño

### ¿Set o Map para almacenar clientes?

| Estructura | Cuándo usarla |
|---|---|
| `Set<WebSocket>` | Chat simple: todos reciben todos los mensajes. No hay identificación de usuarios. |
| `Map<string, WebSocket>` | Chat con usuarios: cada usuario tiene un ID. Se puede enviar mensajes privados. |
| `Map<string, Set<WebSocket>>` | Chat con salas: cada sala tiene sus propios clientes. |

**Decisión para MVP:** `Set<WebSocket>`. Es lo más simple y cubre el caso de uso: chat grupal único. Migrar a Map es trivial cuando se necesite.

### ¿`@fastify/websocket` o `ws` directamente?

| Opción | Ventaja clave | Desventaja |
|---|---|---|
| `@fastify/websocket` | Integración con ciclo de vida Fastify, mismo puerto HTTP | Una dependencia más |
| `ws` directo | Control total, sin abstracción | Manejo manual del upgrade, puerto separado o integración manual |

**Decisión:** `@fastify/websocket`. Es el plugin oficial, se integra con el sistema de plugins de Fastify, comparte el puerto HTTP, y es trivial de usar.

### ¿Por qué NO `socket.io`?

| Razón | Explicación |
|---|---|
| Overhead | Socket.io añade polling (long-polling como fallback), rooms, namespaces, adapters |
| Complejidad | Abstracción pesada que oculta WebSocket nativo |
| Fastify | `@fastify/websocket` es la opción nativa y liviana |
| MVP | Para un chat simple, WebSocket nativo es más que suficiente |

Si en el futuro necesitamos rooms, presencia, o reconexión automática, Socket.io podría justificarse, pero no para el MVP.

### ¿Historial en memoria o base de datos?

**Decisión MVP:** Array en memoria (`ChatMessage[]`). El historial se pierde al reiniciar el servidor. Para producción, migrar a SQLite/PostgreSQL.

---

## 📋 Plan de Implementación (Fases)

| # | Fase | Archivo(s) | Descripción | Depende de |
|---|------|-----------|-------------|------------|
| 0 | **Limpieza** | `src/app.ts` | Eliminar `logger: true` suelto (bug) y ruta `GET /` duplicada | — |
| 1 | **Tipos** | `src/types/chat.types.ts`, `src/types/index.ts` | Definir interfaces: `ChatMessage`, `ChatClient` | — |
| 2 | **Service** | `src/services/chat.service.ts`, `src/services/index.ts` | Clase `ChatService`: addClient, removeClient, handleMessage, broadcast, getHistory | Fase 1 |
| 3 | **Plugin WS** | `src/plugins/websocket.ts` | Registrar `@fastify/websocket` como plugin de infraestructura | — |
| 4 | **Schemas** | `src/routes/chat/chat.schema.ts` | JSON Schema para validación de body y serialización de response | Fase 1 |
| 5 | **Ruta Chat** | `src/routes/chat/index.ts` | Plugin con endpoint WebSocket + (opcional) GET /chat/history | Fase 2, 3, 4 |
| 6 | **Instalar dependencia** | `package.json` | `npm install @fastify/websocket` | — |
| 7 | **Tests** | `test/routes/chat.test.ts` | Tests de integración: conectar, enviar mensaje, recibir broadcast, desconectar | Fase 5 |
| 8 | **Frontend** | `frontend/index.html` | UI mínima: input de mensaje + área de chat. HTML + JS vanilla. | Fase 5 |

### Orden de ejecución recomendado

```
Fase 0 → Fase 1 → Fase 2 → Fase 3 + Fase 6 → Fase 4 → Fase 5 → Fase 7 → Fase 8
         └─────┘   └─────┘   └──────────────┘   └─────┘   └──────────────┘
         Tipos +   Service    Plugin WS            Schemas   Ruta + Tests
         Service             instalado
```

Las fases 1 y 2 pueden hacerse juntas (los tipos son pocos). La fase 3 y 6 son un solo paso (instalar + crear archivo). La fase 5 es donde todo se une.

---

## 🔬 Anatomía de un Plugin de Ruta WebSocket

Este es el archivo más importante del proyecto. Aquí está desglosado conceptualmente:

```typescript
// 1. IMPORTS
import { FastifyPluginAsync } from 'fastify'
import { ChatService } from '../../services/chat.service.js'
import { createMessageSchema } from './chat.schema.js'

// 2. PLUGIN (autoload lo registra con prefijo /chat)
const chatRoutes: FastifyPluginAsync = async (fastify, opts): Promise<void> => {

  // 3. INSTANCIAR EL SERVICE (inyección manual — equivalente a @Injectable())
  const chatService = new ChatService()

  // 4. RUTA WEBSOCKET — el núcleo
  //    { websocket: true } le dice a Fastify que esto es WebSocket, no HTTP
  fastify.get('/', { websocket: true }, (socket, req) => {
    // 4a. Cliente conectado → registrar
    chatService.addClient(socket)

    // 4b. Mensaje recibido → delegar al service
    socket.on('message', (data: Buffer) => {
      chatService.handleMessage(socket, data.toString())
    })

    // 4c. Cliente desconectado → limpiar
    socket.on('close', () => {
      chatService.removeClient(socket)
    })

    // 4d. Error → log (no crashea el servidor)
    socket.on('error', (err) => {
      fastify.log.error('WebSocket error:', err)
      chatService.removeClient(socket)
    })
  })

  // 5. RUTA HTTP OPCIONAL — obtener historial
  fastify.get('/history', async (request, reply) => {
    return chatService.getHistory()
  })

  // 6. RUTA HTTP OPCIONAL — estado del chat
  fastify.get('/status', async (request, reply) => {
    return {
      clients: chatService.getClientCount(),
      messages: chatService.getMessageCount()
    }
  })
}

export default chatRoutes
```

### ¿Por qué este diseño?

1. **El plugin solo orquesta.** No sabe CÓMO se procesa un mensaje, solo sabe A QUIÉN llamar.
2. **El service es reemplazable.** Si mañana querés guardar mensajes en BD, solo cambiás `ChatService`.
3. **El schema está separado.** Si cambia la validación, no tocás la lógica de rutas.
4. **Autoload friendly.** Fastify escanea `routes/chat/index.ts` y lo registra en `/chat`. Cero configuración.

---

## 🔗 Stack Tecnológico

| Componente | Librería | Versión | Propósito |
|------------|----------|---------|-----------|
| Framework HTTP | `fastify` | ^5.8.5 | Servidor HTTP + plugin system |
| CLI | `fastify-cli` | ^7.4.1 | Arranque, hot reload, estructura |
| WebSocket | `@fastify/websocket` | ^11.x (a instalar) | Soporte WebSocket nativo sobre HTTP |
| Autoload | `@fastify/autoload` | ^6.0.0 | Carga automática de plugins y rutas |
| Utilidades HTTP | `@fastify/sensible` | ^6.0.0 | Errores HTTP semánticos (404, 500, etc.) |
| Encapsulación | `fastify-plugin` | ^5.0.0 | Rompe encapsulación para compartir decorators |
| TypeScript | `typescript` | ^6.0.3 | Tipado estático |
| Config TS | `fastify-tsconfig` | ^3.0.0 | Configuración base de TS para Fastify |
| Testing | `node:test` + `c8` | nativo + ^11.0.0 | Tests unitarios/integración + cobertura |
| Dev runner | `concurrently` | ^9.2.1 | Ejecutar TS compiler + Fastify en paralelo |

### Dependencia a instalar

```bash
cd backend
npm install @fastify/websocket
```

---

## 🧪 Estrategia de Testing

### ¿Qué testear?

| Tipo | Qué | Archivo |
|------|-----|---------|
| **Unitario** | `ChatService` — lógica de broadcast, add/remove clients | `test/services/chat.service.test.ts` (futuro) |
| **Integración** | Ruta WebSocket — conectar, enviar, recibir, desconectar | `test/routes/chat.test.ts` |
| **Integración** | Ruta HTTP — GET /chat/history, GET /chat/status | `test/routes/chat.test.ts` |

### ¿Cómo testear WebSocket con Fastify?

Fastify tiene el método `app.inject()` que simula peticiones HTTP, pero para WebSocket se necesita el cliente `ws` y el servidor corriendo:

```typescript
import { test } from 'node:test'
import { build } from '../helper.js'
import WebSocket from 'ws'

test('chat WebSocket', async (t) => {
  const app = await build(t)
  await app.listen({ port: 0 }) // puerto aleatorio
  const address = app.server.address()
  const port = typeof address === 'object' ? address.port : 0

  const ws = new WebSocket(`ws://localhost:${port}/chat`)

  await new Promise<void>((resolve, reject) => {
    ws.on('open', resolve)
    ws.on('error', reject)
  })

  // Enviar mensaje
  ws.send('Hola mundo')

  // Recibir respuesta (broadcast)
  const response = await new Promise<string>((resolve) => {
    ws.on('message', (data) => resolve(data.toString()))
  })

  // Verificar
  const parsed = JSON.parse(response)
  assert.equal(parsed.text, 'Hola mundo')

  ws.close()
  await app.close()
})
```

---

## 📚 Conceptos Clave (Glosario)

### Plugin de Fastify
Una función asíncrona que recibe `(fastify, opts)` y registra rutas, decorators, hooks. Es la unidad fundamental de encapsulación en Fastify. Cada plugin tiene su propio scope aislado.

### Autoload
Mecanismo de `@fastify/autoload` que escanea directorios (`routes/`, `plugins/`), importa cada archivo, y lo registra como plugin automáticamente. Sin autoload, habría que hacer `fastify.register(plugin)` manualmente para cada archivo.

### fastify-plugin
Wrapper que "rompe" la encapsulación de un plugin. Los decorators registrados dentro de un plugin con `fp()` son visibles en el scope padre. Se usa para plugins de infraestructura que deben compartir estado (DB, WebSocket server, etc.).

### WebSocket (nativo)
Protocolo que permite comunicación bidireccional full-duplex sobre una única conexión TCP. A diferencia de HTTP (request-response), WebSocket mantiene la conexión abierta y permite enviar datos en ambas direcciones en cualquier momento.

### @fastify/websocket
Plugin oficial de Fastify que añade soporte WebSocket. Expone `fastify.websocketServer` y permite definir rutas con `{ websocket: true }`. El handshake (HTTP → WS upgrade) es manejado automáticamente.

### JSON Schema
Estándar para describir y validar estructuras JSON. Fastify lo usa para validar body, params, querystring, y headers de las peticiones. También para serializar respuestas de forma eficiente (2-3x más rápido que `JSON.stringify` sin schema).

### Service (nuestra definición)
Clase o módulo TypeScript puro que contiene la lógica de negocio. No depende de Fastify ni de HTTP. Se instancia manualmente en el plugin de rutas y se pasa como dependencia. Es el equivalente a un `@Injectable()` de NestJS.

---

## 🚧 Limitaciones del MVP

| Limitación | Motivo | Plan futuro |
|---|---|---|
| Sin autenticación | MVP: chat simple | Fase 2: JWT + `@fastify/jwt` |
| Sin persistencia | MVP: mensajes en memoria | Fase 2: SQLite/PostgreSQL |
| Sin salas/rooms | MVP: un solo chat global | Fase 2: `Map<string, Set<WebSocket>>` |
| Sin nombres de usuario | MVP: mensajes anónimos | Fase 2: Login + `ChatClient.username` |
| Sin HTTPS/WSS | MVP: desarrollo local | Producción: reverse proxy (nginx/Caddy) |

Cada limitación es una decisión consciente, no una omisión. El MVP debe ser lo más simple posible para validar el concepto.

---

## 📖 Referencias

- [Fastify — Getting Started](https://fastify.dev/docs/latest/Guides/Getting-Started/)
- [Fastify — The hitchhiker's guide to plugins](https://fastify.dev/docs/latest/Guides/Plugins-Guide/)
- [Fastify — Testing](https://fastify.dev/docs/latest/Guides/Testing/)
- [@fastify/websocket — GitHub](https://github.com/fastify/fastify-websocket)
- [WebSocket API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [@fastify/autoload — GitHub](https://github.com/fastify/fastify-autoload)
- [fastify-plugin — GitHub](https://github.com/fastify/fastify-plugin)
- [JSON Schema — Sitio oficial](https://json-schema.org/)
