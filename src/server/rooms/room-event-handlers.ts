import {
  RoomEventHandlers,
  SOCKET_SERVER,
  SocketResponse,
} from "@/types/socket_protocol";
import { RoomLogger } from "@/server/logging/logger";
import {
  checkMatchFinished,
  checkRoomSolveFinished,
  checkRoomUpdateRequireReset,
  checkSetFinished,
  findMatchWinners,
  findSetWinners,
  finishRoomSolve,
  getLatestSet,
  getLatestSolve,
  newAttempt,
  newRoomSet,
  newRoomSolve,
  processNewResult,
  resetRoom,
  resetSolve,
  updateRoom,
  userJoinRoom,
  userJoinTeam,
  userLeaveTeam,
} from "@/lib/room";
import { IRoom, RoomState, USER_JOIN_FAILURE_REASON } from "@/types/room";
import { Server } from "socket.io";
import { SolveStatus } from "@/types/status";
import { RedisStores } from "../redis/stores";
import { IRoomUser } from "@/types/room-participant";
import { IUserInfo } from "@/types/user";
import bcrypt from "bcrypt";
import { IAttempt } from "@/types/solve";

/**
 * A static list of handler functions for all possible room events.
 * This list will change with the list of events defined in socket-protocol.
 * This file should raise development-time errors if not synced properly with that list.
 */
