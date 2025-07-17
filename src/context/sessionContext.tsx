"use client";
// context/SessionContext.tsx
import { IUser } from "@/types/user";
import { createContext, useContext, useEffect, useState } from "react";

const SessionContext = createContext<{
  user: IUser | undefined;
  loading: boolean;
  refresh: () => void;
}>({
  user: undefined,
  loading: true,
  refresh: () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<IUser | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    fetch("/api/v0/me", { method: "GET", credentials: "include" })
      .then((res) => (res.ok ? res.json() : undefined))
      .then((data) => {
        setUser(data);
      })
      .catch(() => {
        console.log("Session hook could not retrieve user data.");
        setUser(undefined);
      })
      .finally(() => {
        setLoading(false);
      });

    //   if (res.ok) {
    //     const data = await res.json();
    //     setUser(data.user);
    //   } else {
    //     setUser(undefined);
    //   }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return (
    <SessionContext.Provider value={{ user, loading, refresh: fetchUser }}>
      {children}
    </SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
