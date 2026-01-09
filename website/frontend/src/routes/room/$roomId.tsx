import Room from "@/components/room/room";
import { RoomStoreContext } from "@/context/room-context";
import { createRoomStore } from "@/stores/room-store";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/room/$roomId")({
  component: RoomPage,
  beforeLoad: () => {
    const roomStore = createRoomStore();
    return {
      roomStore,
    };
  },
});

function RoomPage() {
  const { roomStore } = Route.useRouteContext();

  return (
    <RoomStoreContext value={roomStore}>
      <Room />
    </RoomStoreContext>
  );
}
