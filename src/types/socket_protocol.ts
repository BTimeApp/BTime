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
   * Host wants to skip the scramble
   */
  SKIP_SCRAMBLE = "SKIP_SCRAMBLE",

  /**
   * User disconnects from the room. This is distinct from disconnecting from the socket as a whole, which is handled in the socket context provider with socket.close()
   */
  USER_DISCONNECT_ROOM = "USER_DISCONNECT_ROOM",

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
   * Used to notify users that a solve has finished
   */
  SOLVE_FINISHED_EVENT = "SOLVE_FINISHED_EVENT",

  /**
   * Used for all state updates to the room object (state tied to the Zustand room store)
   */
  ROOM_UPDATE = "ROOM_UPDATE",

  /**
   * Broadcast to all users that one user has started a live timer
   */
  USER_START_LIVE_TIMER = "USER_START_LIVE_TIMER",

  /**
   * Broadcast to all user that one user has stopped a live timer
   */
  USER_STOP_LIVE_TIMER = "USER_STOP_LIVE_TIMER",
}
