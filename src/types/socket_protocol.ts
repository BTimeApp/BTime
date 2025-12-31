import { RedisStores } from "@/server/redis/stores";
import { LogLevel } from "@/types/log-levels";
import { Server } from "socket.io";

/**
 * TODO - find a way to move the validation functions in here so we can just run .apply() on each or something
 *
 *
 * ROOM_EXISTS - room exists (room:[roomid] key in redis has data)
 * ROOMUSER_EXISTS - room exists AND the user is listed as a user in the room
 * USER_IS_HOST - room exists AND the user is the room's host
 * consider adding USER_EXISTS - the user has an active session logged in redis
 */
type RoomEventValidation = "USER_IS_HOST" | "ROOM_EXISTS" | "ROOMUSER_EXISTS";
type RoomEventHandlerFunction<TArgs> = (
  io: Server,
  stores: RedisStores,
  roomId: string,
  userId: string,
  args: TArgs
) => Promise<void>;

type RoomEventConfig =
  | {
      isRoomEvent: false;
    }
  | {
      isRoomEvent: true;
      validations: RoomEventValidation[];
    };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SocketClientEventConfig<TArgs = any> {
  // value: string;
  args: TArgs;
  logArgs: boolean;
  logLevel: LogLevel;
  roomEventConfig: RoomEventConfig;
}

export type SocketClientEventConfigMap = {
  [key: string]: SocketClientEventConfig;
};

/**
 * Our API for available client->server socket events.
 *
 *
 * Note: Every room event added here has to be filled out in room-event-handlers.tsx
 */
export const SOCKET_CLIENT_CONFIG = {
  JOIN_ROOM: {
    args: {} as { roomId: string; password?: string },
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS"],
    },
  },
  /**
   * User creates a room.
   * In terms of room events, this is a special case. Do not count it as a room event.
   */
  CREATE_ROOM: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: false,
    },
  },

  /**
   * Host submits a room settings update
   */
  UPDATE_ROOM: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS"],
    },
  },

  /**
   * User broadcasts an update to their local solve status
   */
  UPDATE_SOLVE_STATUS: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "debug",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS"],
    },
  },

  /**
   * User starts a live timer. A live timer is any timer that the client can access the live state of (keyboard, stackmat, smartcube, etc)
   */
  START_LIVE_TIMER: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "debug",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS"],
    },
  },

  /**
   * User stops a live timer. A live timer is any timer that the client can access the live state of (keyboard, stackmat, smartcube, etc)
   */
  STOP_LIVE_TIMER: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "debug",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS"],
    },
  },

  /**
   * User toggles whether they are competing or spectating
   */
  TOGGLE_COMPETING: {
    args: {} as { competing: boolean },
    logArgs: true,
    logLevel: "debug",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS"],
    },
  },

  /**
   * User submits a result to the backend
   */
  SUBMIT_RESULT: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS"],
    },
  },

  /**
   * Host creates new teams. We force a batched creation to avoid race condition on server.
   */
  CREATE_TEAMS: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS", "USER_IS_HOST"],
    },
  },

  /**
   * Host deletes a team
   */
  DELETE_TEAM: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS", "USER_IS_HOST"],
    },
  },

  /**
   * User joins a team
   */
  JOIN_TEAM: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS"],
    },
  },

  /**
   * User leaves a team (explicit action)
   */
  LEAVE_TEAM: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS"],
    },
  },

  /**
   * Host starts the room (bring from WAITING to STARTED)
   */
  START_ROOM: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS", "USER_IS_HOST"],
    },
  },

  /**
   * Host triggers a rematch (bring from FINISHED to WAITING)
   */
  REMATCH_ROOM: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS", "USER_IS_HOST"],
    },
  },

  /**
   * Host triggers a room reset
   */
  RESET_ROOM: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS", "USER_IS_HOST"],
    },
  },

  /**
   * Host wants a new scramble (will reset the current solve)
   */
  NEW_SCRAMBLE: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS", "USER_IS_HOST"],
    },
  },

  /**
   * Host is forcing a new solve
   */
  FORCE_NEXT_SOLVE: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS", "USER_IS_HOST"],
    },
  },

  /**
   * Kick user from room (host only)
   */
  KICK_USER: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS", "USER_IS_HOST"],
    },
  },

  /**
   * Ban user from room (host only)
   */
  BAN_USER: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS", "USER_IS_HOST"],
    },
  },

  /**
   * Unban user from room (host only)
   */
  UNBAN_USER: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS", "USER_IS_HOST"],
    },
  },

  /**
   * User is leaving a room
   */
  LEAVE_ROOM: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: true,
      validations: ["ROOM_EXISTS", "ROOMUSER_EXISTS"],
    },
  },

  /**
   * Used for debugging.
   */
  DEBUG_EVENT: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "debug",
    roomEventConfig: {
      isRoomEvent: false,
    },
  },

  // this is a socket.io event. don't capitalize
  disconnect: {
    args: {} as Record<string, never>,
    logArgs: true,
    logLevel: "info",
    roomEventConfig: {
      isRoomEvent: false,
    },
  },
} as const satisfies SocketClientEventConfigMap;

export type SocketClientEventArgs = {
  [K in keyof typeof SOCKET_CLIENT_CONFIG]: (typeof SOCKET_CLIENT_CONFIG)[K]["args"];
};

export const SOCKET_CLIENT = Object.freeze(
  Object.fromEntries(Object.keys(SOCKET_CLIENT_CONFIG).map((key) => [key, key]))
) as { readonly [K in SocketClientEvent]: K };

type ExtractArgs<T> = T extends { args: infer A } ? A : never;
export type SocketClientEvent = keyof typeof SOCKET_CLIENT_CONFIG;

