import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/room/$roomId")({
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();

  return (
    <div style={{ padding: "1rem" }}>
      <h1>Hello room {roomId}!</h1>
    </div>
  );
}
