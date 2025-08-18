"use client";
import { RoomHeader } from "./room-header";

import { useRoomStore } from "@/context/room-context";
import { useSession } from "@/context/session-context";
import { useSocket } from "@/context/socket-context";
import { IRoom } from "@/types/room";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import LoadingSpinner from "@/components/common/loading-spinner";
import RoomContent from "@/components/room/room-content";
import RoomEventHandler from "./room-event-handler";
import PasswordPrompt from "./password-prompt";
import LoginButton from "@/components/common/login-button";
import { toast } from "sonner";

export default function Room() {
  // grab the roomId from the URL (from "params")
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  // generate socket, fetch local user from session
  const { socket, socketConnected } = useSocket();
  const { user, loading: sessionLoading } = useSession();

  // required state variables for this component
  const [
    isRoomValid,
    isPasswordAuthenticated,
    handleRoomUpdate,
    setIsRoomValid,
    setIsPasswordAuthenticated,
  ] = useRoomStore((s) => [
    s.isRoomValid,
    s.isPasswordAuthenticated,
    s.handleRoomUpdate,
    s.setIsRoomValid,
    s.setIsPasswordAuthenticated,
  ]);

  const router = useRouter();

  /**
   * We will send this callback to the websocket to call upon requested to join room.
   */
  const joinRoomCallback = useCallback(
    (roomValid: boolean, room?: IRoom, extraData?: Record<string, string>) => {
      if (!roomValid) {
        setIsRoomValid(false);
        return;
      }

      if (room) {
        // as long as a room object is returned, we consider the join attempt successful.
        setIsPasswordAuthenticated(true);
        handleRoomUpdate(room);
      }
      
      // use extraData in case of failure
      if (extraData) {
        if (Object.keys(extraData).includes("WRONG_PASSWORD")) {
          toast.error('Wrong password entered. Try again.');
        }
      }
    },
    [handleRoomUpdate, setIsPasswordAuthenticated, setIsRoomValid]
  );

  /**
   * Emit the join_room websocket event upon user login or room load.
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    // Connect socket to room
    if (socket.connected) {
      console.log("Socket already connected — emitting join_room");
    } else {
      console.log("Waiting for socket to connect before emitting join_room");
      socket.connect();
      socket.on("connect", () => {
        console.log("Socket connected. ");
      });
    }
    //only join room upon login
    socket.emit(
      "join_room",
      { userId: user.id, roomId: roomId, password: undefined },
      joinRoomCallback
    );

    // ignore socket missing - we don't want to always rerun this on socket change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user, socketConnected, joinRoomCallback]);

  /**
   * Emit the user_disconnect websocket event upon room unload
   */
  useEffect(() => {
    return () => {
      socket.emit("user_disconnect", {});
    };
  }, [socket]);

  /**
   * If the room is not valid, route the user back to home page automatically
   */
  useEffect(() => {
    if (!isRoomValid) {
      router.push("/");
    }
    // safe to ignore router dependency here since we only push
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRoomValid]);

  // render a loading icon if loading
  if (sessionLoading) {
    return (
      <div className="flex flex-col h-screen">
        <RoomHeader />
        <div className="grow">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // if not logged in, make the user log in first.
  if (!user) {
    return (
      <div className="flex flex-col h-screen">
        <RoomHeader />
        <div className="flex flex-col">
          <div className="grow font-bold text-xl text-center content-center">
            You are not logged in. Please log in to join the room.
          </div>
          <LoginButton />
        </div>
      </div>
    );
  }

  // if not password authenticated, render blank screen with dialog
  if (!isPasswordAuthenticated) {
    return (
      <div className="flex flex-col h-screen">
        <PasswordPrompt
          socket={socket}
          roomId={roomId}
          userId={user.id}
          passwordValidationCallback={joinRoomCallback}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <RoomHeader />
      <RoomContent />
      <RoomEventHandler />
    </div>
  );
}
