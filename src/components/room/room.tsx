"use client";
import { RoomHeader } from "@/components/room/room-header";

import { useRoomStore } from "@/context/room-context";
import { useSession } from "@/context/session-context";
import { useSocket } from "@/context/socket-context";
import { IRoom } from "@/types/room";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import RoomContent from "@/components/room/room-content";
import RoomEventHandler from "@/components/room/room-event-handler";
import PasswordPrompt from "@/components/room/password-prompt";
import LoginButton from "@/components/common/login-button";
import { toast } from "sonner";
import { SOCKET_CLIENT } from "@/types/socket_protocol";
import PageWrapper from "@/components/common/page-wrapper";
import LoadingSpinner from "@/components/common/loading-spinner";

export default function Room() {
  // grab the roomId from the URL (from "params")
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  // generate socket, fetch local user from session
  const { socket, socketConnected } = useSocket();
  const user = useSession();

  // required state variables for this component
  const [handleRoomUpdate, handleRoomUserUpdate] = useRoomStore((s) => [
    s.handleRoomUpdate,
    s.handleRoomUserUpdate,
  ]);

  const [isRoomValid, setIsRoomValid] = useState<boolean | null>(null);
  const [isPasswordAuthenticated, setIsPasswordAuthenticated] = useState<
    boolean | null
  >(null);

  const router = useRouter();

  /**
   * We will send this callback to the websocket to call upon requested to join room.
   */
  const joinRoomCallback = useCallback(
    (roomValid: boolean, room?: IRoom, extraData?: Record<string, string>) => {
      if (!roomValid) {
        setIsRoomValid(false);
        toast.error("Room does not exist. Returning to home page.");
        return;
      } else {
        setIsRoomValid(true);
      }

      if (room) {
        // as long as a room object is returned, we consider the join attempt successful.
        setIsPasswordAuthenticated(true);
        handleRoomUpdate(room);
      }

      // use extraData in case of failure
      if (extraData) {
        if (Object.keys(extraData).includes("WRONG_PASSWORD")) {
          setIsPasswordAuthenticated(false);
          toast.error("Wrong password entered. Try again.");
        }

        if (Object.keys(extraData).includes("USER_BANNED")) {
          router.push("/");
          toast.error("You are banned from this room.");
        }

        if (Object.keys(extraData).includes("EXISTING_USER_INFO")) {
          //special process user info
          handleRoomUserUpdate(room!.users[extraData["EXISTING_USER_INFO"]]);
        }

        if (Object.keys(extraData).includes("ROOM_FULL")) {
          setIsRoomValid(false);
          toast.error("The room is already full!");
        }
      }
    },
    [
      handleRoomUpdate,
      handleRoomUserUpdate,
      setIsPasswordAuthenticated,
      setIsRoomValid,
      router,
    ]
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
    // only join room upon login
    socket.emit(
      SOCKET_CLIENT.JOIN_ROOM,
      { userId: user.userInfo.id, roomId: roomId, password: undefined },
      joinRoomCallback
    );

    return () => {
      // emit leave room
      if (socket && socket.connected) {
        socket.emit(SOCKET_CLIENT.LEAVE_ROOM, roomId);
      }
    };

    // ignore socket missing - we don't want to always rerun this on socket change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user, socketConnected, joinRoomCallback]);

  useEffect(() => {
    if (isRoomValid === false) {
      router.push("/");
    }
  }, [router, isRoomValid]);

  // if not logged in, make the user log in first.
  if (!user) {
    return (
      <PageWrapper>
        <RoomHeader />
        <div className="flex flex-col">
          <div className="grow font-bold text-xl text-center content-center">
            You are not logged in. Please log in to join the room.
          </div>
          <LoginButton />
        </div>
      </PageWrapper>
    );
  }

  if (isPasswordAuthenticated === null && isRoomValid === null) {
    return (
      <PageWrapper>
        <div className="flex flex-row h-full w-full items-center justify-center">
          <LoadingSpinner className="size-28" />
        </div>
      </PageWrapper>
    );
  }

  // if not password authenticated, render blank screen with dialog
  if (!isPasswordAuthenticated) {
    return (
      <PageWrapper>
        <PasswordPrompt
          socket={socket}
          roomId={roomId}
          userId={user.userInfo.id}
          passwordValidationCallback={joinRoomCallback}
        />
      </PageWrapper>
    );
  }

  /**
   * Only render proper content and set up event handling
   */
  return (
    <PageWrapper>
      <RoomHeader />
      <RoomContent />
      <RoomEventHandler />
    </PageWrapper>
  );
}
