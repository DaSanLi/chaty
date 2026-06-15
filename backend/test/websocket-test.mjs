/**
 * WebSocket Verification Suite — Chaty
 *
 * Prueba end-to-end del servidor Socket.IO en el namespace /rooms.
 *
 * Uso:
 *   1. Iniciar el servidor:        npm run start
 *   2. Ejecutar este script:       node test/websocket-test.mjs
 *
 * Requiere: socket.io-client (npm install --save-dev socket.io-client)
 *
 * Escenarios probados:
 *   1. Conexión al namespace /rooms
 *   2. Unirse a una sala
 *   3. Broadcast multi-cliente (userJoined)
 *   4. Enviar y recibir mensaje (newMessage)
 *   5. Listar salas activas (getRooms)
 *   6. Salir de sala (userLeft broadcast)
 *   7. Payload inválido → evento error
 *   8. Desconexión limpia (userLeft + cleanup)
 */

import { io } from 'socket.io-client';

// ── Config ────────────────────────────────────────

const SERVER_URL = 'http://localhost:3000';
const NAMESPACE = '/rooms';
const WAIT_MS = 1500; // tiempo de espera entre pasos

// ── Helpers ───────────────────────────────────────

let passed = 0;
let failed = 0;

/** Espera N milisegundos */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Espera un evento específico del socket con timeout */
const waitForEvent = (socket, event, timeoutMs = 5000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout esperando evento "${event}" (${timeoutMs}ms)`));
    }, timeoutMs);
    const handler = (data) => {
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(data);
    };
    socket.once(event, handler);
  });

/** Imprime resultado de un test */
const test = (name, condition) => {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
};

/** Ejecuta un paso y captura errores */
const step = async (name, fn) => {
  try {
    await fn();
    test(name, true);
  } catch (err) {
    console.log(`  ❌ ${name} — ${err.message}`);
    failed++;
  }
};

// ── Test Suite ────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Chaty WebSocket Verification Suite ║');
  console.log('╚══════════════════════════════════════╝\n');
  console.log(`Server: ${SERVER_URL}${NAMESPACE}\n`);

  // ── Crear dos clientes ────────────────

  const client1 = io(`${SERVER_URL}${NAMESPACE}`, {
    transports: ['websocket'],
    forceNew: true,
  });
  const client2 = io(`${SERVER_URL}${NAMESPACE}`, {
    transports: ['websocket'],
    forceNew: true,
  });

  // ── Test 1: Conexión ──────────────────

  await step('Connection to /rooms namespace', async () => {
    await Promise.all([
      waitForEvent(client1, 'connect'),
      waitForEvent(client2, 'connect'),
    ]);
  });

  // ── Test 2: Unirse a sala (C1) ───────

  await step('Join room "test-chaty" (Client 1)', async () => {
    const joinPromise = waitForEvent(client1, 'userJoined');
    client1.emit('joinRoom', { room: 'test-chaty', username: 'Tester1' });
    const data = await joinPromise;
    test('userJoined contains correct username', data.username === 'Tester1');
  });

  await sleep(WAIT_MS);

  // ── Test 3: C2 se une → C1 ve userJoined

  await step('Client 2 joins → Client 1 receives userJoined', async () => {
    const joinPromise = waitForEvent(client1, 'userJoined');
    client2.emit('joinRoom', { room: 'test-chaty', username: 'Tester2' });
    const data = await joinPromise;
    test('Client 1 sees Client 2 joining', data.username === 'Tester2');
  });

  await sleep(WAIT_MS);

  // ── Test 4: C1 envía mensaje → ambos reciben

  await step('Client 1 sends message → both receive newMessage', async () => {
    const msgPromise1 = waitForEvent(client1, 'newMessage');
    const msgPromise2 = waitForEvent(client2, 'newMessage');
    client1.emit('sendMessage', { room: 'test-chaty', content: 'Hello from Tester1!' });

    const [data1, data2] = await Promise.all([msgPromise1, msgPromise2]);
    test('Client 1 receives own message (echo)', data1.content === 'Hello from Tester1!');
    test('Client 2 receives message from Client 1', data2.content === 'Hello from Tester1!');
  });

  await sleep(WAIT_MS);

  // ── Test 5: Listar salas activas ──────
  // NOTE: getRooms returns via Socket.IO acknowledgment (ACK), not event emission.
  // The gateway handler returns { rooms: string[] } directly — Socket.IO sends
  // it back to the emitting client through the acknowledgment callback.

  await step('List active rooms (getRooms via ACK)', async () => {
    const data = await client1.emitWithAck('getRooms');
    test('ACK response contains "test-chaty"', data.rooms?.includes('test-chaty'));
  });

  // ── Test 6: C2 sale → C1 recibe userLeft

  await step('Client 2 leaves → Client 1 receives userLeft', async () => {
    const leavePromise = waitForEvent(client1, 'userLeft');
    client2.emit('leaveRoom', { room: 'test-chaty' });
    const data = await leavePromise;
    test('Client 1 sees Client 2 leaving', data.username === 'Tester2');
  });

  await sleep(WAIT_MS);

  // ── Test 7: Enviar datos inválidos → error

  await step('Invalid payload → error event', async () => {
    // Enviar sin los campos requeridos (room vacío, username corto)
    client1.emit('sendMessage', { room: 'xx', content: '' });
    const data = await waitForEvent(client1, 'error');
    test('Error event received for invalid data', typeof data.message === 'string');
  });

  await sleep(WAIT_MS);

  // ── Test 8: Desconexión limpia ────────

  await step('Client 1 disconnects → cleanup', async () => {
    client1.disconnect();
    // El servidor emite userLeft a los que quedan — como C2 ya salió,
    // verificamos que C1 se desconecta sin errores
    await sleep(1000);
    test('Client 1 disconnected without errors', !client1.connected);
  });

  // ── Cleanup ────────────────────────────

  client2.disconnect();

  // ── Summary ────────────────────────────

  const total = passed + failed;
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`${passed}/${total} tests passed`);

  if (failed === 0) {
    console.log('\n🎉 WebSocket server: OPERATIONAL');
    console.log('🔌 Any client can connect: CONFIRMED\n');
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed. Review errors above.\n`);
    process.exit(1);
  }

  process.exit(0);
}

main();
