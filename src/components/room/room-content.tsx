"use client";
import { useRoomStore } from "@/context/room-context";
import RoomPanel from "@/components/room/room-panel";
import { useSession } from "@/context/session-context";
import { ScreenSize, useScreenSize } from "@/hooks/use-screen-size";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function RoomContent() {
  const user = useSession();
  const [users, teams, teamSettings, localRoomState] = useRoomStore((s) => [
    s.users,
    s.teams,
    s.teamSettings,
    s.roomState,
  ]);
  const otherActiveUserIds = useMemo(() => {
    return Object.values(users)
      .filter(
        (roomUser) => roomUser.user.id !== user?.userInfo.id && roomUser.active
      )
      .map((roomUser) => roomUser.user.id);
  }, [users, user]);
  const screenSize = useScreenSize();

  const userIdToName = useCallback(
    (id: string) => {
      return users[id]?.user.userName ?? "View User";
    },
    [users]
  );

  const teamIdToName = useCallback(
    (id: string) => {
      return teams[id]?.team.name ?? "View Team";
    },
    [teams]
  );

  switch (localRoomState) {
    case "WAITING":
      return (
        <div className="flex-1 min-h-0">
          <div className="grow grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 w-full h-full">
            <RoomPanel
              type="info"
              side={screenSize >= ScreenSize.MD ? "left" : undefined}
            />
            <RoomPanel
              type="participantlist"
              side={screenSize >= ScreenSize.MD ? "right" : undefined}
            />
          </div>
        </div>
      );
    case "STARTED":
      if (teamSettings.teamsEnabled) {
        //teams - return team room panels
        const localTeamId =
          user && users[user?.userInfo.id]?.currentTeam
            ? users[user?.userInfo.id]?.currentTeam
            : undefined;
        const otherTeamIds = Object.values(teams)
          .map((team) => team.team.id)
          .filter((teamId) => teamId != localTeamId);

        return (
          <div className="flex-1 min-h-0">
            <div className="grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 w-full h-full">
              <RoomPanel
                side={screenSize >= ScreenSize.MD ? "left" : undefined}
                type={teamSettings.teamsEnabled ? "team" : "user"}
                {...(teamSettings.teamsEnabled
                  ? { teamId: localTeamId }
                  : { userId: user?.userInfo.id })}
                className={localTeamId ? "bg-secondary" : "bg-container-2"}
              />
              <ParticipantRoomPanelCarousel
                type="team"
                participantIds={otherTeamIds}
                idToName={teamIdToName}
              />
            </div>
          </div>
        );
      } else {
        // no teams - return user room panels
        return (
          <div className="flex-1 min-h-0">
            <div className="grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 w-full h-full">
              <RoomPanel
                side={screenSize >= ScreenSize.MD ? "left" : undefined}
                type="user"
                userId={user ? user.userInfo.id : undefined}
                className="bg-secondary"
              />
              <ParticipantRoomPanelCarousel
                type="user"
                participantIds={otherActiveUserIds}
                idToName={userIdToName}
              />
            </div>
          </div>
        );
      }
    case "FINISHED":
      return (
        <div className="flex-1 min-h-0">
          <div className="grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 w-full h-full">
            <RoomPanel
              type="summary"
              side={screenSize >= ScreenSize.MD ? "left" : undefined}
              className="bg-container-1"
            />
            <RoomPanel
              type="participantlist"
              side={screenSize >= ScreenSize.MD ? "right" : undefined}
            />
          </div>
        </div>
      );
    default:
      return null;
  }
}

function clipStringWithEllipsis(str: string, maxLength: number) {
  if (str.length > maxLength) {
    // Subtract 3 from maxLength to account for the "..."
    return str.slice(0, maxLength - 3) + "...";
  }
  return str;
}

function ParticipantRoomPanelCarousel({
  type,
  participantIds,
  idToName,
}: {
  type: "user" | "team";
  participantIds: string[];
  idToName: (id: string) => string;
}) {
  const screenSize = useScreenSize();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const carouselTooltipTexts = [
    "Summary",
    ...participantIds.map((pid) => idToName(pid)),
  ];

  useEffect(() => {
    if (!api) return;

    const updateCurrent = () => {
      setCurrent(api.selectedScrollSnap());
    };
    api.on("select", updateCurrent);
    api.on("reInit", updateCurrent);
    api.on("slidesChanged", updateCurrent);

    // Initialize
    updateCurrent();

    return () => {
      api.off("select", updateCurrent);
      api.off("reInit", updateCurrent);
      api.off("slidesChanged", updateCurrent);
    };
  }, [api]);
  return (
    <Carousel className="h-full md:col-span-1" setApi={setApi}>
      <CarouselContent className="h-full">
        <CarouselItem className="h-full">
          <RoomPanel
            type="summary"
            side={screenSize >= ScreenSize.MD ? "left" : undefined}
            inCarousel={true}
            className="bg-container-1"
          />
        </CarouselItem>
        {participantIds.map((pid, idx) => (
          <CarouselItem key={idx} className="h-full">
            {type === "team" && (
              <RoomPanel
                type="team"
                side={screenSize >= ScreenSize.MD ? "right" : undefined}
                teamId={pid}
                inCarousel={true}
                className="bg-container-1"
              />
            )}
            {type === "user" && (
              <RoomPanel
                type="user"
                side={screenSize >= ScreenSize.MD ? "right" : undefined}
                userId={pid}
                inCarousel={true}
                className="bg-container-1"
              />
            )}
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="absolute top-1/2 -translate-y-1 left-2 z-49 flex flex-col items-start">
        <p className="translate-y-1 text-sm text-center w-full">
          {current > 0
            ? clipStringWithEllipsis(carouselTooltipTexts[current - 1], 12)
            : ""}
        </p>
        <CarouselPrevious
          variant="ghost"
          size="lg"
          className="size-10 top-0 left-0 translate-y-0"
        />
      </div>
      <div className="absolute top-1/2 -translate-y-1 right-2 z-49 flex flex-col items-end">
        <p className="translate-y-1 text-sm text-center w-full">
          {current < carouselTooltipTexts.length - 1
            ? clipStringWithEllipsis(carouselTooltipTexts[current + 1], 12)
            : ""}
        </p>
        <CarouselNext
          variant="ghost"
          size="icon"
          className="size-10 top-0 right-0 translate-y-0 justify-self-end"
        />
      </div>
    </Carousel>
  );
}
