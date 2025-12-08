"use client";
import { IUser } from "@/types/user";
import { createContext, useContext } from "react";

const SessionContext = createContext<IUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: IUser | null;
  children: React.ReactNode;
}) {
  return <SessionContext value={user}>{children}</SessionContext>;
}

export function useSession() {
  return useContext(SessionContext);
}
