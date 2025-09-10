"use client";
import { useRoomStore } from "@/context/room-context";
import RoomPanel from "@/components/room/room-panel";
import { useSession } from "@/context/session-context";
import { ScreenSize, useScreenSize } from "@/hooks/use-screen-size";

export default function RoomContent() {
  const { user } = useSession();
  const [localRoomState] = useRoomStore((s) => [s.roomState]);
  const screenSize = useScreenSize();

  switch (localRoomState) {
    case "WAITING":
      return (
        <div className="flex-1 grow grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 w-full">
          <RoomPanel
            type="info"
            side={screenSize >= ScreenSize.MD ? "left" : undefined}
          />
          <RoomPanel
            type="userlist"
            side={screenSize >= ScreenSize.MD ? "right" : undefined}
          />
        </div>
      );
    case "STARTED":
      // const otherUsers = Object.values(users).filter(
      //   (roomUser) => roomUser.user.id !== user?.id
      // );

      return (
        <div className="flex-1 grow grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 w-full">
          <RoomPanel
            side={screenSize >= ScreenSize.MD ? "left" : undefined}
            type="user"
            userId={user ? user.userInfo.id : undefined}
            isLocalUser={true}
            className="bg-secondary"
          ></RoomPanel>

          {/* TODO: use carousel when things like virtualcube work */}
          {/* <Carousel className="h-full md:col-span-1">
            <CarouselContent className="h-full">
            <CarouselItem className="h-full">
                <RoomPanel
                    type="summary"
                    side={screenSize >= ScreenSize.MD ? "left" : undefined}
                    inCarousel={true}
                    className="bg-container-1"
                />
                </CarouselItem>
              {otherUsers.map((roomUser, idx) => (
                <CarouselItem key={idx} className="h-full">
                  <RoomPanel
                    type="user"
                    side={screenSize >= ScreenSize.MD ? "right" : undefined}
                    userId={roomUser.user.id}
                    inCarousel={true}
                    className="bg-container-1"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious
              variant="ghost"
              className="top-2 left-2 translate-y-0"
            />
            <CarouselNext
              variant="ghost"
              className="top-2 right-2 translate-y-0"
            />
          </Carousel> */}
          <RoomPanel
            type="summary"
            side={screenSize >= ScreenSize.MD ? "left" : undefined}
            inCarousel={true}
            className="bg-container-1"
          />
        </div>
      );
    case "FINISHED":
      return (
        <div className="flex-1 grow grid grid-rows-2 md:grid-rows-1 md:grid-cols-2 w-full">
          <RoomPanel
            type="summary"
            side={screenSize >= ScreenSize.MD ? "left" : undefined}
            className="bg-container-1"
          />
          <RoomPanel
            type="userlist"
            side={screenSize >= ScreenSize.MD ? "right" : undefined}
          />
        </div>
      );
    default:
      return null;
  }
}
