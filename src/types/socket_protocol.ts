/**
 * All valid message types sent by the client.
 */
export enum SOCKET_CLIENT {
  /**
   * User tries to join room
   */
  JOIN_ROOM = "JOIN_ROOM",

  /**
   * User creates a room
   */
  CREATE_ROOM = "CREATE_ROOM",

  /**
   * Host submits a room settings update
   */
  UPDATE_ROOM = "UPDATE_ROOM",

  /**
   * User updates the local solve status
   */
  UPDATE_SOLVE_STATUS = "UPDATE_SOLVE_STATUS",

  /**
   * User starts a live timer. A live timer is any timer that the client can access the live state of (keyboard, stackmat, smartcube, etc)
   */
  START_LIVE_TIMER = "START_LIVE_TIMER",

  /**
   * User stops a live timer. A live timer is any timer that the client can access the live state of (keyboard, stackmat, smartcube, etc)
   */
  STOP_LIVE_TIMER = "STOP_LIVE_TIMER",

  /**
   * User toggles whether they are competing or spectating
   */
  TOGGLE_COMPETING = "TOGGLE_COMPETING",

  /**
   * User submits a result to the backend
   */
  SUBMIT_RESULT = "SUBMIT_RESULT",

  /**
   * Host creates a new team
   */
  CREATE_TEAM = "CREATE_TEAM",

  /**
   * Host deletes a team
   */
  DELETE_TEAM = "DELETE_TEAM",

  /**
   * User joins a team
   */
  JOIN_TEAM = "JOIN_TEAM",

  /**
   * User leaves a team (explicit action)
   */
  LEAVE_TEAM = "LEAVE_TEAM",

  /**
   * Host starts the room (bring from WAITING to STARTED)
   */
  START_ROOM = "START_ROOM",

  /**
   * Host triggers a rematch (bring from FINISHED to WAITING)
   */
  REMATCH_ROOM = "REMATCH_ROOM",

  /**
   * Host triggers a room reset
   */
  RESET_ROOM = "RESET_ROOM",

  /**
   * Host wants a new scramble (will reset the current solve)
   */
  NEW_SCRAMBLE = "NEW_SCRAMBLE",

  /**
   * Host is forcing a new solve
   */
  FORCE_NEXT_SOLVE = "FORCE_NEXT_SOLVE",

  /**
   * Kick user from room (host only)
   */
  KICK_USER = "KICK_USER",

  /**
   * Ban user from room (host only)
   */
  BAN_USER = "BAN_USER",

  /**
   * Unban user from room (host only)
   */
  UNBAN_USER = "UNBAN_USER",

  /**
   * User is leaving a room
   */
  LEAVE_ROOM = "LEAVE_ROOM",

  /**
   * Used for debugging.
   */
  DEBUG_EVENT = "DEBUG_EVENT",
}

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
   * Host creates a new team
   */
  TEAM_CREATED = "TEAM_CREATED",

  /**
   * Host deletes a team
   */
  TEAM_DELETED = "TEAM_DELETED",

  /**
   * To broadcast any update to a specific team
   */
  TEAM_UPDATE = "TEAM_UPDATE",

  /**
   * To broadcast that user has joined team
   */
  USER_JOIN_TEAM = "USER_JOIN_TEAM",

  /**
   * User leaves a team (explicit action)
   */
  USER_LEAVE_TEAM = "USER_LEAVE_TEAM",

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
   * Broadcast that a new solve is starting
   */
  NEW_SOLVE = "NEW_SOLVE",

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
   * Broadcast that a user submitted result
   */
  USER_SUBMITTED_RESULT = "USER_SUBMITTED_RESULT",

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
