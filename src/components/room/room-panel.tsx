import { useRoomStore } from "@/context/room-context";
import { cn } from "@/lib/utils";
import React, { useCallback, useMemo } from "react";
import {
  getRaceFormatText,
  getTeamFormatText,
  getVerboseRaceFormatTextLines,
  getVerboseTeamFormatTextLines,
  ROOM_EVENTS_INFO,
} from "@/types/room";
import GlobalTimeList from "@/components/room/global-time-list";
import {
  IRoomParticipant,
  IRoomTeam,
  IRoomUser,
} from "@/types/room-participant";
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
} from "@/components/ui/resizable";
import CreateTeamDialog from "@/components/room/create-team-dialog";
import {
  JoinTeamButton,
  LeaveTeamButton,
} from "@/components/room/team-action-buttons";
import RoomTeamDialog from "@/components/room/room-team-dialog";

type RoomPanelProps = {
  className?: string;
  /**
   * Type of Room Panel we want to render.
   *   user - displays info about a user or the user's active panel for the room
   *   team - displays info about a team or the team's active panel for the room
   *   summary - displays summary info about the room. use for when the room is STARTED
   *   info - displays high-level info about the room. use for when the room is WAITING or FINISHED
   *   participantlist - displays info about participants in the room (competitors, spectators)
   */
  type?: "user" | "team" | "summary" | "info" | "participantlist";
  /**
   * whether this panel belongs on the left or right (in a web display). On small screens, might be top and bottom.
   */
  side?: "left" | "right";
  userId?: string; //if this is a user panel, userId map to the user
  teamId?: string; //if this is a team panel, teamId map to the team
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
};

type TeamRoomPanelProps = SubRoomPanelBaseProps & {
  teamId?: string; //team associated with this panel. This is optional because it's possible for local user to not have a team
};

type SummaryRoomPanelProps = SubRoomPanelBaseProps & {};

type InfoRoomPanelProps = SubRoomPanelBaseProps & {};

type ParticipantListRoomPanelProps = SubRoomPanelBaseProps & {};

