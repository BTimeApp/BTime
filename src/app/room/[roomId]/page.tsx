"use client";

import { useRef } from "react";
import { RoomStoreContext } from "@/context/room-context";
import { createRoomStore } from "@/stores/room-store";
import Room from "@/components/room/room";

export default function Page() {
  // creates a scoped store in Zustand (just for this instance of room)
  const storeRef = useRef(createRoomStore());

  return (
    <RoomStoreContext value={storeRef.current}>
      <Room />
    </RoomStoreContext>
  );
}
