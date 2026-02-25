import type { KeybindMap } from "@/types/keybind";

import { DEFAULT_VIRTUAL_KEYBINDS } from "@/lib/virtual-keybinds";
import { createStore, useStore } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { useShallow } from "zustand/react/shallow";

export interface KeybindStore {
  keybindMap: KeybindMap<string>;

  // selectors / helpers
  getMoveForKey: (key: string) => string | null;
  getKeyCodeForKey: (key: string) => string | null;

  // mutations
  setKeybind: (key: string, keyCode: string, move: string) => void;
  resetKeybinds: () => void;
}

const KeybindStore = createStore<KeybindStore>()(
  persist(
    immer((set, get) => ({
      keybindMap: DEFAULT_VIRTUAL_KEYBINDS,

      getMoveForKey: (key: string) => {
        return get().keybindMap.get(key)?.keyBind ?? "";
      },

      getKeyCodeForKey: (key: string) => {
        return get().keybindMap.get(key)?.keyCode ?? "";
      },

      setKeybind: (key: string, keyCode: string, move: string) => {
        set((state) => {
          state.keybindMap.set(key, { keyCode: keyCode, keyBind: move });
        });
      },

      resetKeybinds: () => {
        set((state) => {
          state.keybindMap = DEFAULT_VIRTUAL_KEYBINDS;
        });
      },
    })),
    {
      name: "btime-keybinds",
      version: 0,
      partialize: (state) => ({
        keybinds: state.keybindMap,
      }),
    }
  )
);

// hook for piecewise access + free useShallow
export function useKeybindStore<T>(selector: (state: KeybindStore) => T): T {
  return useStore(KeybindStore, useShallow(selector));
}
