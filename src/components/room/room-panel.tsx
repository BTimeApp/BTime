import { useRoomStore } from "@/context/room-context";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";
import {
  getFormatText,
  getVerboseFormatText,
  ROOM_EVENT_JS_NAME_MAP,
} from "@/types/room";
import GlobalTimeList from "@/components/room/global-time-list";
import { IRoomUser } from "@/types/room-user";
import { Result } from "@/types/result";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import TimerSection from "@/components/room/timer-section";
import RoomSubmittingButtons from "@/components/room/room-submitting-buttons";
import UserRoomSettingsDialog from "@/components/room/user-room-settings-dialog";
import UserLiveTimer from "@/components/room/user-live-timer";

type RoomPanelProps = {
  className?: string;
  /**
   * Type of Room Panel we want to render.
   *   user - displays info about a user or the user's active panel for the room
   *   summary - displays summary info about the room. use for when the room is STARTED
   *   info - displays high-level info about the room. use for when the room is WAITING or FINISHED
   *   userlist - displays info about users in the room (competitors, spectators)
   */
  type?: "user" | "summary" | "info" | "userlist";
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

type UserListRoomPanelProps = SubRoomPanelBaseProps & {};

// TODO: buggy - exceeds height limits and causes room to scroll
// function UserTimeList({
//   userId,
//   className = "",
// }: {
//   userId: string;
//   className?: string;
// }) {
//   const [solves, currentSet] = useRoomStore((s) => [s.solves, s.currentSet]);

//   return (
//     <div className={cn("flex flex-col", className)}>
//       <p>Times</p>
//       <div className="flex-1 min-h-0">
//         {solves //all solves
//           .filter((userResult) => userResult.setIndex == currentSet) //from current set
//           .map((solve) => solve.solve.results[userId]) //get result belonging to local user
//           .slice(0, -1) //exclude current solve
//           .reverse()
//           .map((userResult, index) =>
//             userResult === undefined ? (
//               <p key={index}>---</p>
//             ) : (
//               <p key={index}>{Result.fromIResult(userResult).toString()}</p>
//             )
//           )}
//       </div>
//     </div>
//   );
// }

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
      <p>{users[userId].userStatus}</p>
    </div>
  );
}

