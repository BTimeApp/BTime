import { useRoomStore } from "@/context/room-context";
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
import { IRoomParticipant, IRoomTeam, IRoomUser } from "@/types/room-participant";
import { useSession } from "@/context/session-context";
import { useIsTouchscreen } from "@/hooks/useMobile";

/**
 * Handles all events for the room so that the room component itself doesn't have to re-render upon state udates
 */
export default function RoomEventHandler() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const { user } = useSession();

  const [
    localPenalty,
    localResult,
    localSolveStatus,
    roomState,
    timerType,
    startRoom,
    setLocalResult,
    setLocalPenalty,
    setLiveTimerStartTime,
    handleRoomUpdate,
    resetRoom,
    resetLocalSolveStatus,
    addUserLiveStartTime,
    addUserLiveStopTime,
    clearUserLiveStartTimes,
    clearUserLiveTimes,
    resetLatestSolve,
    addNewSolve,
    updateLatestSolve,
    addNewSet,
    finishSolve,
    finishSet,
    finishMatch,
    updateSolveStatus,
    userToggleCompeting,
    createTeam,
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
    setTimerType,
  ] = useRoomStore((s) => [
    s.localPenalty,
    s.localResult,
    s.localSolveStatus,
    s.roomState,
    s.timerType,
    s.startRoom,
    s.setLocalResult,
    s.setLocalPenalty,
    s.setLiveTimerStartTime,
    s.handleRoomUpdate,
    s.resetRoom,
    s.resetLocalSolveStatus,
    s.addUserLiveStartTime,
    s.addUserLiveStopTime,
    s.clearUserLiveStartTimes,
    s.clearUserLiveTimes,
    s.resetLatestSolve,
    s.addNewSolve,
    s.updateLatestSolve,
    s.addNewSet,
    s.finishSolve,
    s.finishSet,
    s.finishMatch,
    s.updateSolveStatus,
    s.userToggleCompeting,
    s.createTeam,
    s.deleteTeam,
    s.userJoinTeam,
    s.userLeaveTeam,
    s.updateTeam,
    s.updateTeams,
    s.userJoin,
    s.userUpdate,
    s.userBanned,
    s.userUnbanned,
    s.setHostId,
    s.addResult,
    s.setTimerType,
  ]);
  const { socket } = useSocket();

  const isTouchscreen = useIsTouchscreen();

  useEffect(() => {
    if (isTouchscreen) {
      setTimerType("TYPING");
    }
  }, [isTouchscreen, setTimerType]);

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
    socket.emit(SOCKET_CLIENT.UPDATE_SOLVE_STATUS, localSolveStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSolveStatus]);

  // update local result upon local penalty update
  useEffect(() => {
    setLocalResult(new Result(localResult.getTime(), localPenalty));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localPenalty]);

  /**
   * Reset local solve status whenever room state or timer type change
   */
  useEffect(() => {
    resetLocalSolveStatus();
    // ignore lint warning - we do not want solveStatus change to trigger this hook
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomState, timerType]);

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

  const handleUserJoin = useCallback(
    (user: IRoomUser) => {
      userJoin(user);
    },
    [userJoin]
  );

  const handleUserUpdate = useCallback(
    (user: IRoomUser) => {
      userUpdate(user);
    },
    [userUpdate]
  );

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

  const handlesolveStatusUpdate = useCallback(
    (userId: string, newSolveStatus: SolveStatus) => {
      updateSolveStatus(userId, newSolveStatus);
    },
    [updateSolveStatus]
  );

  const handleUserToggleCompeting = useCallback(
    (userId: string, newCompeting: boolean) => {
      userToggleCompeting(userId, newCompeting);
    },
    [userToggleCompeting]
  );

  const handleSolveFinished = useCallback(
    (finalSolve: IRoomSolve, participants: Record<string, IRoomParticipant>) => {
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

  const handleSetFinished = useCallback(
    (setWinners: string[]) => {
      finishSet(setWinners);
    },
    [finishSet]
  );

  const handleMatchFinished = useCallback(
    (matchWinners: string[]) => {
      finishMatch(matchWinners);
    },
    [finishMatch]
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

  const handleUserUnbanned = useCallback(
    (userId: string) => {
      userUnbanned(userId);
    },
    [userUnbanned]
  );

  const handleNewHost = useCallback(
    (newHostId: string) => {
      setHostId(newHostId);
    },
    [setHostId]
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
  useSocketEvent(socket, SOCKET_SERVER.USER_JOINED, handleUserJoin);
  useSocketEvent(socket, SOCKET_SERVER.USER_UPDATE, handleUserUpdate);
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
  useSocketEvent(
    socket,
    SOCKET_SERVER.USER_STATUS_UPDATE,
    handlesolveStatusUpdate
  );
  useSocketEvent(
    socket,
    SOCKET_SERVER.USER_TOGGLE_COMPETING,
    handleUserToggleCompeting
  );
  useSocketEvent(socket, SOCKET_SERVER.SOLVE_RESET, resetLatestSolve);
  useSocketEvent(
    socket,
    SOCKET_SERVER.SOLVE_FINISHED_EVENT,
    handleSolveFinished
  );
  useSocketEvent(
    socket, SOCKET_SERVER.SOLVE_UPDATE, updateLatestSolve
  )
  useSocketEvent(socket, SOCKET_SERVER.NEW_SOLVE, addNewSolve);
  useSocketEvent(socket, SOCKET_SERVER.NEW_SET, addNewSet);
  useSocketEvent(socket, SOCKET_SERVER.SET_FINISHED_EVENT, handleSetFinished);
  useSocketEvent(
    socket,
    SOCKET_SERVER.MATCH_FINISHED_EVENT,
    handleMatchFinished
  );
  useSocketEvent(socket, SOCKET_SERVER.ROOM_STARTED, startRoom);
  useSocketEvent(socket, SOCKET_SERVER.ROOM_UPDATE, handleRoomUpdate);
  useSocketEvent(socket, SOCKET_SERVER.ROOM_RESET, resetRoom);

  useSocketEvent(socket, SOCKET_SERVER.TEAM_CREATED, createTeam);
  useSocketEvent(socket, SOCKET_SERVER.TEAM_DELETED, deleteTeam);
  useSocketEvent(socket, SOCKET_SERVER.USER_JOIN_TEAM, userJoinTeam);
  useSocketEvent(socket, SOCKET_SERVER.USER_LEAVE_TEAM, userLeaveTeam);

  useSocketEvent(socket, SOCKET_SERVER.TEAM_UPDATE, updateTeam);
  useSocketEvent(socket, SOCKET_SERVER.TEAMS_UPDATE, updateTeams);

  useSocketEvent(socket, SOCKET_SERVER.USER_KICKED, handleLocalUserKicked);
  useSocketEvent(socket, SOCKET_SERVER.USER_BANNED, handleUserBanned);
  useSocketEvent(socket, SOCKET_SERVER.USER_UNBANNED, handleUserUnbanned);
  useSocketEvent(socket, SOCKET_SERVER.USER_SUBMITTED_RESULT, addResult);
  useSocketEvent(socket, SOCKET_SERVER.NEW_HOST, handleNewHost);
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
