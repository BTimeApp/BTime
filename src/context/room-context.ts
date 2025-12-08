import { createContext, useContext } from "react";
import { StoreApi, UseBoundStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { RoomStore } from "@/stores/room-store";

export const RoomStoreContext = createContext<UseBoundStore<
  StoreApi<RoomStore>
> | null>(null);

/**
 * Using a context:
 *   - allows components to piecewise access the room store.
 *   - prevents using the room store outside of a room (requires context to be used)
 *   - makes it easier to use the room store w/ useShallow
 */
export function useRoomStore<T>(selector: (state: RoomStore) => T): T {
  const useStore = useContext(RoomStoreContext);
  if (!useStore)
    throw new Error("useRoomStore must be used inside a Room Component");
  return useStore(useShallow(selector));
}
