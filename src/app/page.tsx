import Header from "@/components/common/header"
import HomeHeaderContent from "@/components/index/home-header-content";
import QuickJoinSection from "@/components/index/quick-join-section";
import JoinPrivateRoom from "@/components/index/join-private-room";
import RoomListing from "@/components/index/room-listing";
import BTimeGuide from "@/components/index/btime-guide";

export default function Home() {
  return (
    <div>
      <Header>
        <HomeHeaderContent/>
      </Header>
      <QuickJoinSection/>
      <div className="flex h-16 py-4 px-2 items-center justify-center">
        <JoinPrivateRoom onHomePage={true}></JoinPrivateRoom>
      </div>
      <div className="flex px-4 py-8">
        <div className="flex-2 px-2">
          <RoomListing />
        </div>
        <div className="flex-1 px-2">
          <BTimeGuide />
        </div>
      </div>
    </div>
    // TODO: add a room listing/about section (refer to canva)
  );
}
