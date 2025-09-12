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

/**
 * Handles all events for the room so that the room component itself doesn't have to re-render upon state udates
 */
export default function RoomEventHandler() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  const [
    localPenalty,
    localResult,
    localSolveStatus,
    roomState,
    timerType,
    setLocalResult,
    setLocalPenalty,
    setLiveTimerStartTime,
    handleRoomUpdate,
    resetLocalSolveStatus,
    addUserLiveStartTime,
    addUserLiveStopTime,
    clearUserLiveStartTimes,
    clearUserLiveTimes,
  ] = useRoomStore((s) => [
    s.localPenalty,
    s.localResult,
    s.localSolveStatus,
    s.roomState,
    s.timerType,
    s.setLocalResult,
    s.setLocalPenalty,
    s.setLiveTimerStartTime,
    s.handleRoomUpdate,
    s.resetLocalSolveStatus,
    s.addUserLiveStartTime,
    s.addUserLiveStopTime,
    s.clearUserLiveStartTimes,
    s.clearUserLiveTimes,
  ]);
  const { socket } = useSocket();

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
   * Update user status on backend whenever frontend updates.
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
    // ignore lint warning - we do not want userStatus change to trigger this hook
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

  const userStartedLiveTimerCallback = useCallback(
    (userId: string) => {
      addUserLiveStartTime(userId, performance.now());
    },
    [addUserLiveStartTime]
  );

  const userStoppedLiveTimerCallback = useCallback(
    (userId: string) => {
      addUserLiveStopTime(userId, performance.now());
    },
    [addUserLiveStopTime]
  );

  /**
   * Callback for solve finish websocket event
   */
  const solveFinishedHandler = useCallback(() => {
    resetLocalSolveStatus();
    setLocalPenalty("OK");
    clearUserLiveStartTimes();
    clearUserLiveTimes();
  }, [
    resetLocalSolveStatus,
    setLocalPenalty,
    clearUserLiveStartTimes,
    clearUserLiveTimes,
  ]);

  const handleLocalUserKicked = useCallback(() => {
    console.log("User kicked");
    toast.warning("You were kicked from the room");
    window.location.href = "/";
  }, []);

  const handleLocalUserBanned = useCallback(() => {
    toast.error("You were banned from the room");
    window.location.href = "/";
  }, [])

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
  useSocketEvent(
    socket,
    SOCKET_SERVER.USER_START_LIVE_TIMER,
    userStartedLiveTimerCallback
  );
  useSocketEvent(
    socket,
    SOCKET_SERVER.USER_STOP_LIVE_TIMER,
    userStoppedLiveTimerCallback
  );
  useSocketEvent(
    socket,
    SOCKET_SERVER.SOLVE_FINISHED_EVENT,
    solveFinishedHandler
  );
  useSocketEvent(socket, SOCKET_SERVER.ROOM_UPDATE, handleRoomUpdate);

  useSocketEvent(socket, SOCKET_SERVER.USER_KICKED, handleLocalUserKicked);
  useSocketEvent(socket, SOCKET_SERVER.USER_BANNED, handleLocalUserBanned);
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

  // this component should never render. it will house all logic though.
  return null;
}
