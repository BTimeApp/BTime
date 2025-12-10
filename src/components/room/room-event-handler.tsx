import { useRoomActions, useRoomStore } from "@/context/room-context";
import { useSocket } from "@/context/socket-context";
import { useCallbackOnTransition } from "@/hooks/useCallbackOnTransition";
import { useStartTimeOnTransition } from "@/hooks/useStartTimeOnTransition";
import { Result } from "@/types/result";
import { SOCKET_CLIENT, SOCKET_SERVER } from "@/types/socket_protocol";
import { SolveStatus } from "@/types/status";
import { isLiveTimer } from "@/types/timer-type";
import { useParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useSocketEvent } from "@/hooks/use-socket-event";
import { IRoomSolve } from "@/types/room-solve";
import { IRoomParticipant } from "@/types/room-participant";
import { useSession } from "@/context/session-context";

/**
 * Handles all events for the room so that the room component itself doesn't have to re-render upon state udates
 */
export default function RoomEventHandler() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const user = useSession();
  const { socket } = useSocket();

  const localPenalty = useRoomStore((s) => s.localPenalty);
  const localResult = useRoomStore((s) => s.localResult);
  const localSolveStatus = useRoomStore((s) => s.localSolveStatus);
  const roomState = useRoomStore((s) => s.roomState);
  const timerType = useRoomStore((s) => s.timerType);
  const {
    startRoom,
    setLocalResult,
    setLocalPenalty,
    setLiveTimerStartTime,
    handleRoomUpdate,
    resetRoom,
    resetLocalSolveStatus,
    resetLocalSolve,
    addUserLiveStartTime,
    addUserLiveStopTime,
    clearUserLiveStartTimes,
    clearUserLiveTimes,
    resetLatestSolve,
    createAttempt,
    deleteAttempt,
    addNewSolve,
    updateLatestSolve,
    addNewSet,
    finishSolve,
    finishSet,
    finishMatch,
    updateSolveStatus,
    userToggleCompeting,
    createTeams,
    deleteTeam,
    userJoinTeam,
    userLeaveTeam,
    updateTeam,
    updateTeams,
    userJoin,
    userUpdate,
    userBanned,
    userUnbanned,
    setHostId,
    addResult,
    addUserResult,
  } = useRoomActions();

  //live update for start time
  const liveTimerStartTime = useStartTimeOnTransition<SolveStatus>(
    localSolveStatus,
    "SOLVING"
  );

  // set live timer start time in room store upon update
  useEffect(() => {
    if (liveTimerStartTime) setLiveTimerStartTime(liveTimerStartTime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setLiveTimerStartTime]);

  /**
   * Update user status on backend whenever client updates.
   */
  useEffect(() => {
    // console.log(`New local solve status ${localSolveStatus}`);
    socket.emit(SOCKET_CLIENT.UPDATE_SOLVE_STATUS, localSolveStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSolveStatus]);

  // update local result upon local penalty update
  useEffect(() => {
    setLocalResult(new Result(localResult.getTime(), localPenalty));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localPenalty]);

  /**
   * Reset local solve status whenever room state changes
   */
  useEffect(() => {
    resetLocalSolveStatus();
    // ignore lint warning - we do not want solveStatus change to trigger this hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomState, resetLocalSolveStatus]);

  const broadcastStartLiveTimerCallback = useCallback(() => {
    if (socket && socket.connected && isLiveTimer(timerType)) {
      socket.emit(SOCKET_CLIENT.START_LIVE_TIMER);
    }
  }, [socket, timerType]);

  const broadcastStopLiveTimerCallback = useCallback(() => {
    if (socket && socket.connected && isLiveTimer(timerType)) {
      socket.emit(SOCKET_CLIENT.STOP_LIVE_TIMER);
    }
  }, [socket, timerType]);

  /**
   * Callbacks for socket events
   */

  const handleUserStartLiveTimer = useCallback(
    (userId: string) => {
      addUserLiveStartTime(userId, performance.now());
    },
    [addUserLiveStartTime]
  );

  const handleUserStopLiveTimer = useCallback(
    (userId: string) => {
      addUserLiveStopTime(userId, performance.now());
    },
    [addUserLiveStopTime]
  );

  const handleSolveFinished = useCallback(
    (
      finalSolve: IRoomSolve,
      participants: Record<string, IRoomParticipant>
    ) => {
      //reset local states
      resetLocalSolveStatus();
      setLocalPenalty("OK");
      clearUserLiveStartTimes();
      clearUserLiveTimes();

      //final update on the current solve
      finishSolve(finalSolve, participants);
    },
    [
      resetLocalSolveStatus,
      setLocalPenalty,
      clearUserLiveStartTimes,
      clearUserLiveTimes,
      finishSolve,
    ]
  );

  const handleLocalUserKicked = useCallback(() => {
    toast.warning("You were kicked from the room");
    window.location.href = "/";
  }, []);

  const handleLocalUserBanned = useCallback(() => {
    toast.error("You were banned from the room");
    window.location.href = "/";
  }, []);

  const handleUserBanned = useCallback(
    (userId: string) => {
      if (user?.userInfo.id === userId) {
        handleLocalUserBanned();
        return;
      }
      userBanned(userId);
    },
    [user, handleLocalUserBanned, userBanned]
  );

  const handleSocketDisconnect = useCallback(() => {
    toast.error("Socket disconnected...");
    window.location.href = "/";
  }, []);

  /**
   * Trigger callbacks on state transitions
   */
  useCallbackOnTransition<SolveStatus>(
    localSolveStatus,
    "SOLVING",
    broadcastStartLiveTimerCallback
  );
  useCallbackOnTransition<SolveStatus>(
    localSolveStatus,
    "SUBMITTING",
    broadcastStopLiveTimerCallback
  );

  /**
   * Trigger callbacks on socket events coming from server
   */
  useSocketEvent(socket, SOCKET_SERVER.USER_JOINED, userJoin);
  useSocketEvent(socket, SOCKET_SERVER.USER_UPDATE, userUpdate);
  useSocketEvent(
    socket,
    SOCKET_SERVER.USER_START_LIVE_TIMER,
    handleUserStartLiveTimer
  );
  useSocketEvent(
    socket,
    SOCKET_SERVER.USER_STOP_LIVE_TIMER,
    handleUserStopLiveTimer
  );
  useSocketEvent(socket, SOCKET_SERVER.USER_STATUS_UPDATE, updateSolveStatus);
  useSocketEvent(
    socket,
    SOCKET_SERVER.USER_TOGGLE_COMPETING,
    userToggleCompeting
  );
  useSocketEvent(socket, SOCKET_SERVER.SOLVE_RESET, resetLatestSolve);
  useSocketEvent(
    socket,
    SOCKET_SERVER.SOLVE_FINISHED_EVENT,
    handleSolveFinished
  );
  useSocketEvent(socket, SOCKET_SERVER.SOLVE_UPDATE, updateLatestSolve);

  useSocketEvent(socket, SOCKET_SERVER.CREATE_ATTEMPT, createAttempt);
  useSocketEvent(socket, SOCKET_SERVER.DELETE_ATTEMPT, deleteAttempt);

  useSocketEvent(socket, SOCKET_SERVER.NEW_SOLVE, addNewSolve);
  useSocketEvent(socket, SOCKET_SERVER.NEW_USER_RESULT, addUserResult);
  useSocketEvent(socket, SOCKET_SERVER.NEW_RESULT, addResult);
  useSocketEvent(socket, SOCKET_SERVER.NEW_SET, addNewSet);
  useSocketEvent(socket, SOCKET_SERVER.SET_FINISHED_EVENT, finishSet);
  useSocketEvent(socket, SOCKET_SERVER.MATCH_FINISHED_EVENT, finishMatch);
  useSocketEvent(socket, SOCKET_SERVER.ROOM_STARTED, startRoom);
  useSocketEvent(socket, SOCKET_SERVER.ROOM_UPDATE, handleRoomUpdate);
  useSocketEvent(socket, SOCKET_SERVER.ROOM_RESET, resetRoom);

  useSocketEvent(socket, SOCKET_SERVER.RESET_LOCAL_SOLVE, resetLocalSolve);

  useSocketEvent(socket, SOCKET_SERVER.TEAMS_CREATED, createTeams);
  useSocketEvent(socket, SOCKET_SERVER.TEAM_DELETED, deleteTeam);
  useSocketEvent(socket, SOCKET_SERVER.USER_JOIN_TEAM, userJoinTeam);
  useSocketEvent(socket, SOCKET_SERVER.USER_LEAVE_TEAM, userLeaveTeam);

  useSocketEvent(socket, SOCKET_SERVER.TEAM_UPDATE, updateTeam);
  useSocketEvent(socket, SOCKET_SERVER.TEAMS_UPDATE, updateTeams);

  useSocketEvent(socket, SOCKET_SERVER.USER_KICKED, handleLocalUserKicked);
  useSocketEvent(socket, SOCKET_SERVER.USER_BANNED, handleUserBanned);
  useSocketEvent(socket, SOCKET_SERVER.USER_UNBANNED, userUnbanned);
  useSocketEvent(socket, SOCKET_SERVER.NEW_HOST, setHostId);
  useSocketEvent(socket, SOCKET_SERVER.DISCONNECT, handleSocketDisconnect);

  /**
   * Set up window listener to push leave room event when window closes before component unmounts
   */
  useEffect(() => {
    const leaveRoom = () => {
      // clearInterval(interval);
      socket.emit(SOCKET_CLIENT.LEAVE_ROOM, roomId);
    };

    window.addEventListener("beforeunload", leaveRoom);

    return () => {
      window.removeEventListener("beforeunload", leaveRoom);
    };
  }, [socket, roomId]);

  // this component should never render. its purpose is only to house listener logic.
  return null;
}
