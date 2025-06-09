import { useEffect, useState } from "react";
import { IUser } from "@/types/user";

export function useSession() {
  const [localUser, setLocalUser] = useState<IUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v0/me", { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data: IUser) => {
        setLocalUser(data);
        setSessionLoading(false);
      })
      .catch(() => {
        console.log("Session hook could not retrieve user data.");
        setLocalUser(null);
        setSessionLoading(false);
      });
  }, []);

  return { localUser, sessionLoading };
}
