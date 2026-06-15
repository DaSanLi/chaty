import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { RoomsGateway } from './rooms.gateway';
import { RoomsService } from './rooms.service';
import { JoinRoomDto } from './dto/join-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { LeaveRoomDto } from './dto/leave-room.dto';
import { WsException } from '@nestjs/websockets';

// ── Mocks ─────────────────────────────────────────

const createMockServer = () =>
  ({
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  }) as unknown as Server;

/**
 * Creates a mock Socket.IO client.
 * Tracks joined rooms in a local Set to simulate real behavior:
 * - join(room) adds to the set
 * - leave(room) removes from the set
 * - client.rooms reflects the Set (used by handleDisconnect to iterate)
 */
const createMockClient = (id = 'test-socket-id') => {
  const rooms = new Set<string>([id]); // socket.io auto-adds own id as default room

  return {
    id,
    conn: { transport: { name: 'websocket' } },
    handshake: { headers: {}, auth: {} },
    rooms,
    join: jest.fn().mockImplementation((room: string) => {
      rooms.add(room);
    }),
    leave: jest.fn().mockImplementation((room: string) => {
      rooms.delete(room);
    }),
    emit: jest.fn(),
  } as unknown as Socket;
};

// ── Suite ─────────────────────────────────────────

describe('RoomsGateway', () => {
  let gateway: RoomsGateway;
  let roomsService: RoomsService;
  let mockServer: Server;
  let mockClient: Socket;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomsGateway, RoomsService],
    }).compile();

    gateway = module.get<RoomsGateway>(RoomsGateway);
    roomsService = module.get<RoomsService>(RoomsService);

    // Inject mocks into the gateway instance
    mockServer = createMockServer();
    gateway.server = mockServer;

    // Fresh client for each test
    mockClient = createMockClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset in-memory state
    (roomsService as any).rooms.clear();
  });

  // ── Lifecycle ───────────────────────────────────

  describe('afterInit', () => {
    it('should log initialization message', () => {
      expect(() => gateway.afterInit(mockServer)).not.toThrow();
    });
  });

  describe('handleConnection', () => {
    it('should accept client connection', async () => {
      await expect(
        gateway.handleConnection(mockClient),
      ).resolves.toBeUndefined();
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up user from all rooms on disconnect', async () => {
      // Setup: add client to two rooms
      roomsService.addUser('lobby', mockClient.id, 'Alice');
      mockClient.rooms.add('lobby');
      roomsService.addUser('general', mockClient.id, 'Alice');
      mockClient.rooms.add('general');

      await gateway.handleDisconnect(mockClient);

      // Verify broadcasts
      expect(mockServer.to).toHaveBeenCalledWith('lobby');
      expect(mockServer.to).toHaveBeenCalledWith('general');
      expect(mockServer.emit).toHaveBeenCalledTimes(4); // userLeft + roomUsers per room

      // Verify cleanup
      expect(roomsService.getUsersInRoom('lobby')).toHaveLength(0);
      expect(roomsService.getUsersInRoom('general')).toHaveLength(0);
    });
  });

  // ── joinRoom ────────────────────────────────────

  describe('handleJoinRoom', () => {
    const dto: JoinRoomDto = { room: 'lobby', username: 'Alice' };

    it('should join client to a room and broadcast events', async () => {
      await gateway.handleJoinRoom(dto, mockClient);

      // Verify socket joined
      expect(mockClient.join).toHaveBeenCalledWith('lobby');

      // Verify tracking
      expect(roomsService.getUsersInRoom('lobby')).toHaveLength(1);
      expect(roomsService.getUsersInRoom('lobby')[0].username).toBe('Alice');

      // Verify broadcasts
      expect(mockServer.to).toHaveBeenCalledWith('lobby');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'userJoined',
        expect.objectContaining({ username: 'Alice' }),
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        'roomUsers',
        expect.objectContaining({ room: 'lobby' }),
      );
    });

    it('should throw WsException if already in the room', async () => {
      // Simulate already in room
      mockClient.rooms.add('lobby');

      await expect(gateway.handleJoinRoom(dto, mockClient)).rejects.toThrow(
        WsException,
      );
    });
  });

  // ── sendMessage ─────────────────────────────────

  describe('handleSendMessage', () => {
    const joinDto: JoinRoomDto = { room: 'lobby', username: 'Alice' };
    const msgDto: SendMessageDto = { room: 'lobby', content: 'Hello!' };

    it('should broadcast message to room', async () => {
      // Setup: join first
      await gateway.handleJoinRoom(joinDto, mockClient);
      jest.clearAllMocks();

      await gateway.handleSendMessage(msgDto, mockClient);

      expect(mockServer.to).toHaveBeenCalledWith('lobby');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'newMessage',
        expect.objectContaining({
          username: 'Alice',
          content: 'Hello!',
        }),
      );
    });

    it('should throw WsException if not in room', async () => {
      await expect(
        gateway.handleSendMessage(msgDto, mockClient),
      ).rejects.toThrow(WsException);
    });
  });

  // ── leaveRoom ───────────────────────────────────

  describe('handleLeaveRoom', () => {
    const dto: LeaveRoomDto = { room: 'lobby' };

    it('should leave room and broadcast departure', async () => {
      // Setup: join first
      await gateway.handleJoinRoom(
        { room: 'lobby', username: 'Alice' },
        mockClient,
      );
      jest.clearAllMocks();

      await gateway.handleLeaveRoom(dto, mockClient);

      // Verify socket left
      expect(mockClient.leave).toHaveBeenCalledWith('lobby');

      // Verify tracking
      expect(roomsService.getUsersInRoom('lobby')).toHaveLength(0);

      // Verify broadcasts
      expect(mockServer.to).toHaveBeenCalledWith('lobby');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'userLeft',
        expect.objectContaining({ username: 'Alice' }),
      );
    });
  });

  // ── getRooms ────────────────────────────────────

  describe('handleGetRooms', () => {
    it('should return list of active rooms', async () => {
      await gateway.handleJoinRoom(
        { room: 'lobby', username: 'Alice' },
        mockClient,
      );

      const result = gateway.handleGetRooms();
      expect(result.rooms).toContain('lobby');
    });

    it('should return empty list when no rooms exist', () => {
      const result = gateway.handleGetRooms();
      expect(result.rooms).toEqual([]);
    });
  });
});
