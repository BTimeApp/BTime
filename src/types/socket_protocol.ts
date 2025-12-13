import { LogLevel } from "@/types/log-levels";

interface SocketClientEventConfig {
  // value: string;
  logArgs: boolean;
  logLevel: LogLevel;
}

type SocketEventConfigMap = {
  [key: string]: SocketClientEventConfig;
};

// Define metadata first
export const SOCKET_CLIENT_CONFIG: SocketEventConfigMap = {
  JOIN_ROOM: {
    logArgs: true,
    logLevel: "info",
  },
  /**
   * User creates a room
   */
  CREATE_ROOM: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * Host submits a room settings update
   */
  UPDATE_ROOM: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * User updates the local solve status
   */
  UPDATE_SOLVE_STATUS: {
    logArgs: true,
    logLevel: "debug",
  },

  /**
   * User starts a live timer. A live timer is any timer that the client can access the live state of (keyboard, stackmat, smartcube, etc)
   */
  START_LIVE_TIMER: {
    logArgs: true,
    logLevel: "debug",
  },

  /**
   * User stops a live timer. A live timer is any timer that the client can access the live state of (keyboard, stackmat, smartcube, etc)
   */
  STOP_LIVE_TIMER: {
    logArgs: true,
    logLevel: "debug",
  },

  /**
   * User toggles whether they are competing or spectating
   */
  TOGGLE_COMPETING: {
    logArgs: true,
    logLevel: "debug",
  },

  /**
   * User submits a result to the backend
   */
  SUBMIT_RESULT: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * Host creates new teams. We force a batched creation to avoid race condition on server.
   */
  CREATE_TEAMS: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * Host deletes a team
   */
  DELETE_TEAM: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * User joins a team
   */
  JOIN_TEAM: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * User leaves a team (explicit action)
   */
  LEAVE_TEAM: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * Host starts the room (bring from WAITING to STARTED)
   */
  START_ROOM: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * Host triggers a rematch (bring from FINISHED to WAITING)
   */
  REMATCH_ROOM: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * Host triggers a room reset
   */
  RESET_ROOM: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * Host wants a new scramble (will reset the current solve)
   */
  NEW_SCRAMBLE: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * Host is forcing a new solve
   */
  FORCE_NEXT_SOLVE: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * Kick user from room (host only)
   */
  KICK_USER: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * Ban user from room (host only)
   */
  BAN_USER: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * Unban user from room (host only)
   */
  UNBAN_USER: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * User is leaving a room
   */
  LEAVE_ROOM: {
    logArgs: true,
    logLevel: "info",
  },

  /**
   * Used for debugging.
   */
  DEBUG_EVENT: {
    logArgs: true,
    logLevel: "debug",
  },

  // this is a socket.io event. don't capitalize
  disconnect: {
    logArgs: true,
    logLevel: "info",
  },
} as const;
export const SOCKET_CLIENT = Object.freeze(
  Object.keys(SOCKET_CLIENT_CONFIG).reduce(
    (acc, key) => {
      acc[key as keyof typeof SOCKET_CLIENT_CONFIG] = key;
      return acc;
    },
    {} as {
      [K in keyof typeof SOCKET_CLIENT_CONFIG]: K;
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
