import Header from "@/components/common/header";
import RoomHeaderContent from "@/components/room/room-header-content";


type RoomHeaderProps = {
  roomId: string;
  isStarted?: boolean; // optional
};

function RoomHeader({roomId, isStarted} : RoomHeaderProps) {
  if (!isStarted) {
    return (
      <Header>
        <RoomHeaderContent
          isStarted={isStarted}
        >
        </RoomHeaderContent>
      </Header>
    )
  }
};

export default async function Page({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  let roomId = '';

  await params.then((res) => {
    roomId = res.roomId;
  });

  return (
    <>
      <RoomHeader roomId={roomId} />
      <div className="flex">
        <div className="text-center grow">
          <h1>LeftPanel placeholder</h1>
        </div>
        <div className="text-center grow">
          <h1>RightPanel placeholder</h1>
          <span>{roomId}</span>
        </div>
      </div>
    </>
  );
};
