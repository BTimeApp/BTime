import express, { Request, Response } from "express";
import { createServer } from "http";
import next from "next";
import { config } from "./config";
import { connectToDB } from "@/server/database/database";
import {
  IRoom
} from "@/types/room";
import { Types } from "mongoose";
import { IUser } from "@/types/user";
import { initSocket } from "./socket/init_socket";

export const rooms: Map<Types.ObjectId, IRoom> = new Map<Types.ObjectId, IRoom>(); // In-memory room store
export const users: Map<Types.ObjectId, IUser> = new Map<Types.ObjectId, IUser>(); // In-memory user store

export async function startServer(): Promise<void> {
  const app = express();
  const isProd = (process.env.NODE_ENV === 'production');

  app.set('prod', isProd);
  const nextApp = next({ dev: !isProd });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();
  await connectToDB();

  const httpServer = createServer(app);

  app.use(express.json()); // for parsing application/json
  app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
  
  initSocket(httpServer);

  // TODO: add and handle middleware

  // Let Next.js handle all other requests
  app.use((req: Request, res: Response) => {
    return handle(req, res);
  });

  const PORT = config.server.port;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`> Server listening on http://0.0.0.0:${PORT}`);
  });
}
