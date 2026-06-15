import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe, Logger, UseFilters } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RoomsService } from './rooms.service';
import { JoinRoomDto } from './dto/join-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { WsExceptionFilter } from './filters/ws-exception.filter';

/**
 * WebSocket gateway for real-time chat rooms.
 *
 * Architecture:
 * - Uses Socket.IO "rooms" as the underlying pub/sub mechanism.
 * - socket.join(roomName) → subscribes client to room events.
 * - client.to(roomName).emit(event, data) → broadcasts to room members (excludes sender).
 * - In-memory RoomsService tracks usernames and room metadata.
 *
 * Lifecycle (OnGatewayInit → OnGatewayConnection → handlers → OnGatewayDisconnect):
 *   1. afterInit() — server instance is ready.
 *   2. handleConnection() — client connected; handshake available for auth.
 *   3. @SubscribeMessage handlers — joinRoom, sendMessage, leaveRoom, getRooms.
 *   4. handleDisconnect() — cleanup: remove user from all rooms.
 */
@UseFilters(WsExceptionFilter)
@WebSocketGateway({
  namespace: 'rooms',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class RoomsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  /**
   * Reference to the namespace server (saved from afterInit).
   * Used in handleDisconnect where the client socket is no longer reliable for broadcast.
   * This guarantees broadcasts stay scoped to the /rooms namespace.
   */
  private namespaceServer!: Server;

  private readonly logger = new Logger(RoomsGateway.name);

  constructor(private readonly roomsService: RoomsService) {}

  // ── Lifecycle Hooks ─────────────────────────────

  /**
   * Called once when the WebSocket server initializes.
   * `server` is the native Socket.IO Server instance.
   */
  afterInit(server: Server): void {
    this.namespaceServer = server;
    this.logger.log('WebSocket RoomsGateway initialized on namespace /rooms');
  }

  /**
   * Called every time a new client connects via WebSocket.
   * `client.handshake` provides access to headers, auth token, and query params —
   * useful for future JWT cookie-based authentication.
   */
  async handleConnection(client: Socket): Promise<void> {
    this.logger.log(
      `Client connected: ${client.id} (transport: ${client.conn.transport.name})`,
    );

    // Future: extract JWT from client.handshake.headers.cookie or client.handshake.auth.token
    // For now, connection is open to all clients (no auth).
  }

  /**
   * Called when a client disconnects.
   * Cleans up the user from all rooms they were in and broadcasts userLeft events.
   */
  async handleDisconnect(client: Socket): Promise<void> {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Iterate over all rooms the socket was in (excluding its own default room)
    for (const room of client.rooms) {
      if (room === client.id) continue; // skip socket's private room

      const username = this.roomsService.getUsername(client.id, room);

      // Broadcast userLeft to remaining room members (namespace-scoped)
      this.namespaceServer.to(room).emit('userLeft', {
        username: username ?? 'Unknown',
        timestamp: new Date().toISOString(),
      });

      // Broadcast updated user list
      this.namespaceServer.to(room).emit('roomUsers', {
        room,
        users: this.roomsService.getUsersInRoom(room),
      });
    }

    // Clean up in-memory state
    this.roomsService.removeUserFromAllRooms(client);
  }

  // ── Event Handlers ──────────────────────────────

  /**
   * Join a room.
   *
   * Client sends: { room: string, username: string }
   * - socket.join(room) subscribes the client to that Socket.IO room.
   * - All other clients in the room receive userJoined and roomUsers events.
   */
  @SubscribeMessage('joinRoom')
  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) =>
        new WsException(
          errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; '),
        ),
    }),
  )
  async handleJoinRoom(
    @MessageBody() dto: JoinRoomDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    // Check if already in room (prevent duplicate)
    if (client.rooms.has(dto.room)) {
      throw new WsException(`Already in room "${dto.room}"`);
    }

    // Subscribe client to the Socket.IO room channel
    await client.join(dto.room);

    // Track user in our in-memory service
    this.roomsService.addUser(dto.room, client.id, dto.username);

    // Notify other room members (excludes the joining user)
    client.to(dto.room).emit('userJoined', {
      username: dto.username,
      timestamp: new Date().toISOString(),
    });

    // Broadcast updated user list to other room members
    client.to(dto.room).emit('roomUsers', {
      room: dto.room,
      users: this.roomsService.getUsersInRoom(dto.room),
    });

    this.logger.log(
      `"${dto.username}" joined room "${dto.room}" (${this.roomsService.getUsersInRoom(dto.room).length} users)`,
    );
  }

  /**
   * Send a message to a room.
   *
   * Client sends: { room: string, content: string }
   * - Message is broadcast to OTHER clients in the room (excludes sender).
   * - Frontend should use optimistic UI to display the sent message immediately.
   */
  @SubscribeMessage('sendMessage')
  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) =>
        new WsException(
          errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; '),
        ),
    }),
  )
  async handleSendMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    // Verify the client is actually in the room
    const username = this.roomsService.getUsername(client.id, dto.room);
    if (!username) {
      throw new WsException(
        `You must join room "${dto.room}" before sending messages`,
      );
    }

    // Broadcast to other members of the room (excludes sender)
    client.to(dto.room).emit('newMessage', {
      username,
      content: dto.content,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Leave a room.
   *
   * Client sends: { room: string }
   * - socket.leave(room) unsubscribes the client.
   * - Other members receive userLeft and updated roomUsers.
   */
  @SubscribeMessage('leaveRoom')
  @UsePipes(
    new ValidationPipe({
      exceptionFactory: (errors) =>
        new WsException(
          errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('; '),
        ),
    }),
  )
  async handleLeaveRoom(
    @MessageBody() dto: LeaveRoomDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const username = this.roomsService.getUsername(client.id, dto.room);

    // Unsubscribe from the Socket.IO room channel
    await client.leave(dto.room);

    // Remove from in-memory tracking
    this.roomsService.removeUser(dto.room, client.id);

    // Notify remaining members (excludes the leaving user)
    if (username) {
      client.to(dto.room).emit('userLeft', {
        username,
        timestamp: new Date().toISOString(),
      });
    }

    // Broadcast updated user list to remaining members
    client.to(dto.room).emit('roomUsers', {
      room: dto.room,
      users: this.roomsService.getUsersInRoom(dto.room),
    });

    this.logger.log(
      `"${username ?? 'Unknown'}" left room "${dto.room}"`,
    );
  }

  /**
   * Get the list of all active rooms.
   *
   * Client sends: (no payload)
   * Returns: { rooms: string[] }
   */
  @SubscribeMessage('getRooms')
  handleGetRooms(): { rooms: string[] } {
    return { rooms: this.roomsService.getAllRoomNames() };
  }
}
