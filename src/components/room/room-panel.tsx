import { useRoomStore } from "@/context/room-context";
import { cn } from "@/lib/utils";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  getFormatText,
  getVerboseFormatText,
  ROOM_EVENTS_INFO,
} from "@/types/room";
import GlobalTimeList from "@/components/room/global-time-list";
import { IRoomUser } from "@/types/room-participant";
import { Result } from "@/types/result";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import TimerSection from "@/components/room/timer-section";
import RoomSubmittingButtons from "@/components/room/room-submitting-buttons";
import UserRoomSettingsDialog from "@/components/room/user-room-settings-dialog";
import UserLiveTimer from "@/components/room/user-live-timer";
import RoomUserDialog from "@/components/room/room-user-dialog";
import { useSession } from "@/context/session-context";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";
import CreateTeamDialog from "./create-team-dialog";
import {
  DeleteTeamButton,
  JoinTeamButton,
  LeaveTeamButton,
} from "./team-action-buttons";
import RoomTeamDialog from "./room-team-dialog";

type RoomPanelProps = {
  className?: string;
  /**
   * Type of Room Panel we want to render.
   *   user - displays info about a user or the user's active panel for the room
   *   summary - displays summary info about the room. use for when the room is STARTED
   *   info - displays high-level info about the room. use for when the room is WAITING or FINISHED
   *   participantlist - displays info about participants in the room (competitors, spectators)
   */
  type?: "user" | "summary" | "info" | "participantlist";
  /**
   * whether this panel belongs on the left or right (in a web display). On small screens, might be top and bottom.
   */
  side?: "left" | "right";
  userId?: string; //if this is a user panel, the userId corresponding to the user
  isLocalUser?: boolean;
  inCarousel?: boolean; //if we are in a carousel
};

/**
 * Common props for all sub room panel types
 */
type SubRoomPanelBaseProps = {
  side?: "left" | "right";
  className?: string;
};

type UserRoomPanelProps = SubRoomPanelBaseProps & {
  userId: string; //user associated with this panel
  isLocalUser?: boolean;
};

type SummaryRoomPanelProps = SubRoomPanelBaseProps & {};

type InfoRoomPanelProps = SubRoomPanelBaseProps & {};

type ParticipantListRoomPanelProps = SubRoomPanelBaseProps & {};

function UserStatusSection({
  className,
  userId,
}: {
  className?: string;
  userId: string;
}) {
  const [users] = useRoomStore((s) => [s.users]);
  return (
    <div className={className}>
      <p>{users[userId].solveStatus}</p>
    </div>
  );
}

