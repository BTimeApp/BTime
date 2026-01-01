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
} from "@/lib/room";
import { IRoom, RoomState } from "@/types/room";
import { Server } from "socket.io";

/**
 * A static list of handler functions for all possible room events.
 * This list will change with the list of events defined in socket-protocol.
 * This file should raise development-time errors if not synced properly with that list.
 */
export const ROOM_EVENT_HANDLERS = {
  JOIN_ROOM: async () => {},
  UPDATE_ROOM: async () => {},
  UPDATE_SOLVE_STATUS: async () => {},
  START_LIVE_TIMER: async () => {},
  STOP_LIVE_TIMER: async () => {},

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
  DELETE_TEAM: async () => {},
  JOIN_TEAM: async () => {},
  LEAVE_TEAM: async () => {},

  START_ROOM: async () => {},
  REMATCH_ROOM: async () => {},
  RESET_ROOM: async () => {},

  NEW_SCRAMBLE: async () => {},
  FORCE_NEXT_SOLVE: async () => {},

  KICK_USER: async () => {},
  BAN_USER: async () => {},
  UNBAN_USER: async () => {},

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