function UserCenterSection({
  className = "",
  // side,
  userId,
  isLocalUser = false,
}: UserRoomPanelProps) {
  const [users, solveStatus, solves, roomEvent, drawScramble] = useRoomStore(
    (s) => [s.users, s.localSolveStatus, s.solves, s.roomEvent, s.drawScramble]
  );

  if (!users[userId]) {
    return null;
  }

  const currScramble = solves.length > 0 ? solves.at(-1)?.solve.scramble : "";
  return (
    <div className={cn("flex flex-row w-full h-full", className)}>
      {/* TODO: figure out why the time lists cause the screen to get longer */}
      {/* {side === "right" && (
          <UserTimeList userId={userId} className="max-h-[50%]" />
        )} */}
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
              puzzle={ROOM_EVENT_JS_NAME_MAP.get(roomEvent) ?? "3x3x3"}
              visualization="2D"
              control-panel="none"
              className="w-full h-45"
              background="none"
            />
          )}
        </div>
      </div>
      {/* {side === "left" && (
          <UserTimeList userId={userId} className="max-h-[50%]" />
        )} */}
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
  const [
    users,
    solves,
    roomEvent,
    roomFormat,
    roomState,
    userLiveTimerStartTimes,
    userLiveTimes,
  ] = useRoomStore((s) => [
    s.users,
    s.solves,
    s.roomEvent,
    s.roomFormat,
    s.roomState,
    s.userLiveTimerStartTimes,
    s.userLiveTimes,
  ]);
  const [sortedActiveUsers, setSortedActiveUsers] = useState<IRoomUser[]>(
    Object.values(users).filter((roomUser) => roomUser.active)
  );

  function userStatusText(user: IRoomUser) {
    if (!user.competing) {
      return "SPECTATING";
    } else {
      if (user.userStatus == "FINISHED" && user.currentResult) {
        return Result.fromIResult(user.currentResult).toString();
      } else if (
        user.userStatus === "SOLVING" &&
        userLiveTimerStartTimes.get(user.user.id)
      ) {
        return (
          <UserLiveTimer
            startTime={userLiveTimerStartTimes.get(user.user.id)!}
          />
        );
      } else if (
        user.userStatus === "SUBMITTING" &&
        userLiveTimes.get(user.user.id)
      ) {
        return (
          <p className="italic">
            {Result.timeToString(
              Math.floor(userLiveTimes.get(user.user.id)! / 10)
            )}
          </p>
        );
      } else {
        return user.userStatus;
      }
    }
  }

  useEffect(() => {
    setSortedActiveUsers(
      Object.values(users)
        .filter((roomUser) => roomUser.active)
        .sort((u1, u2) => {
          if (u2.setWins !== u1.setWins) {
            return u2.setWins - u1.setWins;
          } else {
            return u2.points - u1.points;
          }
        })
    );
  }, [users]);

  return (
    <div
      className={cn(["flex flex-col text-center h-full w-full p-2", className])}
    >
      <div className="flex flex-col basis-[50%] max-h-[50%]">
        <div className="grid grid-cols-12">
          <div className="col-span-5">User</div>
          {roomState === "STARTED" && <div className="col-span-3">Time</div>}
          {roomFormat === "RACING" && <div className="col-span-2">Sets</div>}
          <div className="col-span-2">Solves</div>
        </div>
        <div className="flex flex-col overflow-y-auto">
          {sortedActiveUsers.map((user, index) => (
            <div key={index} className="grid grid-cols-12">
              <div className="col-span-5">{user.user.userName}</div>
              {roomState === "STARTED" && (
                <div className="col-span-3">{userStatusText(user)}</div>
              )}
              {roomFormat === "RACING" && (
                <div className="col-span-2">{user.setWins}</div>
              )}
              <div className="col-span-2">{user.points}</div>
            </div>
          ))}
        </div>
      </div>
      <GlobalTimeList
        users={Object.values(users).filter((roomUser) => roomUser.active)}
        solves={solves}
        roomEvent={roomEvent}
        roomFormat={roomFormat}
        className="max-h-[50vh] w-full"
      />
    </div>
  );
}

function InfoRoomPanel({ className }: InfoRoomPanelProps) {
  const [
    roomName,
    roomEvent,
    roomFormat,
    matchFormat,
    setFormat,
    nSets,
    nSolves,
  ] = useRoomStore((s) => [
    s.roomName,
    s.roomEvent,
    s.roomFormat,
    s.matchFormat,
    s.setFormat,
    s.nSets,
    s.nSolves,
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
        <h2 className="text-2xl">
          {getFormatText(roomFormat, matchFormat, setFormat, nSets, nSolves)}
        </h2>
      </div>
      <div className={cn("text-left mx-2")}>
        {getVerboseFormatText(
          roomFormat,
          matchFormat,
          setFormat,
          nSets,
          nSolves
        )}
      </div>
    </div>
  );
}

function UserListRoomPanel({ className }: UserListRoomPanelProps) {
  const [users, roomState, roomWinners] = useRoomStore((s) => [
    s.users,
    s.roomState,
    s.roomWinners,
  ]);
  return (
    <div
      className={cn(["flex flex-col text-center h-full w-full p-2", className])}
    >
      {roomState === "FINISHED" && (
        <div className="flex-1 text-center">
          <h2 className="text-xl font-bold">
            Winner{roomWinners.length > 1 ? "s" : ""}: {roomWinners.join(", ")}
          </h2>
        </div>
      )}
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
    case "userlist":
      return <UserListRoomPanel className={className} />;
    default:
      return null;
  }
}