type RoomEventKeys = {
  [K in keyof typeof SOCKET_CLIENT_CONFIG]: (typeof SOCKET_CLIENT_CONFIG)[K]["roomEventConfig"] extends {
    isRoomEvent: true;
  }
    ? K
    : never;
}[keyof typeof SOCKET_CLIENT_CONFIG];
export type RoomEventHandlers = {
  [K in RoomEventKeys]: RoomEventHandlerFunction<
    ExtractArgs<(typeof SOCKET_CLIENT_CONFIG)[K]>
  >;
};

interface SocketServerEventConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any;
}

type SocketServerEventConfigMap = {
  [key: string]: SocketServerEventConfig;
};

export const SOCKET_SERVER_CONFIG: SocketServerEventConfigMap = {
  /**
   * Response given when
   */
  CREATE_ROOM_SUCCESS: {
    args: {} as { roomId: string },
  },
};

export const SOCKET_SERVER_TEMP = Object.freeze(
  Object.keys(SOCKET_SERVER_CONFIG).reduce(
    (acc, key) => {
      acc[key as keyof typeof SOCKET_SERVER_CONFIG] = key;
      return acc;
    },
    {} as {
      [K in keyof typeof SOCKET_SERVER_CONFIG]: K;
    }
  )
);

/**
 * All valid message types sent by the server.
 */
export enum SOCKET_SERVER {
  /**
   * Notify users that a solve has finished
   */
  SOLVE_FINISHED_EVENT = "SOLVE_FINISHED_EVENT",

  /**
   * Notify users that current set has finished
   */
  SET_FINISHED_EVENT = "SET_FINISHED_EVENT",

  /**
   * Notify users that match is finished
   */
  MATCH_FINISHED_EVENT = "MATCH_FINISHED_EVENT",

  /**
   * Broadcasts a user's new status update
   */
  USER_STATUS_UPDATE = "USER_STATUS_UPDATE",

  /**
   * User is toggling whether they compete/spectate
   */
  USER_TOGGLE_COMPETING = "USER_TOGGLE_COMPETING",

  /**
   * Used for all state updates to the room object (state tied to the Zustand room store)
   */
  ROOM_UPDATE = "ROOM_UPDATE",

  /**
   * Host creates new team(s)
   */
  TEAMS_CREATED = "TEAMS_CREATED",

  /**
   * Host deletes a team
   */
  TEAM_DELETED = "TEAM_DELETED",

  /**
   * To broadcast any update to a specific team
   */
  TEAM_UPDATE = "TEAM_UPDATE",

  /**
   * To broadcast an update to the general room.teams object
   */
  TEAMS_UPDATE = "TEAMS_UPDATE",

  /**
   * To broadcast that user has joined team
   */
  USER_JOIN_TEAM = "USER_JOIN_TEAM",

  /**
   * User leaves a team (explicit action)
   */
  USER_LEAVE_TEAM = "USER_LEAVE_TEAM",

  /**
   * Tells user to reset any state related to their local solve
   */
  RESET_LOCAL_SOLVE = "RESET_LOCAL_SOLVE",

  /**
   * Broadcast that the room has started
   */
  ROOM_STARTED = "ROOM_STARTED",

  /**
   * Broadcast that the room is reset
   */
  ROOM_RESET = "ROOM_RESET",

  /**
   * Broadcast to all users that one user has started a live timer
   */
  USER_START_LIVE_TIMER = "USER_START_LIVE_TIMER",

  /**
   * Broadcast to all user that one user has stopped a live timer
   */
  USER_STOP_LIVE_TIMER = "USER_STOP_LIVE_TIMER",

  /**
   * Broadcast that the current solve is being reset
   */
  SOLVE_RESET = "SOLVE_RESET",

  /**
   * Broadcast a general update to the current solve
   */
  SOLVE_UPDATE = "SOLVE_UPDATE",

  /**
   * Broadcast that a new solve is starting
   */
  NEW_SOLVE = "NEW_SOLVE",

  /**
   * Broadcast a new attempt
   */
  CREATE_ATTEMPT = "CREATE_ATTEMPT",

  /**
   * Braodcast a delete attempt
   */
  DELETE_ATTEMPT = "DELETE_ATTEMPT",

  /**
   * Broadcast that a new set is starting
   */
  NEW_SET = "NEW_SET",

  /**
   * Broadcast that a user joined the room (not necessarily for the first time)
   */
  USER_JOINED = "USER_JOINED",

  /**
   * This user is kicked. When a user receives this, they are kicked.
   */
  USER_KICKED = "USER_KICKED",

  /**
   * General update to say that a user is banned. When a user receives this, they are banned.
   */
  USER_BANNED = "USER_BANNED",

  /**
   * General update to say that a user is unbanned.
   */
  USER_UNBANNED = "USER_UNBANNED",

  /**
   * Generic way to update a room user.
   */
  USER_UPDATE = "USER_UPDATE",

  /**
   * Broadcast a new user result
   */
  NEW_USER_RESULT = "NEW_USER_RESULT",

  /**
   * Broadcast a new result
   */
  NEW_RESULT = "NEW_RESULT",

  /**
   * A new host is assigned.
   */
  NEW_HOST = "NEW_HOST",

  /**
   * Disconnect the socket
   */
  DISCONNECT = "DISCONNECT",
}

/**
 * A response type and related callback type for websocket when we need to transport some data.
 * Includes a reason for failure, which can be passed to user or processed in client side.
 *
 * Only need to use this construct when we need feedback in case of failure. If we only need to know the time of success, just use a () => void callback
 */
export type SocketResponse<T> =
  | { success: true; data: T }
  | {
      success: false;
      data?: T;
      reason: string;
    };
export type SocketCallback<T> = (response: SocketResponse<T>) => void;
