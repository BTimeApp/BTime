import { Redis } from "ioredis";

export const connectToRedis = async () => {
  // connect to Redis
  const pubClient = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!),
  });
  const subClient = pubClient.duplicate();

  //in ioredis, we don't need a connect() call. Redis handles for us

  console.log("Connected to Redis.");

  return { pubClient, subClient };
};
