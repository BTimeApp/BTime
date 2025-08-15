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
    handleRoomUpdate,
    setIsRoomValid,
    setIsPasswordAuthenticated,
  ] = useRoomStore((s) => [
    s.isRoomValid,
    s.handleRoomUpdate,
    s.setIsRoomValid,
    s.setIsPasswordAuthenticated,
  ]);

  const router = useRouter();

  /**
   * We will send this callback to the websocket to call upon requested to join room.
   */
  const passwordValidationCallback = useCallback(
    (passwordValid: boolean, roomValid: boolean, room?: IRoom) => {
      if (!roomValid) {
        setIsRoomValid(false);
        return;
      }

      if (passwordValid) {
        setIsPasswordAuthenticated(passwordValid);
        if (room) {
          // as long as this function only has setStates inside, no need to add to dependency list
          //TODO reimplement
          handleRoomUpdate(room);
        } else {
          // this should not happen - if it does, needs to be handled properly
          console.log("Password is valid but room not received...");
        }
      } else {
        //TODO - trigger some error behavior saying "password bad" or smth
        console.log("Password not valid!");
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
      passwordValidationCallback
    );

    // ignore socket missing - we don't want to always rerun this on socket change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user, socketConnected, passwordValidationCallback]);

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
        <div className="grow font-bold text-xl text-center content-center">
          You are not logged in. Please log in to join the room.
        </div>
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
