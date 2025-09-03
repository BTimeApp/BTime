import { cn } from "@/lib/utils";
import {
  MATCH_FORMAT_ABBREVIATION_MAP,
  ROOM_EVENT_DISPLAY_NAME_MAP,
  SET_FORMAT_ABBREVIATION_MAP,
} from "@/types/room";
import { Button } from "@/components/ui/button";
import Header from "@/components/common/header";
import { useCallback } from "react";
import { useRoomStore } from "@/context/room-context";
import { useSocket } from "@/context/socket-context";
import { useSession } from "@/context/session-context";
import { Settings } from "lucide-react";
import RoomSettingsDialog from "@/components/room/room-settings-dialog";
import { SOCKET_CLIENT } from "@/types/socket_protocol";

export function RoomHeader() {
  const [
    roomName,
    isPasswordAuthenticated,
    roomState,
    roomEvent,
    roomFormat,
    currentSet,
    currentSolve,
    users,
    matchFormat,
    setFormat,
    numSets,
    numSolves,
    isUserHost,
  ] = useRoomStore((s) => [
    s.roomName,
    s.isPasswordAuthenticated,
    s.roomState,
    s.roomEvent,
    s.roomFormat,
    s.currentSet,
    s.currentSolve,
    s.users,
    s.matchFormat,
    s.setFormat,
    s.nSets,
    s.nSolves,
    s.isUserHost,
  ]);

  const { user } = useSession();
  const { socket } = useSocket();

  const getNextScramble = useCallback(() => {
    if (user && isUserHost(user.id)) {
      socket.emit(SOCKET_CLIENT.SKIP_SCRAMBLE);
    }
  }, [user, socket, isUserHost]);

  const startRoom = useCallback(() => {
    if (user && isUserHost(user.id)) {
      socket.emit(SOCKET_CLIENT.START_ROOM);
    }
  }, [user, isUserHost, socket]);

  const rematchRoom = useCallback(() => {
    if (user && isUserHost(user.id)) {
      socket.emit(SOCKET_CLIENT.REMATCH_ROOM);
    }
  }, [user, isUserHost, socket]);

  // This is meant specifically to be used when the user toggles their spectating/competing status
  const toggleCompeting = useCallback(() => {
    if (user) {
      //submit the NEW competing boolean - true if currently spectating
      socket.emit(SOCKET_CLIENT.TOGGLE_COMPETING, !users[user.id].competing);
    }
  }, [user, users, socket]);

  if (!isPasswordAuthenticated || !user) {
    return (
      <Header>
        <></>
      </Header>
    );
  } else {
    switch (roomState) {
      case "WAITING":
        return (
          <Header>
            <div className="flex flex-row gap-3 items-center justify-center text-center items-stretch">
              <div className="flex-1 flex flex-col gap-3">
                {isUserHost(user.id) && (
                  <div className="flex-1 flex flex-col justify-end">
                    <Button
                      variant="outline"
                      size="default"
                      className={cn("px-1 self-end")}
                      onClick={startRoom}
                      onKeyDown={(e) => e.preventDefault()}
                    >
                      <p className={cn("font-bold text-center text-md")}>
                        START ROOM
                      </p>
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex-5 md:flex-10 text-center flex flex-col overflow-wrap">
                <h2 className="text-3xl font-bold">{roomName}</h2>
                <h4 className="text-lg">
                  {ROOM_EVENT_DISPLAY_NAME_MAP.get(roomEvent)}
                </h4>
              </div>
              <div className="flex-1 flex flex-col gap-3">
                {isUserHost(user.id) && (
                  <div className="flex-1 flex flex-col justify-start">
                    <RoomSettingsDialog>
                      <Button size="icon" className="self-end" variant="icon">
                        <Settings className="size-8" />
                      </Button>
                    </RoomSettingsDialog>
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-end">
                  <Button
                    className="mt-auto"
                    variant="outline"
                    onClick={toggleCompeting}
                  >
                    <p className="font-bold text-center text-md">
                      {users[user.id]?.competing ? "SPECTATE" : "COMPETE"}
                    </p>
                  </Button>
                </div>
              </div>
            </div>
          </Header>
        );
      case "STARTED":
        return (
          <Header>
            <div className="flex flex-row gap-3 items-center justify-center text-center items-stretch">
              <div className="flex-1 flex flex-col gap-3">
                {isUserHost(user.id) && (
                  <div className="flex-1 text-center flex flex-col justify-end">
                    <Button
                      variant="outline"
                      size="lg"
                      className={cn("px-1")}
                      onClick={getNextScramble}
                      onKeyDown={(e) => e.preventDefault()}
                    >
                      <h1 className={cn("font-bold text-center text-md")}>
                        NEXT SCRAMBLE
                      </h1>
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex-5 md:flex-10 text-center flex flex-col overflow-wrap justify-center">
                <h2 className="text-3xl font-bold">{roomName}</h2>
                <h4 className="text-lg">
                  {ROOM_EVENT_DISPLAY_NAME_MAP.get(roomEvent)}
                  {MATCH_FORMAT_ABBREVIATION_MAP.has(matchFormat) &&
                  roomFormat !== "CASUAL"
                    ? " | " +
                      MATCH_FORMAT_ABBREVIATION_MAP.get(matchFormat) +
                      numSets.toString() +
                      " sets | "
                    : ""}
                  {SET_FORMAT_ABBREVIATION_MAP.has(setFormat) &&
                  roomFormat !== "CASUAL"
                    ? SET_FORMAT_ABBREVIATION_MAP.get(setFormat) +
                      numSolves.toString() +
                      " solves"
                    : ""}
                </h4>
                {roomFormat === "RACING" && (
                  <p className="text-lg">
                    Set {currentSet} Solve {currentSolve}
                  </p>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-3">
                {isUserHost(user.id) && (
                  <div className="flex-1 flex flex-col justify-start">
                    <RoomSettingsDialog>
                      <Button
                        size="icon"
                        className="self-end"
                        variant="icon"
                        onKeyDown={(e) => e.preventDefault()}
                      >
                        <Settings className="size-8" />
                      </Button>
                    </RoomSettingsDialog>
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-end">
                  <Button
                    className="mt-auto"
                    variant="outline"
                    onClick={toggleCompeting}
                    onKeyDown={(e) => e.preventDefault()}
                  >
                    <p className="font-bold text-center text-md">
                      {users[user.id]?.competing ? "SPECTATE" : "COMPETE"}
                    </p>
                  </Button>
                </div>
              </div>
            </div>
          </Header>
        );
      case "FINISHED":
        return (
          <Header>
            <div className="flex flex-row gap-3 items-center justify-center text-center items-stretch">
              <div className="flex-1 flex flex-col gap-3">
                {isUserHost(user.id) && (
                  <div className="flex-1 flex flex-col justify-end">
                    <Button
                      variant="outline"
                      size="default"
                      className={cn("px-1 self-end")}
                      onClick={rematchRoom}
                      onKeyDown={(e) => e.preventDefault()}
                    >
                      <h1 className={cn("font-bold text-center text-md")}>
                        REMATCH
                      </h1>
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex-5 md:flex-10 text-center flex flex-col overflow-wrap">
                <h2 className="text-3xl font-bold">{roomName}</h2>
                <h4 className="text-lg">
                  {ROOM_EVENT_DISPLAY_NAME_MAP.get(roomEvent)}
                </h4>
              </div>
              <div className="flex-1 flex flex-col gap-3">
                {isUserHost(user.id) && (
                  <div className="flex-1 flex flex-col justify-start">
                    <RoomSettingsDialog>
                      <Button size="icon" className="self-end" variant="icon">
                        <Settings className="size-8" />
                      </Button>
                    </RoomSettingsDialog>
                  </div>
                )}
                <div className="flex-1 flex flex-col justify-end">
                  <Button
                    className="mt-auto"
                    variant="outline"
                    onClick={toggleCompeting}
                  >
                    <p className="font-bold text-center text-md">
                      {users[user.id]?.competing ? "SPECTATE" : "COMPETE"}
                    </p>
                  </Button>
                </div>
              </div>
            </div>
          </Header>
        );
      default:
        break;
    }
  }
}