function UserCenterSection({
  className = "",
  userId,
  isLocalUser = false,
}: UserRoomPanelProps) {
  const [users, solveStatus, solves, roomEvent, drawScramble] = useRoomStore(
    (s) => [s.users, s.localSolveStatus, s.solves, s.roomEvent, s.drawScramble]
  );

  if (!users[userId]) {
    return null;
  }

  const currScramble = solves.at(-1)?.solve.attempts[userId]?.scramble ?? "";
  return (
    <div className={cn("flex flex-row w-full h-full", className)}>
      <div className="flex flex-col grow w-full">
        <div className="flex-0 flex flex-col">
          {solveStatus !== "FINISHED" && (
            <div className="text-2xl">{currScramble}</div>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-center">
          {isLocalUser ? (
            users[userId].competing ? (
              <>
                <TimerSection />
                {solveStatus === "SUBMITTING" && <RoomSubmittingButtons />}
              </>
            ) : (
              <div>You are spectating. Compete to use timer.</div>
            )
          ) : (
            <UserStatusSection className="text-2xl font-bold" userId={userId} />
          )}
        </div>
        <div className="flex-0 flex flex-col">
          {drawScramble && solveStatus !== "FINISHED" && (
            // <scramble-display
            //   className="w-full h-45"
            //   scramble={currScramble}
            //   event={ROOM_EVENT_JS_NAME_MAP.get(roomEvent) ?? null}
            // />
            <twisty-player
              experimental-setup-alg={currScramble}
              puzzle={ROOM_EVENTS_INFO[roomEvent].jsName ?? "3x3x3"}
              visualization="2D"
              control-panel="none"
              className="w-full h-45"
              background="none"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function UserRoomPanel({
  className,
  side,
  userId,
  isLocalUser,
}: UserRoomPanelProps) {
  const [users] = useRoomStore((s) => [s.users]);

  return (
    <div
      className={cn(["flex flex-col text-center h-full w-full p-2", className])}
    >
      <div className="flex flex-row w-full shrink-0 relative">
        <div className="grow">
          <p className="text-2xl font-bold">{users[userId]?.user.userName}</p>
        </div>
        {isLocalUser && (
          <div className="absolute top-0 right-0">
            <UserRoomSettingsDialog>
              <Button
                size="icon"
                className="self-end"
                variant="icon"
                onKeyDown={(e) => e.preventDefault()}
              >
                <Settings className="size-8" />
              </Button>
            </UserRoomSettingsDialog>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 min-h-0 justify-center">
        <UserCenterSection
          className={className}
          side={side}
          userId={userId}
          isLocalUser={isLocalUser}
        />
      </div>
      <div className="flex flex-row justify-end"></div>
    </div>
  );
}

function SummaryRoomPanel({ className }: SummaryRoomPanelProps) {
  const { user: localUser } = useSession();

  const [
    users,
    solves,
    roomName,
    roomEvent,
    roomState,
    userLiveTimerStartTimes,
    userLiveTimes,
    raceSettings,
    isUserHost,
  ] = useRoomStore((s) => [
    s.users,
    s.solves,
    s.roomName,
    s.roomEvent,
    s.roomState,
    s.userLiveTimerStartTimes,
    s.userLiveTimes,
    s.raceSettings,
    s.isUserHost,
  ]);

  const userSortKeyCallback = useCallback(
    (u1: IRoomUser, u2: IRoomUser) => {
      if (raceSettings.roomFormat === "CASUAL") {
        return u2.points - u1.points;
      }
      //TODO - if we ever expand to match formats that don't use this logic, will need to update here.
      const matchPtDiff = u2.setWins - u1.setWins;
      if (matchPtDiff != 0) {
        return matchPtDiff;
      } else {
        switch (raceSettings.setFormat) {
          case "BEST_OF":
            return u2.points - u1.points;
          case "FIRST_TO":
            return u2.points - u1.points;
          case "AVERAGE_OF":
            //sort by the LOWER average
            return -(u2.points - u1.points);
          case "MEAN_OF":
            //sort by the LOWER mean
            return -(u2.points - u1.points);
          case "FASTEST_OF":
            //sort by the LOWER single
            return -u2.points - u1.points;
        }
      }
    },
    [raceSettings]
  );

  const sortedActiveUsers = useMemo(() => {
    return Object.values(users)
      .filter((roomUser) => roomUser.active)
      .sort(userSortKeyCallback);
  }, [users, userSortKeyCallback]);

  function userStatusText(user: IRoomUser) {
    if (!user.competing) {
      return "SPECTATING";
    } else {
      if (user.solveStatus == "FINISHED" && user.currentResult) {
        return Result.fromIResult(user.currentResult).toString();
      } else if (
        user.solveStatus === "SOLVING" &&
        userLiveTimerStartTimes[user.user.id]
      ) {
        return (
          <UserLiveTimer startTime={userLiveTimerStartTimes[user.user.id]!} />
        );
      } else if (
        user.solveStatus === "SUBMITTING" &&
        userLiveTimes[user.user.id]
      ) {
        return (
          <p className="italic">
            {Result.timeToString(Math.floor(userLiveTimes[user.user.id]! / 10))}
          </p>
        );
      } else {
        return user.solveStatus;
      }
    }
  }

  return (
    <div
      className={cn(["flex flex-col text-center h-full w-full p-2", className])}
    >
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={50}>
          <div className="grid grid-cols-12">
            <div className="col-span-5">User</div>
            {roomState === "STARTED" && <div className="col-span-3">Time</div>}
            {raceSettings.roomFormat === "RACING" && (
              <div className="col-span-2">Sets</div>
            )}
            {raceSettings.roomFormat === "RACING" &&
              (raceSettings.setFormat === "BEST_OF" ||
                raceSettings.setFormat === "FIRST_TO") && (
                <div className="col-span-2">Solves</div>
              )}
            {raceSettings.roomFormat === "RACING" &&
              raceSettings.setFormat === "AVERAGE_OF" && (
                <div className="col-span-2">Avg</div>
              )}
            {raceSettings.roomFormat === "RACING" &&
              raceSettings.setFormat === "MEAN_OF" && (
                <div className="col-span-2">Mean</div>
              )}
            {raceSettings.roomFormat === "RACING" &&
              raceSettings.setFormat === "FASTEST_OF" && (
                <div className="col-span-2">Best</div>
              )}
          </div>
          <div className="flex flex-col overflow-y-auto">
            {sortedActiveUsers.map((user, index) => (
              <div key={index} className="grid grid-cols-12">
                <RoomUserDialog
                  user={user}
                  hostView={isUserHost(localUser?.userInfo.id)}
                >
                  <div className="col-span-5 hover:scale-105 hover:font-bold hover:underline">
                    {user.user.userName.length > 0
                      ? user.user.userName
                      : "BTime User"}
                  </div>
                </RoomUserDialog>
                {roomState === "STARTED" && (
                  <div className="col-span-3">{userStatusText(user)}</div>
                )}
                {raceSettings.roomFormat === "RACING" && (
                  <div className="col-span-2">{user.setWins}</div>
                )}
                {raceSettings.roomFormat === "RACING" &&
                  (raceSettings.setFormat === "AVERAGE_OF" ||
                    raceSettings.setFormat === "MEAN_OF" ||
                    raceSettings.setFormat === "FASTEST_OF") && (
                    <div className="col-span-2">
                      {Result.timeToString(user.points)}
                    </div>
                  )}
                {raceSettings.roomFormat === "RACING" &&
                  (raceSettings.setFormat === "BEST_OF" ||
                    raceSettings.setFormat === "FIRST_TO") && (
                    <div className="col-span-2">{user.points}</div>
                  )}
              </div>
            ))}
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50}>
          <GlobalTimeList
            roomName={roomName}
            users={Object.values(users)} //.filter((roomUser) => roomUser.active)}
            solves={solves}
            roomEvent={roomEvent}
            raceSettings={raceSettings}
            userId={localUser?.userInfo.id}
            className="max-h-[50vh] w-full"
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

function InfoRoomPanel({ className }: InfoRoomPanelProps) {
  const [roomName, roomEvent, raceSettings] = useRoomStore((s) => [
    s.roomName,
    s.roomEvent,
    s.raceSettings,
  ]);
  return (
    <div
      className={cn(["flex flex-col text-center h-full w-full p-2", className])}
    >
      <div>
        <h2 className={cn("text-2xl md-1")}>Room: {roomName}</h2>
      </div>
      <div className={cn("text-left")}>
        <h2 className="text-2xl">Event: {roomEvent}</h2>
      </div>
      <div className={cn("text-left")}>
        <h2 className="text-2xl">{getFormatText(raceSettings)}</h2>
      </div>
      <div className={cn("text-left mx-2")}>
        {getVerboseFormatText(raceSettings)}
      </div>
    </div>
  );
}

function ParticipantListRoomPanel({
  className,
}: ParticipantListRoomPanelProps) {
  const { user: localUser } = useSession();
  const [users, teams, roomState, roomWinners, teamSettings, isUserHost] =
    useRoomStore((s) => [
      s.users,
      s.teams,
      s.roomState,
      s.roomWinners,
      s.teamSettings,
      s.isUserHost,
    ]);
  const winnerNames = useMemo(() => {
    return teamSettings.teamsEnabled
      ? roomWinners.map((id) => teams[id]!.team.name)
      : roomWinners.map((id) => users[id]!.user.userName);
  }, [teamSettings, roomWinners]);

  return (
    <div
      className={cn(["flex flex-col text-center h-full w-full p-2", className])}
    >
      {roomState === "FINISHED" && (
        <div className="flex-1 text-center">
          <h2 className="text-xl font-bold">
            Winner{roomWinners.length > 1 ? "s" : ""}: {winnerNames.join(", ")}
          </h2>
        </div>
      )}
      {teamSettings.teamsEnabled ? (
        <>
          {/* Teams Enabled - users are either on a team or not on a team (allow backend to process this info) */}
          <div className="flex flex-col flex-1 align-center">
            <div className="flex flex-row justify-center items-center gap-2">
              <h2 className="text-xl font-bold">
                Teams{" "}
                {teamSettings.maxNumTeams
                  ? `(${Object.values(teams).length}/${
                      teamSettings.maxNumTeams
                    })`
                  : ""}
              </h2>
              {isUserHost(localUser?.userInfo.id) &&
                (!teamSettings.maxNumTeams ||
                  Object.values(teams).length < teamSettings.maxNumTeams) && (
                  <CreateTeamDialog>
                    <Button variant="primary" className="text-lg h-6">
                      +
                    </Button>
                  </CreateTeamDialog>
                )}
            </div>

            {Object.values(teams).map((team, idx) => {
              return (
                <React.Fragment key={idx}>
                  <div className="flex flex-row gap-2 justify-center items-center">
                    <RoomTeamDialog
                      team={team}
                    >
                      <div className="text-lg hover:scale-105 hover:font-bold hover:underline">
                        {team.team.name}{" "}
                        {teamSettings.maxTeamCapacity
                          ? `(${Object.values(team.team.members).length}/${
                              teamSettings.maxTeamCapacity
                            })`
                          : ""}
                      </div>
                    </RoomTeamDialog>

                    {
                      // allow user to join if not on another team AND team capacity is satisfied
                      localUser &&
                        !users[localUser.userInfo.id].currentTeam &&
                        (!teamSettings.maxTeamCapacity ||
                          Object.values(team.team.members).length <
                            teamSettings.maxTeamCapacity) && (
                          <JoinTeamButton teamId={team.team.id} />
                        )
                    }
                    {
                      // allow user to join if not on another team AND team capacity is satisfied
                      localUser &&
                        users[localUser.userInfo.id].currentTeam ===
                          team.team.id && (
                          <LeaveTeamButton teamId={team.team.id} />
                        )
                    }
                  </div>
                  {team.team.members.map((userId, uIdx) => {
                    return (
                      <p className="text-md" key={uIdx}>
                        {users[userId]?.user.userName}
                      </p>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
          <div className="flex flex-col flex-1 align-center">
            <h2 className="text-xl font-bold">Spectators</h2>
            {Object.values(users)
              .filter((roomUser) => !roomUser.competing)
              .map((roomUser, idx) => {
                return (
                  <p className="text-md" key={idx}>
                    {roomUser.user.userName}
                  </p>
                );
              })}
          </div>
        </>
      ) : (
        <>
          {/* Teams Disabled - users are either competing or spectating */}
          <div className="flex flex-col flex-1 align-center">
            <h2 className="text-xl font-bold">Competitors</h2>
            {Object.values(users)
              .filter((roomUser) => roomUser.competing)
              .map((roomUser, idx) => {
                return (
                  <p className="text-md" key={idx}>
                    {roomUser.user.userName}
                  </p>
                );
              })}
          </div>
          <div className="flex flex-col flex-1 align-center">
            <h2 className="text-xl font-bold">Spectators</h2>
            {Object.values(users)
              .filter((roomUser) => !roomUser.competing)
              .map((roomUser, idx) => {
                return (
                  <p className="text-md" key={idx}>
                    {roomUser.user.userName}
                  </p>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}

export default function RoomPanel({
  className = "",
  type = "user",
  side,
  userId,
  isLocalUser = false,
}: RoomPanelProps) {
  switch (type) {
    case "user":
      if (!userId) return null;

      return (
        <UserRoomPanel
          className={className}
          userId={userId!}
          side={side}
          isLocalUser={isLocalUser}
        />
      );
    case "summary":
      return <SummaryRoomPanel className={className} />;
    case "info":
      return <InfoRoomPanel className={className} />;
    case "participantlist":
      return <ParticipantListRoomPanel className={className} />;
    default:
      return null;
  }
}
