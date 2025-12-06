import { abbreviate, cn } from "@/lib/utils";
import { ROOM_EVENTS_INFO } from "@/types/room";
import { Button } from "@/components/ui/button";
import { Header, HeaderTitle } from "@/components/common/header";
import { useCallback, useMemo } from "react";
import { useRoomStore } from "@/context/room-context";
import { useSocket } from "@/context/socket-context";
import { useSession } from "@/context/session-context";
import { Settings } from "lucide-react";
import RoomSettingsDialog from "@/components/room/room-settings-dialog";
import { SOCKET_CLIENT } from "@/types/socket_protocol";
import CreateTeamDialog from "@/components/room/create-team-dialog";

export function RoomHeader() {
  const [
    roomName,
    isPasswordAuthenticated,
    roomState,
    roomEvent,
    currentSet,
    currentSolve,
    users,
    teams,
    raceSettings,
    teamSettings,
    isUserHost,
  ] = useRoomStore((s) => [
    s.roomName,
    s.isPasswordAuthenticated,
    s.roomState,
    s.roomEvent,
    s.currentSet,
    s.currentSolve,
    s.users,
    s.teams,
    s.raceSettings,
    s.teamSettings,
    s.isUserHost,
  ]);

  const user = useSession();
  const { socket } = useSocket();

  const getNextScramble = useCallback(() => {
    if (user && isUserHost(user.userInfo.id)) {
      socket.emit(SOCKET_CLIENT.NEW_SCRAMBLE);
    }
  }, [user, socket, isUserHost]);

  const startRoom = useCallback(() => {
    if (user && isUserHost(user.userInfo.id)) {
      socket.emit(SOCKET_CLIENT.START_ROOM);
    }
  }, [user, isUserHost, socket]);

  const rematchRoom = useCallback(() => {
    if (user && isUserHost(user.userInfo.id)) {
      socket.emit(SOCKET_CLIENT.REMATCH_ROOM);
    }
  }, [user, isUserHost, socket]);

  // This is meant specifically to be used when the user toggles their spectating/competing status
  const toggleCompeting = useCallback(() => {
    if (user) {
      //submit the NEW competing boolean - true if currently spectating
      socket.emit(
        SOCKET_CLIENT.TOGGLE_COMPETING,
        !users[user.userInfo.id].competing
      );
    }
  }, [user, users, socket]);

  const bottomLeftButton = useMemo(() => {
    if (!isUserHost(user?.userInfo.id)) {
      return <></>;
    }

    switch (roomState) {
      case "WAITING":
        return (
          <Button
            variant="outline"
            size="default"
            className="px-1"
            onClick={startRoom}
            onKeyDown={(e) => e.preventDefault()}
          >
            <p className={cn("font-bold text-center text-md")}>START ROOM</p>
          </Button>
        );
      case "STARTED":
        return (
          <Button
            variant="outline"
            size="lg"
            className="px-1"
            onClick={getNextScramble}
            onKeyDown={(e) => e.preventDefault()}
          >
            <h1 className={cn("font-bold text-center text-md")}>
              NEW SCRAMBLE
            </h1>
          </Button>
        );
      case "FINISHED":
        return (
          <Button
            variant="outline"
            size="default"
            className="px-1"
            onClick={rematchRoom}
            onKeyDown={(e) => e.preventDefault()}
          >
            <h1 className={cn("font-bold text-center text-md")}>REMATCH</h1>
          </Button>
        );
      default:
        console.error(`Illegal Room State: ${roomState}`);
        return <></>;
    }
  }, [user, roomState, isUserHost, startRoom, getNextScramble, rematchRoom]);

  const bottomRightButton = useMemo(() => {
    if (
      teamSettings.teamsEnabled &&
      isUserHost(user?.userInfo.id) &&
      (!teamSettings.maxNumTeams ||
        Object.values(teams).length < teamSettings.maxNumTeams)
    ) {
      return (
        <CreateTeamDialog>
          <Button variant="outline" className="text-md">
            Add Team(s)
          </Button>
        </CreateTeamDialog>
      );
    } else {
      if (!user) {
        return <></>;
      }
      return (
        <Button className="mt-auto" variant="outline" onClick={toggleCompeting}>
          <p className="font-bold text-center text-md">
            {users[user.userInfo.id]?.competing ? "SPECTATE" : "COMPETE"}
          </p>
        </Button>
      );
    }
  }, [teamSettings, user, users, teams, isUserHost, toggleCompeting]);

  const headerCenterElement = useMemo(() => {
    switch (roomState) {
      case "WAITING":
        return (
          <>
            <HeaderTitle title={roomName} />
            <h4 className="text-lg">
              {ROOM_EVENTS_INFO[roomEvent].displayName}
            </h4>
          </>
        );
      case "STARTED":
        return (
          <>
            <HeaderTitle title={roomName} />
            <h4 className="text-lg">
              {ROOM_EVENTS_INFO[roomEvent].displayName}
              {raceSettings.roomFormat !== "CASUAL"
                ? " | " +
                  abbreviate(raceSettings.matchFormat) +
                  raceSettings.nSets.toString() +
                  " sets"
                : ""}
              {raceSettings.roomFormat !== "CASUAL"
                ? " | " +
                  abbreviate(raceSettings.setFormat) +
                  raceSettings.nSolves.toString() +
                  " solves"
                : ""}
              {teamSettings.teamsEnabled &&
              teamSettings.teamFormatSettings.teamSolveFormat === "ALL"
                ? " | " +
                  teamSettings.teamFormatSettings.teamReduceFunction.toLowerCase() +
                  " of team"
                : ""}
            </h4>
            {raceSettings.roomFormat === "RACING" && (
              <p className="text-lg">
                Set {currentSet} Solve {currentSolve}
              </p>
            )}
          </>
        );
      case "FINISHED":
        return (
          <>
            <HeaderTitle title={roomName} />
            <h4 className="text-lg">
              {ROOM_EVENTS_INFO[roomEvent].displayName}
            </h4>
          </>
        );
      default:
        console.error(`Illegal Room State: ${roomState}`);
        return <></>;
    }
  }, [
    currentSet,
    currentSolve,
    roomState,
    roomName,
    roomEvent,
    raceSettings,
    teamSettings,
  ]);

  if (!isPasswordAuthenticated || !user) {
    return <></>;
  } else {
    return (
      <Header>
        <div className="flex gap-3 w-full h-fit">
          <div className="flex-1 flex flex-col justify-end gap-3">
            {bottomLeftButton}
          </div>
          <div className="flex-5 md:flex-10 min-w-0 text-center flex flex-col justify-center overflow-hidden">
            {headerCenterElement}
          </div>
          <div className="flex-1 flex flex-col gap-3">
            {isUserHost(user.userInfo.id) && (
              <div className="flex-1 flex flex-col items-center justify-start">
                <RoomSettingsDialog>
                  <Button size="icon" className="self-end" variant="icon">
                    <Settings className="size-8" />
                  </Button>
                </RoomSettingsDialog>
              </div>
            )}
            <div className="flex-1 flex flex-col items-center justify-end">
              {bottomRightButton}
            </div>
          </div>
        </div>
      </Header>
    );
  }
}