export const ROOM_EVENT_HANDLERS = {
  JOIN_ROOM: async (io, stores, roomId, userId, socketId, args) => {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
      RoomLogger.warn(
        { roomId: roomId, userId: userId, socketId: socketId },
        "Socket missing"
      );
      return;
    }

    const user: IUserInfo | null = await stores.users.getUser(userId);
    if (!user) {
      // Do not send any failures over socket in this case. It's possible for the user to just not be logged in yet
      RoomLogger.debug(
        { roomId: args.roomId, userId: userId },
        "Nonexistent user attempting to join room."
      );
      return;
    }

    //validate real room
    const room = await stores.rooms.getRoom(roomId);
    if (!room) {
      RoomLogger.debug(
        { roomId: args.roomId, userId: userId },
        "User trying to join nonexistent room"
      );
      io.to(userId).emit(SOCKET_SERVER.INVALID_ROOM);
      return;
    }

    //validate user isn't banned
    if (Object.keys(room.users).includes(userId) && room.users[userId].banned) {
      RoomLogger.debug(
        { roomId: args.roomId, userId: userId },
        `Banned user trying to join room.`
      );

      io.to(roomId).emit(SOCKET_SERVER.USER_JOIN_ROOM_USER_FAIL, {
        reason: USER_JOIN_FAILURE_REASON.USER_BANNED,
      });
      return;
    }

    //validate user is not already (active) in this room
    if (Object.keys(room.users).includes(userId) && room.users[userId].active) {
      RoomLogger.debug(
        { roomId: roomId, userId: userId },
        "User double join in room."
      );

      // precautionary persist
      await stores.rooms.persistRoom(room.id);

      io.to(userId).emit(SOCKET_SERVER.USER_JOIN_ROOM_USER_SUCCESS, {
        room: room,
        userId: userId,
      });
      socket.join(room.id);
      socket.data.roomId = room.id;
      return;
    }

    //validate the room still has capacity
    if (
      room.settings.maxUsers &&
      Object.keys(room.users).length >= room.settings.maxUsers
    ) {
      RoomLogger.debug(
        { roomId: roomId, userId: userId },
        "User tried to join a full room."
      );

      io.to(roomId).emit(SOCKET_SERVER.USER_JOIN_ROOM_USER_FAIL, {
        reason: USER_JOIN_FAILURE_REASON.ROOM_FULL,
      });
      return;
    }

    //validate password if room is private AND user isn't host
    if (
      room.settings.access.visibility === "PRIVATE" &&
      userId !== room.host?.id &&
      args.password
    ) {
      //room password should never be undefined, but just in case, cast to empty string
      const correctPassword = await bcrypt.compare(
        args.password,
        room.settings.access.password
      );
      if (!correctPassword) {
        RoomLogger.debug(
          { roomId: roomId, userId: userId },
          "User submitted wrong password to room"
        );
        io.to(roomId).emit(SOCKET_SERVER.USER_JOIN_ROOM_USER_FAIL, {
          reason: USER_JOIN_FAILURE_REASON.WRONG_PASSWORD,
        });
        return;
      }
    }
    /**
     * User is successfully joining the room at this point.
     */

    // if this room is scheduled for deletion, don't delete it
    await stores.rooms.persistRoom(roomId);

    //add user to room
    RoomLogger.info(
      { roomId: roomId, userId: userId, userName: user.userName },
      "User joining room."
    );

    // const extraData: Record<string, string> = {};

    const newUser: boolean = userJoinRoom(room, user);

    // write room to room store
    await stores.rooms.setRoom(room);

    // make socket connection join room, set room on socket
    socket.join(room.id);
    socket.data.roomId = room.id;

    io.to(userId).emit(SOCKET_SERVER.USER_JOIN_ROOM_USER_SUCCESS, {
      room: room,
      userId: newUser ? undefined : userId,
    });

    // broadcast update to all other users
    io.to(roomId)
      .except(userId)
      .emit(SOCKET_SERVER.USER_JOIN_ROOM, { user: room.users[userId] });
    // if room is started, need to update solves object
    const currentSolve = getLatestSolve(room);
    if (
      room.state === "STARTED" &&
      !room.settings.teamSettings.teamsEnabled &&
      currentSolve
    ) {
      io.to(roomId)
        .except(userId)
        .emit(SOCKET_SERVER.SOLVE_UPDATE, currentSolve);
    }
  },
  UPDATE_ROOM: async (io, stores, roomId, userId, socketId, args) => {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
      RoomLogger.warn(
        { roomId: roomId, userId: userId, socketId: socketId },
        "Socket doesn't exist in update room"
      );
    }
    const room = await stores.rooms.getRoom(roomId);

    if (!room || !userIsHost(room, userId)) {
      return;
    }

    // check if the room needs to be reset
    const needsReset = checkRoomUpdateRequireReset(room, args.roomSettings);

    // update room object
    await updateRoom(room, args.roomSettings);

    // reset room object if needed
    if (needsReset) {
      resetRoom(room);
    }

    // update room store
    await stores.rooms.setRoom(room);

    // broadcast room update
    io.to(roomId).emit(SOCKET_SERVER.ROOM_UPDATE, room);

    // upon successful update, call success callback
    socket?.emit(SOCKET_SERVER.UPDATE_ROOM_USER_SUCCESS);
  },
  UPDATE_SOLVE_STATUS: async (io, stores, roomId, userId, socketId, args) => {
    const room = await stores.rooms.getRoom(roomId);
    if (!room) return;

    const currentUserStatus: SolveStatus = room.users[userId]?.solveStatus;
    if (currentUserStatus == null) {
      RoomLogger.warn(
        {
          roomId: roomId,
          userId: userId,
        },
        "user submitted new user status, but user doesn't exist"
      );
      return;
    }

    if (args.newUserStatus !== currentUserStatus) {
      room.users[userId].solveStatus = args.newUserStatus;

      io.to(roomId).emit(
        SOCKET_SERVER.USER_STATUS_UPDATE,
        userId,
        args.newUserStatus
      );

      await stores.rooms.setRoom(room);
    }
  },
  START_LIVE_TIMER: async (io, stores, roomId, userId) => {
    const room = await stores.rooms.getRoom(roomId);
    if (!room) return;

    io.to(roomId)
      .except(userId)
      .emit(SOCKET_SERVER.USER_START_LIVE_TIMER, userId);
  },
  STOP_LIVE_TIMER: async (io, stores, roomId, userId) => {
    const room = await stores.rooms.getRoom(roomId);
    if (!room) return;

    io.to(roomId)
      .except(userId)
      .emit(SOCKET_SERVER.USER_STOP_LIVE_TIMER, userId);
  },

  TOGGLE_COMPETING: async (io, stores, roomId, userId, socketId, args) => {
    const room = await stores.rooms.getRoom(roomId);

    if (
      !room ||
      !room.users[userId] ||
      room.users[userId].competing == args.competing
    ) {
      return;
    }

    if (room.settings.teamSettings.teamsEnabled) {
      // users should never try to toggle their competing mode when in teams mode
      RoomLogger.debug(
        `User ${userId} tried to toggle competing status while teams is enabled in room ${roomId}`
      );
      return;
    }

    room.users[userId].competing = args.competing;

    io.to(roomId).emit(
      SOCKET_SERVER.USER_TOGGLE_COMPETING,
      userId,
      args.competing
    );

    // when user spectates, need to check if all competing users are done, then advance room
    if (room.state === "STARTED") {
      if (args.competing) {
        //if user is now competing, we need to add an attempt for them if none exists yet. TODO
        // right now, the only way the TOGGLE_COMPETING event is triggered is through the button on UI that only shows up in SOLO.
        const currentSolve = getLatestSolve(room);

        if (currentSolve && !currentSolve.solve.attempts[userId]) {
          const attempt = newAttempt(
            room,
            currentSolve.solve.scrambles[0],
            userId
          );

          if (attempt) {
            io.to(roomId).emit(SOCKET_SERVER.CREATE_ATTEMPT, userId, attempt);
          }
        }
      } else {
        // if user is now spectating, we need to check if the room solve is finished and handle
        if (checkRoomSolveFinished(room)) {
          await handleSolveFinished(io, room);
        }
      }
    }
    await stores.rooms.setRoom(room);
  },

  SUBMIT_RESULT: async (io, stores, roomId, userId, socketId, args) => {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
      RoomLogger.warn(
        { roomId: roomId, userId: userId, socketId: socketId },
        "Socket doesn't exist in submit result event"
      );
    }

    const room = await stores.rooms.getRoom(roomId);
    if (!room) return;

    if (room.state !== "STARTED") {
      RoomLogger.warn(
        { roomId: roomId, userId: userId, roomState: room.state },
        "Illegal room state to submit a result."
      );
      return;
    }
    const currentSolve = getLatestSolve(room);
    if (!currentSolve) {
      RoomLogger.warn(
        { roomId: roomId, userId: userId },
        "User tried to submit a result when there are no solves in room."
      );
      return;
    }

    const updatedTeam = processNewResult(room, userId, args.result);

    // broadcast new user result (user result map)
    io.to(roomId).emit(SOCKET_SERVER.NEW_USER_RESULT, userId, args.result);

    // broadcast result as needed to actual results
    if (updatedTeam !== undefined) {
      io.to(roomId).emit(SOCKET_SERVER.TEAM_UPDATE, updatedTeam);

      io.to(roomId).emit(
        SOCKET_SERVER.NEW_RESULT,
        updatedTeam.team.id,
        currentSolve.solve.results[updatedTeam.team.id]
      );
    } else {
      io.to(roomId).emit(SOCKET_SERVER.NEW_RESULT, userId, args.result);
    }

    socket?.emit(SOCKET_SERVER.USER_SUBMIT_RESULT_USER_SUCCESS);

    if (checkRoomSolveFinished(room)) {
      await handleSolveFinished(io, room);
    }
    await stores.rooms.setRoom(room);
  },

  CREATE_TEAMS: async () => {},
  DELETE_TEAM: async (io, stores, roomId, userId, socketId, args) => {
    const room = await stores.rooms.getRoom(roomId);
    if (
      !room ||
      !(await userIsHost(room, userId)) ||
      !room.settings.teamSettings.teamsEnabled
    )
      return;

    delete room.teams[args.teamId];
    await stores.rooms.setRoom(room);

    io.to(room.id).emit(SOCKET_SERVER.TEAM_DELETED, args.teamId);
  },
  JOIN_TEAM: async (io, stores, roomId, userId, socketId, args) => {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
      RoomLogger.warn(
        { roomId: roomId, userId: userId, socketId: socketId },
        "Socket doesn't exist in submit result event"
      );
    }

    const room = await stores.rooms.getRoom(roomId);
    if (
      !room ||
      !room.users[userId] ||
      !room.settings.teamSettings.teamsEnabled
    )
      return;

    const response: SocketResponse<{
      resetTeamResult: boolean;
      attempt: IAttempt | undefined;
    }> = await userJoinTeam(room, userId, args.teamId);

    if (response.success) {
      await stores.rooms.setRoom(room);

      io.to(room.id).emit(
        SOCKET_SERVER.USER_JOIN_TEAM,
        room.users[userId],
        room.teams[args.teamId],
        response.data
      );
    } else {
      socket?.emit(SOCKET_SERVER.USER_EVENT_FAIL, { reason: response.reason });
    }
  },
  LEAVE_TEAM: async (io, stores, roomId, userId, socketId, args) => {
    const room = await stores.rooms.getRoom(roomId);
    if (
      !room ||
      !room.users[userId] ||
      !room.settings.teamSettings.teamsEnabled ||
      !room.teams[args.teamId]
    )
      return;

    await handleUserLeaveTeam(io, stores, room, userId, args.teamId);
  },

  START_ROOM: async (io, stores, roomId) => {
    const room = await stores.rooms.getRoom(roomId);
    if (room == null) return;

    if (room.state == "WAITING" || room.state == "FINISHED") {
      room.state = "STARTED";
      const newSet = newRoomSet(room);
      const newSolve = await newRoomSolve(room);

      await stores.rooms.setRoom(room);
      io.to(room.id).emit(SOCKET_SERVER.ROOM_STARTED);
      if (room.settings.teamSettings.teamsEnabled) {
        io.to(room.id).emit(SOCKET_SERVER.TEAMS_UPDATE, room.teams);
      }
      //manually remove the solve since we're sending it over the wire right after this - avoids duplicating
      io.to(room.id).emit(SOCKET_SERVER.NEW_SET, { ...newSet, solves: [] });
      io.to(room.id).emit(SOCKET_SERVER.NEW_SOLVE, newSolve);
    } else {
      RoomLogger.warn(
        { roomId: roomId, roomState: room.state },
        "Illegal room state to start room"
      );
    }
  },
  REMATCH_ROOM: async (io, stores, roomId) => {
    const room = await stores.rooms.getRoom(roomId);
    if (!room) return;

    if (room.state == "FINISHED") {
      resetRoom(room);

      await stores.rooms.setRoom(room);
      io.to(room.id).emit(SOCKET_SERVER.ROOM_RESET);
    } else {
      RoomLogger.warn(
        { roomId, roomState: room.state },
        "Illegal room state to trigger room rematch"
      );
    }
  },
  RESET_ROOM: async (io, stores, roomId) => {
    const room = await stores.rooms.getRoom(roomId);
    if (!room) return;

    if (room.state == "STARTED" || room.state == "FINISHED") {
      resetRoom(room);

      await stores.rooms.setRoom(room);
      io.to(room.id).emit(SOCKET_SERVER.ROOM_RESET);
    } else {
      RoomLogger.warn(
        { roomId, roomState: room.state },
        "Illegal room state to trigger room reset"
      );
    }
  },

  NEW_SCRAMBLE: async (io, stores, roomId) => {
    const room = await stores.rooms.getRoom(roomId);
    if (!room) return;

    const currentSolve = getLatestSolve(room);
    if (room.state != "STARTED") {
      RoomLogger.warn(
        { roomId: roomId, roomState: room.state },
        "Illegal room state to get new scramble"
      );
    } else if (!currentSolve) {
      RoomLogger.warn(
        { roomId: roomId },
        "Cannot skip scramble when there is no current solve."
      );
    } else {
      await resetSolve(room);
      await stores.rooms.setRoom(room);
      io.to(room.id).emit(SOCKET_SERVER.SOLVE_RESET, currentSolve);
    }
  },
  FORCE_NEXT_SOLVE: async (io, stores, roomId) => {
    const room = await stores.rooms.getRoom(roomId);
    if (!room) return;

    if (room.state == "STARTED") {
      await handleSolveFinished(io, room);
      await stores.rooms.setRoom(room);
    } else {
      RoomLogger.warn(
        { roomId: roomId, roomState: room.state },
        "Illegal room state to force next solve"
      );
    }
  },

  KICK_USER: async (io, stores, roomId, userId, socketId, args) => {
    const room = await stores.rooms.getRoom(roomId);
    if (!room || !userIsHost(room, userId)) return;

    const kickUser = room?.users[userId];
    if (!kickUser) return;

    // note: args.userId is the id to kick.
    // we have to do a socket intersection to find the specific connection to DC because it's possible
    // that a user is logged in on multiple tabs and therefore connected to multiple sockets.
    const kickUserSockets = socketIntersection(io, args.userId, room.id);

    // Emit to each socket in the intersection
    kickUserSockets.forEach((kickUserSocketId: string) => {
      io.to(kickUserSocketId).emit(SOCKET_SERVER.USER_KICKED);
    });

    // We do not have to send anything to others - the kicked user will room DC, and that will broadcast to all users immediatley.
  },
  BAN_USER: async (io, stores, roomId, userId, socketId, args) => {
    const room = await stores.rooms.getRoom(roomId);
    if (!room || !(await userIsHost(room, userId))) return;

    const banUser = room?.users[args.userId];
    if (!banUser) return;
    banUser.banned = true;

    await stores.rooms.setRoom(room);
    //broadcast user update to the rest of the room
    io.to(room.id).emit(SOCKET_SERVER.USER_BANNED, args.userId);
  },
  UNBAN_USER: async (io, stores, roomId, userId, socketId, args) => {
    const room = await stores.rooms.getRoom(roomId);
    if (!room || !(await userIsHost(room, userId))) return;

    const unbanUser = room?.users[args.userId];
    if (!unbanUser) return;
    unbanUser.banned = false;

    await stores.rooms.setRoom(room);
    //broadcast user update to the rest of the room
    io.to(room.id).emit(SOCKET_SERVER.USER_UNBANNED, args.userId);
  },

  LEAVE_ROOM: async (io, stores, roomId, userId, socketId, args) => {
    await handleRoomDisconnect(io, stores, args.roomId, userId, socketId);
  },
} satisfies RoomEventHandlers;