function RoomPanelWrapper({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col text-center p-2 gap-2 overflow-y-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

function UserStatusSection({
  className,
  userId,
}: {
  className?: string;
  userId: string;
}) {
  const users = useRoomStore((s) => s.users);
  const userLiveTimes = useRoomStore((s) => s.userLiveTimes);
  const userLiveTimerStartTimes = useRoomStore(
    (s) => s.userLiveTimerStartTimes
  );

  const user = useMemo(() => {
    return users[userId];
  }, [users, userId]);

  if (!user) {
    return <></>;
  }

  if (!user.competing) {
    return <div className={className}>SPECTATING</div>;
  } else {
    if (user.solveStatus == "FINISHED" && user.currentResult) {
      return (
        <div className={className}>
          {Result.fromIResult(user.currentResult).toString()}
        </div>
      );
    } else if (
      user.solveStatus === "SOLVING" &&
      userLiveTimerStartTimes[user.user.id]
    ) {
      return (
        <UserLiveTimer
          className={className}
          startTime={userLiveTimerStartTimes[user.user.id]!}
        />
      );
    } else if (
      user.solveStatus === "SUBMITTING" &&
      userLiveTimes[user.user.id]
    ) {
      return (
        <div className={cn("italic", className)}>
          {Result.timeToString(Math.floor(userLiveTimes[user.user.id]! / 10))}
        </div>
      );
    } else {
      return <div className={className}>{user.solveStatus}</div>;
    }
  }
}

function TeamStatusSection({
  className,
  teamId,
}: {
  className?: string;
  teamId: string;
}) {
  const teams = useRoomStore((s) => s.teams);
  const team = useMemo(() => {
    return teams[teamId];
  }, [teams, teamId]);

  if (!team) {
    return <></>;
  }
  //TODO - augment this by showing the "so far" result for the team

  if (team.solveStatus == "FINISHED" && team.currentResult) {
    return (
      <div className={className}>
        {Result.fromIResult(team.currentResult).toString()}
      </div>
    );
  } else {
    return <div className={className}>{team.solveStatus}</div>;
  }
}

function UserCenterSection({
  className = "",
  userId,
  isLocalUser = false,
}: {
  className?: string;
  userId: string;
  isLocalUser: boolean;
}) {
  const [users, solveStatus, match, roomEvent, drawScramble] = useRoomStore(
    (s) => [s.users, s.localSolveStatus, s.match, s.roomEvent, s.drawScramble]
  );

  if (!users[userId]) {
    return null;
  }

  const currScramble =
    match.sets.at(-1)?.solves.at(-1)?.solve.attempts[userId]?.scramble ?? "";

  return (
    <div className={cn("flex flex-row", className)}>
      <div className="flex flex-col grow w-full h-full">
        <div className="flex-0 flex flex-col">
          {solveStatus !== "FINISHED" && (
            <div className="text-xl">{currScramble}</div>
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
              <p className="text-xl">
                You are spectating. Compete to use timer.
              </p>
            )
          ) : (
            <UserStatusSection className="text-4xl font-bold" userId={userId} />
          )}
        </div>
        <div className="flex-0 flex flex-col">
          {drawScramble &&
            solveStatus !== "FINISHED" &&
            users[userId].competing &&
            (currScramble ? (
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
                className="w-full h-40 md:h-48 xl:h-54 2xl:h-60"
                background="none"
              />
            ) : (
              <div>missing scramble...</div>
            ))}
        </div>
      </div>
    </div>
  );
}

function TeamCenterSection({
  className = "",
  teamId,
  isLocalTeam = false,
}: {
  className?: string;
  teamId?: string;
  isLocalTeam: boolean;
}) {
  const localUser = useSession();
  const users = useRoomStore((s) => s.users);
  const teams = useRoomStore((s) => s.teams);
  const match = useRoomStore((s) => s.match);
  const teamSettings = useRoomStore((s) => s.teamSettings);

  const allTeamUserIds = teamId
    ? Object.values(teams[teamId].team.members)
    : [];
  const teamUserIds = allTeamUserIds.filter(
    (roomUserId) => roomUserId != localUser?.userInfo.id
  );
  const currentSolve = match.sets.at(-1)?.solves.at(-1);

  if (!teamSettings.teamsEnabled) {
    return <></>;
  } else if (!teamId) {
    if (isLocalTeam) {
      //user is not on a team. show spectating message
      return (
        <div className={cn("flex flex-row", className)}>
          <div className="flex flex-col grow w-full">
            <div>You are spectating. Join a team to see team view.</div>
          </div>
        </div>
      );
    }

    // team doesn't exist. return nothing
    return <></>;
  } else if (!teams[teamId]) {
    // team doesn't exist
    return <></>;
  }

  switch (teamSettings.teamFormatSettings.teamSolveFormat) {
    case "ONE":
      const currentTurnUser = teams[teamId].currentMember;

      return (
        <div className={cn("flex flex-col w-full", className)}>
          {currentTurnUser && (
            <>
              <div className="flex-0 text-lg font-bold">
                {"Current Solver: " + users[currentTurnUser].user.userName}
              </div>
              <UserCenterSection
                userId={currentTurnUser}
                isLocalUser={currentTurnUser === localUser?.userInfo.id}
                className="flex-0"
              />
            </>
          )}
          <div className="flex-0 text-lg font-bold text-center">
            Team Members
          </div>
          <div className="flex-1 overflow-y-auto max-h-[25vh] text-center">
            {allTeamUserIds.map((teamUserId, idx) => {
              return (
                <div
                  key={idx}
                  className={currentTurnUser === teamUserId ? "font-bold" : ""}
                >
                  {users[teamUserId].user.userName}
                </div>
              );
            })}
          </div>
        </div>
      );

    case "ALL":
      return (
        <div className={cn("flex flex-col w-full", className)}>
          {isLocalTeam && localUser && (
            <>
              <div className="shrink-0 text-lg font-bold">
                {localUser.userInfo.userName}
              </div>
              <UserCenterSection
                userId={localUser.userInfo.id}
                isLocalUser={true}
                className="shrink-0"
              />
            </>
          )}
          <div className="flex-0 text-center text-lg font-bold">
            {isLocalTeam ? "Your Teammates" : "Team Members"}
          </div>
          <div className="flex-1 overflow-y-auto max-h-[25vh] text-center">
            {teamUserIds.map((teamUserId, idx) => {
              return (
                <div key={idx} className="grid grid-cols-4">
                  <div className="col-span-3">
                    {users[teamUserId].user.userName}
                  </div>
                  <div>
                    {currentSolve !== undefined && (
                      <UserStatusSection userId={teamUserId} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    default:
      return <></>;
  }
}

function UserRoomPanel({ className, userId }: UserRoomPanelProps) {
  const localUser = useSession();
  const users = useRoomStore((s) => s.users);

  const isLocalUser = useMemo(() => {
    return localUser?.userInfo.id === userId;
  }, [userId, localUser]);

  return (
    <RoomPanelWrapper className={className}>
      <div className="flex flex-row w-full relative">
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

      {/* <div className="flex flex-col flex-1"> */}
      <UserCenterSection
        className="flex-1"
        userId={userId}
        isLocalUser={isLocalUser}
      />
      {/* </div> */}
      <div className="flex flex-row justify-end"></div>
    </RoomPanelWrapper>
  );
}

function TeamRoomPanel({ className, teamId }: TeamRoomPanelProps) {
  const localUser = useSession();
  const users = useRoomStore((s) => s.users);
  const teams = useRoomStore((s) => s.teams);
  const teamSettings = useRoomStore((s) => s.teamSettings);

  // analogous to isLocalUser - is this team the one that belongs to the local user?
  const isLocalTeam = useMemo(() => {
    return (
      localUser !== null && users[localUser.userInfo.id]?.currentTeam === teamId
    );
  }, [teamId, localUser, users]);

  if (!teamSettings.teamsEnabled) {
    return null;
  }

  return (
    <RoomPanelWrapper className={className}>
      <div className="flex flex-row flex-0 w-full relative">
        {teamId && (
          <div className="absolute top-0 left-0">
            {isLocalTeam ? (
              <LeaveTeamButton teamId={teamId} />
            ) : (
              localUser &&
              users[localUser.userInfo.id]?.currentTeam === undefined && (
                <JoinTeamButton teamId={teamId} />
              )
            )}
          </div>
        )}
        <div className="grow">
          <p className="text-2xl font-bold">
            {teamId ? teams[teamId].team.name : ""}
          </p>
        </div>
        {isLocalTeam && (
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

      <TeamCenterSection
        className="flex-1"
        teamId={teamId}
        isLocalTeam={isLocalTeam}
      />
      <div className="flex flex-row justify-end"></div>
    </RoomPanelWrapper>
  );
}

function SummaryRoomPanel({ className }: SummaryRoomPanelProps) {
  const localUser = useSession();

  const users = useRoomStore((s) => s.users);
  const teams = useRoomStore((s) => s.teams);
  const roomState = useRoomStore((s) => s.roomState);
  const raceSettings = useRoomStore((s) => s.raceSettings);
  const teamSettings = useRoomStore((s) => s.teamSettings);
  const isUserHost = useRoomStore((s) => s.isUserHost);

  const participantSortKeyCallback = useCallback(
    (u1: IRoomParticipant, u2: IRoomParticipant) => {
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

  const activeParticipants = teamSettings.teamsEnabled
    ? teams
    : (Object.fromEntries(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        Object.entries(users).filter(([_uid, user]) => user.active)
      ) as Record<string, IRoomUser>);

  const sortedActiveParticipants = useMemo(() => {
    return Object.values(activeParticipants).sort(participantSortKeyCallback);
  }, [activeParticipants, participantSortKeyCallback]);

  return (
    <RoomPanelWrapper className={className}>
      <ResizablePanelGroup direction="vertical">
        <ResizablePanel defaultSize={50}>
          <div className="grid grid-cols-12">
            <div className="col-span-5">
              {teamSettings.teamsEnabled ? "Team" : "User"}
            </div>
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
            {sortedActiveParticipants.map(
              (participant: IRoomParticipant, index) => (
                <div key={index} className="grid grid-cols-12">
                  {teamSettings.teamsEnabled ? (
                    <RoomTeamDialog team={participant as IRoomTeam}>
                      <div className="col-span-5 hover:scale-105 hover:font-bold hover:underline">
                        {(participant as IRoomTeam).team.name || "BTime Team"}
                      </div>
                    </RoomTeamDialog>
                  ) : (
                    <RoomUserDialog
                      user={participant as IRoomUser}
                      hostView={isUserHost(localUser?.userInfo.id)}
                    >
                      <div className="col-span-5 hover:scale-105 hover:font-bold hover:underline">
                        {(participant as IRoomUser).user.userName ||
                          "BTime User"}
                      </div>
                    </RoomUserDialog>
                  )}

                  {roomState === "STARTED" &&
                    (teamSettings.teamsEnabled ? (
                      <TeamStatusSection
                        className="col-span-3"
                        teamId={(participant as IRoomTeam).team.id}
                      />
                    ) : (
                      <UserStatusSection
                        className="col-span-3"
                        userId={(participant as IRoomUser).user.id}
                      />
                    ))}
                  {raceSettings.roomFormat === "RACING" && (
                    <div className="col-span-2">{participant.setWins}</div>
                  )}
                  {raceSettings.roomFormat === "RACING" &&
                    (raceSettings.setFormat === "AVERAGE_OF" ||
                      raceSettings.setFormat === "MEAN_OF" ||
                      raceSettings.setFormat === "FASTEST_OF") && (
                      <div className="col-span-2">
                        {Result.timeToString(participant.points)}
                      </div>
                    )}
                  {raceSettings.roomFormat === "RACING" &&
                    (raceSettings.setFormat === "BEST_OF" ||
                      raceSettings.setFormat === "FIRST_TO") && (
                      <div className="col-span-2">{participant.points}</div>
                    )}
                </div>
              )
            )}
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50}>
          <GlobalTimeList className="min-h-50 max-h-full w-full bg-container-1" />
        </ResizablePanel>
      </ResizablePanelGroup>
    </RoomPanelWrapper>
  );
}

function InfoRoomPanel({ className }: InfoRoomPanelProps) {
  const [roomName, roomEvent, raceSettings, teamSettings] = useRoomStore(
    (s) => [s.roomName, s.roomEvent, s.raceSettings, s.teamSettings]
  );

  const verboseRaceFormatTextLines =
    getVerboseRaceFormatTextLines(raceSettings);
  const verboseTeamFormatTextLines =
    getVerboseTeamFormatTextLines(teamSettings);

  return (
    <RoomPanelWrapper className={className}>
      <div>
        <h2 className="text-2xl md-1 break-all">Room: {roomName}</h2>
      </div>
      <div className="text-left">
        <h2 className="text-2xl">Event: {roomEvent}</h2>
      </div>
      <div className="text-left">
        <h2 className="text-2xl">{getRaceFormatText(raceSettings)}</h2>
      </div>
      <div className="text-left pl-4">
        {verboseRaceFormatTextLines.map((line, idx) => (
          <p key={idx}>{line}</p>
        ))}
      </div>
      {teamSettings.teamsEnabled && (
        <>
          <div className="text-left">
            <h2 className="text-2xl">{getTeamFormatText(teamSettings)}</h2>
          </div>
          <div className="text-left pl-4">
            {verboseTeamFormatTextLines.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </>
      )}
    </RoomPanelWrapper>
  );
}

function ParticipantListRoomPanel({
  className,
}: ParticipantListRoomPanelProps) {
  const localUser = useSession();
  const users = useRoomStore((s) => s.users);
  const teams = useRoomStore((s) => s.teams);
  const roomState = useRoomStore((s) => s.roomState);
  const match = useRoomStore((s) => s.match);
  const teamSettings = useRoomStore((s) => s.teamSettings);
  const isUserHost = useRoomStore((s) => s.isUserHost);

  const winnerNames = useMemo(() => {
    return teamSettings.teamsEnabled
      ? match.winners.map((id) => teams[id]!.team.name)
      : match.winners.map((id) => users[id]!.user.userName);
  }, [teamSettings, match, teams, users]);

  return (
    <RoomPanelWrapper className={className}>
      {roomState === "FINISHED" && (
        <div className="flex-1 text-center">
          <h2 className="text-xl font-bold">
            Winner{winnerNames.length > 1 ? "s" : ""}: {winnerNames.join(", ")}
          </h2>
        </div>
      )}
      {teamSettings.teamsEnabled ? (
        <>
          {/* Teams Enabled - users are either on a team or not on a team (allow backend to process this info) */}
          <div className="flex flex-col flex-1 align-center">
            <div className="flex-0 flex flex-row justify-center items-center gap-2">
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

            <div className="flex-1 max-h-[40vh] overflow-y-auto">
              {Object.values(teams).map((team, idx) => {
                return (
                  <React.Fragment key={idx}>
                    <div className="flex flex-row gap-2 justify-center items-center">
                      <RoomTeamDialog team={team}>
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
          </div>
          <div className="flex-1 flex flex-col align-center">
            <h2 className="flex-0 text-xl font-bold">Spectators</h2>
            <div className="flex-1 max-h-[40vh] overflow-y-auto">
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
          </div>
        </>
      ) : (
        <>
          {/* Teams Disabled - users are either competing or spectating */}
          <div className="flex flex-col flex-1 align-center">
            <h2 className="flex-0 text-xl font-bold">Competitors</h2>
            <div className="flex-1 max-h-[40vh] overflow-y-auto">
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
          </div>
          <div className="flex-1 flex flex-col align-center">
            <h2 className="flex-0 text-xl font-bold">Spectators</h2>
            <div className="flex-1 max-h-[40vh] overflow-y-auto">
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
          </div>
        </>
      )}
    </RoomPanelWrapper>
  );
}

export default function RoomPanel({
  className = "",
  type = "user",
  side,
  userId,
  teamId,
}: RoomPanelProps) {
  switch (type) {
    case "user":
      if (!userId) return null;

      return (
        <UserRoomPanel className={className} userId={userId!} side={side} />
      );
    case "team":
      return (
        <TeamRoomPanel className={className} teamId={teamId} side={side} />
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
