import { useRoomStore } from "@/context/room-context";
import { useSocket } from "@/context/socket-context";
import { useCallbackOnTransition } from "@/hooks/useCallbackOnTransition";
import { useStartTimeOnTransition } from "@/hooks/useStartTimeOnTransition";
import { Result } from "@/types/result";
import { SolveStatus } from "@/types/status";
import { isLiveTimer } from "@/types/timer-type";
import { useCallback, useEffect } from "react";

/**
 * Handles all events for the room so that the room component itself doesn't have to re-render upon state udates
 */
export default function RoomEventHandler() {
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
  const { socket, socketConnected } = useSocket();

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
    socket.emit("user_update_status", localSolveStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSolveStatus]);

  /**
   * Connect incoming room_update events from websocket with zustand store handleRoomUpdate
   */
  useEffect(() => {
    socket.on("room_update", handleRoomUpdate);

    return () => {
      socket.off("room_update", handleRoomUpdate);
    };
  }, [handleRoomUpdate, socket]);

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

  // listen for solve finished websocket event
  useEffect(() => {
    socket.on("solve_finished", solveFinishedHandler);
    return () => {
      socket.off("solve_finished", solveFinishedHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solveFinishedHandler]);

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
      socket.emit("user_start_live_timer");
    }
  }, [socket, timerType]);

  const broadcastStopLiveTimerCallback = useCallback(() => {
    if (socket && socket.connected && isLiveTimer(timerType)) {
      socket.emit("user_stop_live_timer");
    }
  }, [socket, timerType]);

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
   * For all socket listen events
   */
  useEffect(() => {
    if (socket.connected) {
      socket.on("user_started_live_timer", userStartedLiveTimerCallback);
      socket.on("user_stopped_live_timer", userStoppedLiveTimerCallback);
    }

    return () => {
      socket.off("user_started_live_timer", userStartedLiveTimerCallback);
      socket.off("user_stopped_live_timer", userStoppedLiveTimerCallback);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    socketConnected,
    userStartedLiveTimerCallback,
    userStoppedLiveTimerCallback,
  ]);
  // this component should never render. it will house all logic though.
  return null;
}
