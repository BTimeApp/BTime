import Header from "@/components/common/header"
import HomeHeaderContent from "@/components/index/home-header-content";
import QuickJoinSection from "@/components/index/quick-join-section";
import JoinPrivateRoom from "@/components/index/join-private-room";

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
    </div>
    // TODO: add a room listing/about section (refer to canva)
  );
}
