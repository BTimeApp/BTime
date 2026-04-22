import type { IUser } from "@btime/types";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthState = {
  user: IUser | null;
  hydrated: boolean;
  setUser: (user: IUser | null) => void;
};

export const AuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      hydrated: false,
      setUser: (user) => set({ user, hydrated: true }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
