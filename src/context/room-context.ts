import { createContext, useContext } from "react";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { RoomStore } from "@/components/room/room-store";

export const RoomStoreContext = createContext<StoreApi<RoomStore> | null>(null);

export function useRoomStore<T>(selector: (state: RoomStore) => T): T {
  const store = useContext(RoomStoreContext);
  if (!store) throw new Error("useRoomStore must be used inside a Room Component");
  return useStore(store, useShallow(selector))
}
