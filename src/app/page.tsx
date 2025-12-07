import { Header, HeaderTitle } from "@/components/common/header";
import CreateRoomButton from "@/components/index/create-room-button";
import RoomListing from "@/components/index/room-listing";
import ProfileView from "@/components/index/profile-view";
import { cn } from "@/lib/utils";
// import DebugButton from "@/components/common/debug-button";

export default function Home() {
  return (
    <div className="flex flex-col gap-4 h-full w-full">
      <Header>
        <HeaderTitle title="BTime" className="text-3xl my-3 min-w-0" />
      </Header>
      <div className="shrink px-2 items-center justify-center">
        <CreateRoomButton className="h-fit py-1 w-full" />
      </div>
      <div
        className={cn("py-2 px-4", "flex flex-1 flex-col gap-2 md:flex-row")}
      >
        <div className="basis-0 grow md:grow-[2] min-w-0 px-2">
          <RoomListing />
        </div>
        <div className="basis-0 md:grow min-w-0 px-2">
          <ProfileView />
        </div>
        {/* <DebugButton/> */}
      </div>
    </div>
  );
}
