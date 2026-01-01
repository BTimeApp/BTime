import { RoomEventHandlers, SOCKET_SERVER } from "@/types/socket_protocol";
import { RoomLogger } from "@/server/logging/logger";
import {
  checkMatchFinished,
  checkRoomSolveFinished,
  checkSetFinished,
  findMatchWinners,
  findSetWinners,
  finishRoomSolve,
  getLatestSet,
  getLatestSolve,
  newAttempt,
  newRoomSet,
  newRoomSolve,
  resetRoom,
  resetSolve,
  userLeaveTeam,
} from "@/lib/room";
import { IRoom, RoomState } from "@/types/room";
import { Server } from "socket.io";
import { SolveStatus } from "@/types/status";
import { RedisStores } from "../redis/stores";

/**
 * A static list of handler functions for all possible room events.
 * This list will change with the list of events defined in socket-protocol.
 * This file should raise development-time errors if not synced properly with that list.
 */
export const ROOM_EVENT_HANDLERS = {
  JOIN_ROOM: async () => {},
  UPDATE_ROOM: async () => {},
  UPDATE_SOLVE_STATUS: async (io, stores, roomId, userId, args) => {
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

  TOGGLE_COMPETING: async (io, stores, roomId, userId, args) => {
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

  SUBMIT_RESULT: async () => {},

  CREATE_TEAMS: async () => {},
  DELETE_TEAM: async (io, stores, roomId, userId, args) => {
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
  JOIN_TEAM: async () => {},
  LEAVE_TEAM: async (io, stores, roomId, userId, args) => {
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

  KICK_USER: async (io, stores, roomId, userId, args) => {
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
  BAN_USER: async (io, stores, roomId, userId, args) => {
    const room = await stores.rooms.getRoom(roomId);
    if (!room || !(await userIsHost(room, userId))) return;

    const banUser = room?.users[args.userId];
    if (!banUser) return;
    banUser.banned = true;

    await stores.rooms.setRoom(room);
    //broadcast user update to the rest of the room
    io.to(room.id).emit(SOCKET_SERVER.USER_BANNED, args.userId);
  },
  UNBAN_USER: async (io, stores, roomId, userId, args) => {
    const room = await stores.rooms.getRoom(roomId);
    if (!room || !(await userIsHost(room, userId))) return;

    const unbanUser = room?.users[args.userId];
    if (!unbanUser) return;
    unbanUser.banned = false;

    await stores.rooms.setRoom(room);
    //broadcast user update to the rest of the room
    io.to(room.id).emit(SOCKET_SERVER.USER_UNBANNED, args.userId);
  },

  LEAVE_ROOM: async () => {},
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