type RoomEventKey = keyof typeof ROOM_EVENT_HANDLERS;

export function isRoomEventKey(event: string): event is RoomEventKey {
  return event in ROOM_EVENT_HANDLERS;
}

/**
 * Helper function to handle events when solve finished.
 * TODO move as much as possible to lib/room
 */
async function handleSolveFinished(io: Server, room: IRoom) {
  finishRoomSolve(room);
  const currentSolve = getLatestSolve(room);
  const currentSet = getLatestSet(room);
  if (!currentSolve || !currentSet) return;
  const participants = room.settings.teamSettings.teamsEnabled
    ? room.teams
    : room.users;

  // only check set and match wins if not a casual room
  if (room.settings.raceSettings.roomFormat !== "CASUAL") {
    //check set finished.
    const setFinished = checkSetFinished(room);
    if (setFinished) {
      // find set winners.
      const setWinners: string[] = findSetWinners(room);
      currentSet.winners = setWinners;
      currentSet.finished = true;

      // update set wins for set winners
      setWinners.map((pid) => (participants[pid].setWins += 1));

      // reset all users' points
      Object.values(participants).map((participant) => {
        participant.points = 0;
      });

      // check match finished. right now a match can only be finished if the set is finished.
      const matchFinished = checkMatchFinished(room);
      if (matchFinished) {
        const matchWinners: string[] = findMatchWinners(room);
        //handle match finished
        room.match.winners = matchWinners;
        room.match.finished = true;
        room.state = "FINISHED";

        //publish solve finished after updating match winners, but before sending match finished
        io.to(room.id).emit(
          SOCKET_SERVER.SOLVE_FINISHED_EVENT,
          currentSolve,
          participants
        );

        //publish set finished event with winners
        io.to(room.id).emit(SOCKET_SERVER.SET_FINISHED_EVENT, setWinners);

        //publish match finished event with winners
        io.to(room.id).emit(SOCKET_SERVER.MATCH_FINISHED_EVENT, matchWinners);
      } else {
        //publish solve finished after updating set winners, but before creating a new set
        io.to(room.id).emit(
          SOCKET_SERVER.SOLVE_FINISHED_EVENT,
          currentSolve,
          participants
        );

        //publish set finished event with winners
        io.to(room.id).emit(SOCKET_SERVER.SET_FINISHED_EVENT, setWinners);

        const newSet = newRoomSet(room);
        io.to(room.id).emit(SOCKET_SERVER.NEW_SET, newSet);
      }
    } else {
      io.to(room.id).emit(
        SOCKET_SERVER.SOLVE_FINISHED_EVENT,
        currentSolve,
        participants
      );
    }
  } else {
    //publish solve finished event (casual case)
    io.to(room.id).emit(
      SOCKET_SERVER.SOLVE_FINISHED_EVENT,
      currentSolve,
      participants
    );
  }

  if ((room.state as RoomState) !== "FINISHED") {
    const newSolve = await newRoomSolve(room);
    if (room.settings.teamSettings.teamsEnabled) {
      io.to(room.id).emit(SOCKET_SERVER.TEAMS_UPDATE, room.teams);
    }
    io.to(room.id).emit(SOCKET_SERVER.NEW_SOLVE, newSolve);
  }
}

