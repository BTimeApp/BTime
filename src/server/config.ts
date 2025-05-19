// config.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
    server: {
      port: 8080,
    },
    socketio: {
      port: 9000,
    }, 
    database: {
      uri: "mongodb://127.0.0.1/btime",
    },
  };