import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';

// ── Types ──────────────────────────────────────────

export interface RoomUser {
  socketId: string;
  username: string;
  joinedAt: Date;
}

export interface RoomInfo {
  name: string;
  users: Map<string, RoomUser>;
}

// ── Service ────────────────────────────────────────

/**
 * In-memory room state management.
 * Tracks which users are in which rooms without a database.
 */
@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  // roomName → RoomInfo
  private readonly rooms = new Map<string, RoomInfo>();

  // ── Public API ──────────────────────────────────

  /**
   * Add a user to a room. Creates the room if it doesn't exist.
   */
  addUser(room: string, socketId: string, username: string): void {
    if (!this.rooms.has(room)) {
      this.rooms.set(room, { name: room, users: new Map() });
      this.logger.log(`Room created: "${room}"`);
    }

    const roomInfo = this.rooms.get(room)!;
    roomInfo.users.set(socketId, {
      socketId,
      username,
      joinedAt: new Date(),
    });

    this.logger.log(
      `User "${username}" (${socketId}) joined room "${room}" (${roomInfo.users.size} users)`,
    );
  }

  /**
   * Remove a specific user from a specific room.
   * Deletes the room if it becomes empty.
   */
  removeUser(room: string, socketId: string): void {
    const roomInfo = this.rooms.get(room);
    if (!roomInfo) return;

    const user = roomInfo.users.get(socketId);
    if (user) {
      roomInfo.users.delete(socketId);
      this.logger.log(
        `User "${user.username}" (${socketId}) left room "${room}"`,
      );
    }

    // Clean up empty rooms
    if (roomInfo.users.size === 0) {
      this.rooms.delete(room);
      this.logger.log(`Room deleted (empty): "${room}"`);
    }
  }

  /**
   * Remove a disconnected socket from ALL rooms it was in.
   * Called from handleDisconnect() in the gateway.
   */
  removeUserFromAllRooms(client: Socket): void {
    // Socket.IO tracks rooms per socket via client.rooms (Set<string>)
    // We iterate and clean up our in-memory map
    for (const room of client.rooms) {
      // Skip the default room (socket.io auto-assigns a room named after the socket ID)
      if (room === client.id) continue;

      this.removeUser(room, client.id);
    }
  }

  /**
   * Get all users currently in a specific room.
   */
  getUsersInRoom(room: string): RoomUser[] {
    const roomInfo = this.rooms.get(room);
    if (!roomInfo) return [];
    return Array.from(roomInfo.users.values());
  }

  /**
   * Get the username for a socket in a specific room.
   */
  getUsername(socketId: string, room: string): string | undefined {
    const roomInfo = this.rooms.get(room);
    if (!roomInfo) return undefined;
    return roomInfo.users.get(socketId)?.username;
  }

  /**
   * Get names of all active (non-empty) rooms.
   */
  getAllRoomNames(): string[] {
    return Array.from(this.rooms.keys());
  }

  /**
   * Check if a room exists.
   */
  hasRoom(room: string): boolean {
    return this.rooms.has(room);
  }
}
