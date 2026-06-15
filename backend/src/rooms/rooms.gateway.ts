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
 * - server.to(roomName).emit(event, data) → broadcasts to all room members.
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

  private readonly logger = new Logger(RoomsGateway.name);

  constructor(private readonly roomsService: RoomsService) {}

  // ── Lifecycle Hooks ─────────────────────────────

  /**
   * Called once when the WebSocket server initializes.
   * `server` is the native Socket.IO Server instance.
   */
  afterInit(_server: Server): void {
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

      // Broadcast userLeft to remaining room members
      this.server.to(room).emit('userLeft', {
        username: username ?? 'Unknown',
        timestamp: new Date().toISOString(),
      });

      // Broadcast updated user list
      this.server.to(room).emit('roomUsers', {
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

    // Notify all room members (including the new user)
    this.server.to(dto.room).emit('userJoined', {
      username: dto.username,
      timestamp: new Date().toISOString(),
    });

    // Broadcast updated user list to the room
    this.server.to(dto.room).emit('roomUsers', {
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
   * - Message is broadcast to ALL clients in the room (including sender).
   * - Use client.broadcast.to(room) instead of server.to(room) to exclude sender.
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

    // Broadcast to all members of the room
    this.server.to(dto.room).emit('newMessage', {
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

    // Notify remaining members
    if (username) {
      this.server.to(dto.room).emit('userLeft', {
        username,
        timestamp: new Date().toISOString(),
      });
    }

    // Broadcast updated user list
    this.server.to(dto.room).emit('roomUsers', {
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
