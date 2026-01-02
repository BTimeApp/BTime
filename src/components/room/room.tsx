"use client";
import { RoomHeader } from "@/components/room/room-header";

import { useRoomActions } from "@/context/room-context";
import { useSession } from "@/context/session-context";
import { useSocket } from "@/context/socket-context";
import { IRoom, USER_JOIN_FAILURE_REASON } from "@/types/room";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import RoomContent from "@/components/room/room-content";
import RoomEventHandler from "@/components/room/room-event-handler";
import PasswordPrompt from "@/components/room/password-prompt";
import LoginButton from "@/components/common/login-button";
import { toast } from "sonner";
import { SOCKET_CLIENT, SOCKET_SERVER } from "@/types/socket_protocol";
import PageWrapper from "@/components/common/page-wrapper";
import LoadingSpinner from "@/components/common/loading-spinner";
import { useSocketEvent } from "@/hooks/use-socket-event";

export default function Room() {
  // grab the roomId from the URL (from "params")
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;

  // generate socket, fetch local user from session
  const socket = useSocket();
  const user = useSession();

  // required state variables for this component
  const { handleRoomUpdate, setUpLocalUserState, resetLocalSolveStatus } =
    useRoomActions();

  const [userJoined, setUserJoined] = useState<boolean | null>(null);

  const router = useRouter();

  /**
   * Emit the join_room websocket event upon user login or room load.
   */
  useEffect(() => {
    if (!user) {
      return;
    }
    const onDisconnect = () => {
      console.log("Socket disconnected. Routing to home page...");
      router.push("/");
    };

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
    socket.on("disconnect", onDisconnect);

    // only join room upon login
    socket.emit(SOCKET_CLIENT.JOIN_ROOM, {
      roomId: roomId,
      password: undefined,
    });

    return () => {
      // emit leave room
      if (socket && socket.connected) {
        socket.emit(SOCKET_CLIENT.LEAVE_ROOM, { roomId });
      }

      socket.off("disconnect", onDisconnect);
    };

    // ignore socket missing - we don't want to always rerun this on socket change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user]);

  const handleInvalidRoom = useCallback(() => {
    toast.error("Room does not exist. Returning to home page.");
    router.push("/");
  }, [router]);

  const handleJoinRoomSuccess = useCallback(
    ({ room, userId }: { room: IRoom; userId?: string }) => {
      handleRoomUpdate(room);
      resetLocalSolveStatus();

      // is true when roomuser already exists (duplicate join or not first join)
      if (userId) {
        setUpLocalUserState(room.users[userId]);
      }

      setUserJoined(true);
    },
    [handleRoomUpdate, resetLocalSolveStatus, setUpLocalUserState]
  );

  const handleJoinRoomFail = useCallback(
    ({ reason }: { reason: USER_JOIN_FAILURE_REASON }) => {
      switch (reason) {
        case USER_JOIN_FAILURE_REASON.ROOM_FULL:
          toast.error("Room full. Routing to home page");
          router.push("/");
          break;
        case USER_JOIN_FAILURE_REASON.USER_BANNED:
          toast.error("You are banned from this room. Routing to home page");
          router.push("/");
          break;
        case USER_JOIN_FAILURE_REASON.UNDEFINED_PASSWORD:
          console.log("undefined password");
          setUserJoined(false);
          break;
        case USER_JOIN_FAILURE_REASON.WRONG_PASSWORD:
          toast.error("Wrong password entered. Try again.");
          console.log("wrong password");
          setUserJoined(false);
          break;
        default:
          console.warn(
            `Invalid reason for failing to join room: ${reason}. Routing to home page.`
          );
          router.push("/");
      }
    },
    [router]
  );

  /**
   * handle these room events in this component rather than in event handler (which should be after successful join)
   */
  useSocketEvent(socket, SOCKET_SERVER.INVALID_ROOM, handleInvalidRoom);
  useSocketEvent(
    socket,
    SOCKET_SERVER.USER_JOIN_ROOM_USER_SUCCESS,
    handleJoinRoomSuccess
  );
  useSocketEvent(
    socket,
    SOCKET_SERVER.USER_JOIN_ROOM_USER_FAIL,
    handleJoinRoomFail
  );

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

  if (userJoined == null) {
    return (
      <PageWrapper>
        <div className="flex flex-row h-full w-full items-center justify-center">
          <LoadingSpinner className="size-28" />
        </div>
      </PageWrapper>
    );
  }

  // if not password authenticated, render blank screen with dialog
  if (userJoined == false) {
    return (
      <PageWrapper>
        <PasswordPrompt socket={socket} roomId={roomId} />
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