/**
 * Helper function to handle the event of a user leaving a team
 * TODO move as much as possibe to lib/room
 */
async function handleUserLeaveTeam(
  io: Server,
  stores: RedisStores,
  room: IRoom,
  userId: string,
  teamId: string
) {
  const response = await userLeaveTeam(room, userId, teamId);

  if (response.success) {
    // leave team will both remove user from team AND
    // remove user attempt + team result (when it exists). This needs to go first.
    io.to(room.id).emit(
      SOCKET_SERVER.USER_LEAVE_TEAM,
      room.users[userId],
      room.teams[teamId]
    );

    // tell the user that left to reset their local solve. Doesn't matter if they actually had a solve to begin with.
    io.to(userId).emit(SOCKET_SERVER.RESET_LOCAL_SOLVE);

    if (response.data) {
      if (response.data.newAttempt) {
        io.to(room.id).emit(
          SOCKET_SERVER.CREATE_ATTEMPT,
          response.data.newAttempt.userId,
          response.data.newAttempt.attempt
        );
      }

      if (response.data.refreshedTeamResult) {
        io.to(room.id).emit(
          SOCKET_SERVER.NEW_RESULT,
          response.data.refreshedTeamResult.teamId,
          response.data.refreshedTeamResult.result
        );
      }
    }

    if (checkRoomSolveFinished(room)) {
      await handleSolveFinished(io, room);
    }
  }
  await stores.rooms.setRoom(room);
}

