import { IUser } from "@/types/user";
import { cookies, headers } from "next/headers";

export async function getSession(): Promise<IUser | null> {
  const cookieStr = (await cookies()).toString();

  const host = (await headers()).get("host");
  if (!host) return null;

  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  const res = await fetch(`${baseUrl}/api/v0/me`, {
    headers: {
      Cookie: cookieStr,
    },
    cache: "no-store",
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) return null;
  return (await res.json()) as IUser;
}
