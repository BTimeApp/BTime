"use client";
import CreateRoomHeader from "@/components/create/create-header-content";
import Header from "@/components/common/header";
import RoomSettingsForm from "@/components/room/room-settings-form";

export default function Page() {
  return (
    <div className="flex flex-col h-screen">
      <Header>
        <CreateRoomHeader />
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
            window.location.href = `/room/${roomId}`;
          }} //send user to the room they just made
        />
      </div>
    </div>
  );
}
