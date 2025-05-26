import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import next from 'next';
// import { v4 as uuidv4 } from 'uuid';
import {config} from './config';
import 'module-alias/register';
import { connectToDB } from '@/server/database/database';
import { IRoom } from '@/types/room';
import { Types } from 'mongoose';
import { IRoomUser } from '@/types/roomUser';
import { ISolve } from '@/types/solve';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();


//defines useful state variables we want to maintain over the lifestyle of a socket connection (only visible server-side)
interface CustomSocket extends Socket {
  roomId?: Types.ObjectId;
  userId?: Types.ObjectId;
}

const rooms: Map<Types.ObjectId, IRoom> = new Map<Types.ObjectId, IRoom>(); // In-memory room store

export async function startServer(): Promise<void> {
  await app.prepare();
  await connectToDB();

  const server = express();
  const httpServer = createServer(server);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });


  io.on('connection', (socket: CustomSocket) => {
    //by default, roomId and userId will be undefined

    socket.on('join_room', ({ roomId, userId }: { roomId: Types.ObjectId; userId: Types.ObjectId }) => {
      let room: IRoom | undefined = rooms.get(roomId);
      const roomUser: IRoomUser = {
        user: userId,
        points: 0,
        setWins: 0,
        joinedAt: new Date(),
        competing: false,
      }

      // temporary - create the room if it doesn't exist. TODO move this to a create_room event
      if (!room) {
        room = {
          roomName: roomId.toString(),
          host: userId, 
          users: {userId: roomUser},
          solves: [],
          currentSet: 1,
          currentSolve: 1,
          roomEvent: '333', 
          roomFormat: 'racing',
          matchFormat: 'best_of', //how many sets to take to win
          setFormat: 'best_of', //how to win a set
          nSets: 3, //number for match format
          nSolves: 5, //number for set format 
          isPrivate: false,
          state: 'waiting',
          password: undefined,
        };
      
        rooms.set(roomId, room);

        //TODO - write to mongoDB
        return;
      }

      socket.join(roomId.toString());

      socket.roomId = roomId;
      socket.userId = userId;

      io.to(roomId.toString()).emit('room_update', room);
    });

    socket.on('start_room', () => {
      if (socket.roomId) {
        io.to(socket.roomId?.toString()).emit('room_started', {
        });
      }
    });

    socket.on('disconnect', () => {
      
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
