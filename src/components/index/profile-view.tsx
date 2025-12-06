"use client";
import { useSession } from "@/context/session-context";
import Image from "next/image";
import LoginButton from "@/components/common/login-button";
import LogoutButton from "@/components/common/logout-button";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * This component serves as a card-like summary of a user profile.
 */
export default function ProfileView({ className }: { className?: string }) {
  const user = useSession();

  const username = user?.userInfo.userName ?? "Profile";
  const avatarURL = user?.userInfo.avatarURL ?? "/images/C_logo.png";

  return (
    <Card
      className={cn(
        "flex flex-col rounded-lg p-2 bg-container-1 gap-1",
        className
      )}
    >
      <CardHeader className="flex flex-row justify-center items-center">
        <Link
          href="/profile"
          className="flex font-semibold text-xl hover:font-bold hover:underline"
        >
          {username.length > 0 ? username : "BTime User"}
        </Link>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex flex-row justify-center items-center">
          <Image
            src={avatarURL}
            alt="/images/C_logo.png"
            width="120"
            height="120"
            className="rounded-[50%] shadow-lg"
          />
        </div>
      </CardContent>
      <CardFooter className="px-0">
        <div className="">
          {user ? (
            <LogoutButton className="px-1" size="sm" />
          ) : (
            <LoginButton className="px-1" size="sm" />
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
