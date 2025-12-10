import { createContext, useContext } from "react";
import { useShallow } from "zustand/react/shallow";
import type {
  RoomStore,
  RoomStoreActions,
  RoomStoreUse,
} from "@/stores/room-store";

export const RoomStoreContext = createContext<RoomStoreUse | null>(null);

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

/**
 * Dynamically select the keys from room store that are functions and returns in a stable object.
 * The functions in the room store never change after instantiation, so this pattern should cause 0 extra re-renders.
 * The preferred way to access room state is to individually call useRoomStore with a single field in the selector.
 */
export function useRoomActions(): RoomStoreActions {
  return useRoomStore((state) => {
    const actions = {} as RoomStoreActions;

    for (const key in state) {
      const value = state[key as keyof RoomStore];
      if (typeof value === "function") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (actions as any)[key] = value;
      }
    }

    return actions;
  });
}
