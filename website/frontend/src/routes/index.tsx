import BTimeVersionNumber from "@/components/common/btime-version";
import { Footer } from "@/components/common/footer";
import { Header, HeaderTitle } from "@/components/common/header";
import PageWrapper from "@/components/common/page-wrapper";
import CreateRoomButton from "@/components/index/create-room-button";
import ProfileView from "@/components/index/profile-view";
import RoomListing from "@/components/index/room-listing";
import RoomListingLoading from "@/components/index/room-listing-loading";
import { fetchRooms } from "@/lib/fetch-rooms";
import { cn } from "@/lib/utils";
import { createFileRoute, defer } from "@tanstack/react-router";
import { Suspense } from "react";

export const Route = createFileRoute("/")({
  loader: () => {
    return {
      roomsData: defer(fetchRooms(1)),
    }; // no await — returns immediately
  },
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <PageWrapper className="gap-4 w-full">
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
          <Suspense fallback={<RoomListingLoading />}>
            <RoomListing />
          </Suspense>
        </div>
        <div className="basis-0 md:grow min-w-0 px-2">
          <ProfileView />
        </div>
        {/* <DebugButton/> */}
      </div>
      <Footer>
        <div className="ml-auto text-md">
          <BTimeVersionNumber />
        </div>
      </Footer>
    </PageWrapper>
  );
}
