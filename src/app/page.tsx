import Header from "@/components/common/header"
import HomeHeaderContent from "@/components/index/home-header-content";
import QuickJoinSection from "@/components/index/quick-join-section";

export default function Home() {
  return (
    <div>
      <Header>
        <HomeHeaderContent/>
      </Header>
      <QuickJoinSection/>
    </div>
    // TODO: add a room listing/about section (refer to canva)
  );
}
