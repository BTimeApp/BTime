import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import next from 'next';
// import { v4 as uuidv4 } from 'uuid';
import {config} from './config';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

interface RoomUser {
  userId: string;
  joinedAt: number;
}

interface Room {
  users: RoomUser[];
  state: 'waiting' | 'started';
  hostId: string;
}

interface CustomSocket extends Socket {
  roomId?: string;
  userId?: string;
}

const rooms: Record<string, Room> = {}; // In-memory room store

export async function start_server(): Promise<void> {
  await app.prepare();

  const server = express();
  const httpServer = createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket: CustomSocket) => {
    socket.on('join-room', ({ roomId, userId }: { roomId: string; userId: string }) => {
      const joinedAt = Date.now();

      if (!rooms[roomId]) {
        rooms[roomId] = {
          users: [],
          state: 'waiting',
          hostId: userId,
        };
      }

      rooms[roomId].users.push({ userId, joinedAt });

      const sortedUsers = [...rooms[roomId].users].sort((a, b) => a.joinedAt - b.joinedAt);
      const hostId = sortedUsers[0].userId;

      socket.join(roomId);
      socket.roomId = roomId;
      socket.userId = userId;

      io.to(roomId).emit('room-update', {
        users: rooms[roomId].users,
        roomState: rooms[roomId].state,
        hostId,
      });
    });

    socket.on('start-room', () => {
      const room = rooms[socket.roomId!];
      if (!room) return;

      const hostId = room.users.sort((a, b) => a.joinedAt - b.joinedAt)[0].userId;
      if (hostId === socket.userId) {
        room.state = 'started';
        io.to(socket.roomId!).emit('room-update', {
          users: room.users,
          state: room.state,
          hostId,
        });
      }
    });

    socket.on('disconnect', () => {
      const { roomId, userId } = socket;
      if (!roomId || !userId || !rooms[roomId]) return;

      rooms[roomId].users = rooms[roomId].users.filter((u) => u.userId !== userId);

      if (rooms[roomId].users.length === 0) {
        delete rooms[roomId];
      } else {
        const newHostId = rooms[roomId].users.sort((a, b) => a.joinedAt - b.joinedAt)[0].userId;

        io.to(roomId).emit('room-update', {
          users: rooms[roomId].users,
          state: rooms[roomId].state,
          hostId: newHostId,
        });
      }
    });
  });

  // Let Next.js handle all other requests
  server.use((req: Request, res: Response) => {
    return handle(req, res);
  });

  const PORT = config.server.port;
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`> Server listening on http://0.0.0.0:${PORT}`);
  });
}
