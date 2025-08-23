import Header from "@/components/common/header"
import HomeHeaderContent from "@/components/index/home-header-content";
import CreateRoomButton from "@/components/index/create-room-button";
import RoomListing from "@/components/index/room-listing";
import ProfileView from "@/components/index/profile-view";
// import DebugButton from "@/components/common/debug-button";

export default function Home() {
  return (
    <div className="flex-col">
      <Header>
        <HomeHeaderContent/>
      </Header>
      <div className="flex h-16 py-4 px-2 items-center justify-center">
          <CreateRoomButton/>
      </div>
      <div className="flex grow px-4 py-8">
        <div className="flex-2 flex-col px-2">
          <RoomListing />
        </div>
        <div className="flex-1 px-2">
          <ProfileView />
        </div>
        {/* <DebugButton/> */}
      </div>
    </div>
  );
}
