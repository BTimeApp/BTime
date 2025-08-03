import { cn } from "@/lib/utils";
import { ROOM_EVENT_JS_NAME_MAP, RoomEvent, RoomState } from "@/types/room";
import { Button } from "@/components/ui/button";
import Header from "@/components/common/header";
import { useCallback } from "react";
import { Socket } from "socket.io-client";

type RoomHeaderContentProps = {
  socket: Socket;
  roomState: RoomState;
  scramble?: string;
  currentSet?: number;
  currentSolve?: number;
  isHost: boolean;
};

type RoomHeaderProps = {
  passwordAuthenticated: boolean;
  socket: Socket;
  roomState: RoomState;
  scramble?: string;
  currentSet?: number;
  currentSolve?: number;
  drawScramble?: boolean;
  isHost: boolean;
  roomName: string;
  roomEvent: RoomEvent;
};

function RoomHeaderContent({
  socket,
  roomState,
  scramble,
  isHost,
  currentSet,
  currentSolve,
}: RoomHeaderContentProps) {
  const getNextScramble = useCallback(() => {
    if (isHost) {
      socket.emit("skip_scramble");
    }
  }, [socket, isHost]);

  const resetRoom = useCallback(() => {
    if (isHost) {
      socket.emit("reset_room");
    }
  }, [socket, isHost]);

  let mainContent = <></>;

  switch (roomState) {
    case "WAITING":
      mainContent = (
        <>
          <h2 className={cn("text-2xl")}>
            Scramble will display after starting
          </h2>
        </>
      );
      break;
    case "STARTED":
      //   const scramble = currentSolve > 0 ? solves.at(-1)!.solve.scramble : "";
      mainContent = (
        <>
          <h2 className={cn("text-2xl")}>{scramble}</h2>
        </>
      );
      break;
    case "FINISHED":
      mainContent = (
        <>
          <h2 className={cn("text-2xl")}>Room has finished!</h2>
        </>
      );
      break;
    default:
      break;
  }

  return (
    <>
      <div className={cn("grid grid-cols-8 text-center")}>
        <div className={cn("col-span-1 grid grid-rows-3")}>
          {roomState == "STARTED" ? (
            <div className={cn("row-span-1 text-lg")}>Set {currentSet}</div>
          ) : (
            <></>
          )}
          {roomState == "STARTED" && isHost ? (
            <div className={cn("row-span-1 row-start-3")}>
              <Button
                variant="outline"
                size="lg"
                className={cn("px-1")}
                onClick={getNextScramble}
              >
                <h1 className={cn("font-bold text-center text-md")}>
                  NEXT SCRAMBLE
                </h1>
              </Button>
            </div>
          ) : (
            <></>
          )}
        </div>

        <div className={cn("col-span-6 content-center grid-row")}>
          {mainContent}
        </div>

        <div className={cn("col-span-1 grid grid-rows-3")}>
          {roomState == "STARTED" ? (
            <div className={cn("row-span-1 text-lg")}>Solve {currentSolve}</div>
          ) : (
            <></>
          )}
          {roomState == "STARTED" && isHost ? (
            <div className={cn("row-span-1 row-start-3")}>
              <Button
                variant="reset"
                size="lg"
                className={cn("px-1")}
                onClick={resetRoom}
              >
                <h1 className={cn("font-bold text-center text-md")}>
                  RESET ROOM
                </h1>
              </Button>
            </div>
          ) : (
            <></>
          )}
        </div>
      </div>
    </>
  );
}

export function RoomHeader({
  passwordAuthenticated,
  socket,
  roomState,
  scramble,
  isHost,
  currentSet,
  currentSolve,
  roomName,
  roomEvent,
}: RoomHeaderProps) {
  if (!passwordAuthenticated) {
    return (
      <Header>
        <div className="text-center">
          <h2 className={cn("text-2xl")}>{roomName}</h2>
          <div>{roomEvent}</div>
        </div>
      </Header>
    );
  } else {
    return (
      <Header>
        <RoomHeaderContent
          roomState={roomState}
          isHost={isHost}
          socket={socket}
          scramble={scramble}
          currentSet={currentSet}
          currentSolve={currentSolve}
        />
      </Header>
    );
  }
}
