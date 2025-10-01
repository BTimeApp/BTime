import { Redis } from "ioredis";

export const connectToRedis = async () => {
  // connect to Redis
  const pubClient = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!),
  });
  const subClient = pubClient.duplicate();
  const dataClient = pubClient.duplicate();

  //in ioredis, we don't need a connect() call. Redis handles for us

  console.log("Connected to Redis.");

  // pubClient, subClient for pub/sub use with socket.io. Use storeClient to read and write to the redis store.
  return { pubClient, subClient, dataClient };
};
