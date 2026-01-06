import type { AuthStore } from "@/stores/auth-store";
import type { Socket } from "socket.io-client";

export interface RouterContext {
  socket: Socket;
  authStore: typeof AuthStore;
}