/**
 * Helperfunctio nfor handling the event that user disconnects from a room
 */
async function handleRoomDisconnect(
  io: Server,
  stores: RedisStores,
  roomId: string,
  userId: string,
  socketId: string
) {
  const socket = io.sockets.sockets.get(socketId);
  if (!socket) {
    RoomLogger.warn(
      { roomId: roomId, userId: userId, socketId: socketId },
      "Invalid socket in handle room disconnect"
    );
    return;
  }
  RoomLogger.info(
    { roomId: roomId, userId: userId },
    `User disconnected from room`
  );
  const room = await stores.rooms.getRoom(roomId);
  if (!room || !room.users[userId]) return;

  if (room.users[userId]) {
    // mark user as inactive
    room.users[userId].active = false;

    // canonically, the default solve status should be IDLE. If the user reconnects later, it is the responsibility of the client to make their solve status correct.
    if (room.users[userId].solveStatus !== "FINISHED") {
      room.users[userId].solveStatus = "IDLE";
    }
    // if teams is enabled and this user is on a team, force leave team
    const teamId = room.users[userId].currentTeam;
    if (room.settings.teamSettings.teamsEnabled && teamId !== undefined) {
      await handleUserLeaveTeam(io, stores, room, userId, teamId);
    }

    io.to(roomId).emit(SOCKET_SERVER.USER_UPDATE, room.users[userId]);
  } else {
    RoomLogger.warn(
      { roomId: roomId, userId: userId },
      `Nonexistent user is trying to leave room.`
    );
  }

  //check if no more users, if so, schedule room deletion.
  if (
    Object.values(room.users).filter((roomUser) => roomUser.active).length == 0
  ) {
    stores.rooms.scheduleRoomForDeletion(roomId);
    return;
  }

  //check if user is host OR there is somehow no host.
  if ((room.host && room.host.id == userId) || !room.host) {
    room.host = undefined;

    let earliestUser: IRoomUser | null = null;

    const hostEligibleUsers = Object.values(room.users).filter(
      (roomUser) => roomUser.active
    );

    for (const roomUser of hostEligibleUsers) {
      if (!earliestUser || roomUser.joinedAt < earliestUser.joinedAt) {
        earliestUser = roomUser;
      }
    }
    if (earliestUser) {
      room.host = earliestUser.user;
      RoomLogger.debug(
        { roomId: roomId, newHost: room.host },
        "Room promoted a new host"
      );
      io.to(roomId).emit(SOCKET_SERVER.NEW_HOST, earliestUser.user.id);
    }
  }

  // handle case that this user was the last one to submit a time/compete
  if (checkRoomSolveFinished(room)) {
    await handleSolveFinished(io, room);
  }

  // write room to room store
  await stores.rooms.setRoom(room);

  socket.leave(roomId);
  socket.data.roomId = undefined;
}

/**
 * Helper function to find if a given user is the host of a room.
 *
 */
function userIsHost(room: IRoom, userId: string): boolean {
  return room.host != null && room.host.id === userId;
}

/**
 * Helper function to find the set intersection of connections belonging to two rooms (each a set of connections).
 * As of v4, socket.io does not support intersection logic, only union logic, forcing us to implement ourselves.
 * This implementation uses set intersection, which takes O(min(|A|, |B|)) time.
 */
function socketIntersection(io: Server, roomA: string, roomB: string) {
  const setA = io.sockets.adapter.rooms.get(roomA);
  const setB = io.sockets.adapter.rooms.get(roomB);

  if (!setA || !setB) return [];

  // Always iterate over the smaller set for efficiency
  const [smaller, larger] =
    setA.size <= setB.size ? [setA, setB] : [setB, setA];

  return [...smaller].filter((socketId) => larger.has(socketId));
}
