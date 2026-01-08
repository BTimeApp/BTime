import type { IUser } from "@btime/types";

import { create } from "zustand";

export type AuthState = {
  user: IUser | null;
  hydrated: boolean;
  setUser: (user: IUser | null) => void;
};

export const AuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user, hydrated: true }),
}));
