"use client";
import { Header, HeaderTitle } from "@/components/common/header";
import PageWrapper from "@/components/common/page-wrapper";
import RoomSettingsForm from "@/components/room/room-settings-form";
import { useRouter } from "next/navigation";

export default function Page() {
  const router = useRouter();
  return (
    <PageWrapper>
      <Header>
        <HeaderTitle title="Create Room" />
      </Header>
      <div className="px-1 md:px-4 y-1 md:py-3">
        <RoomSettingsForm
          roomName={""}
          roomEvent={"333"}
          access={{ visibility: "PUBLIC" }}
          raceSettings={{
            roomFormat: "RACING",
            matchFormat: "BEST_OF",
            setFormat: "BEST_OF",
            nSets: 3,
            nSolves: 7,
          }}
          teamSettings={{
            teamsEnabled: false,
          }}
          createNewRoom={true}
          onCreateCallback={(roomId: string) => {
            router.push(`/room/${roomId}`);
          }}
        />
      </div>
    </PageWrapper>
  );
}
