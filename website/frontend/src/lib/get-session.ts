import type { IUser } from "@btime/types";

export async function getSession(): Promise<IUser | null> {
  // Browser-only: cookies are automatically included when credentials: "include" is set
  // const baseUrl = window.location.origin;

  const res = await fetch(`/api/v0/me`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) return null;
  return (await res.json()) as IUser;
}
