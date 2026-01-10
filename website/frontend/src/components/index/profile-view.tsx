"use client";

import LoadingSpinner from "../common/loading-spinner";
import LoginButton from "@/components/common/login-button";
import LogoutButton from "@/components/common/logout-button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AuthStore } from "@/stores/auth-store";
import { Link } from "@tanstack/react-router";
import { Image } from "@unpic/react";

/**
 * This component serves as a card-like summary of a user profile.
 */
export default function ProfileView({ className }: { className?: string }) {
  const user = AuthStore((s) => s.user);
  const hydrated = AuthStore((s) => s.hydrated);

  const username = user?.userInfo.userName ?? "Profile";
  const avatarURL = user?.userInfo.avatarURL ?? "/C_logo.png";

  return (
    <Card
      className={cn(
        "flex flex-col rounded-lg p-2 bg-container-1 gap-1",
        className
      )}
    >
      <CardHeader className="flex flex-row justify-center items-center">
        <Link
          to="/profile"
          className="flex font-semibold text-xl hover:font-bold hover:underline truncate"
        >
          {username.length > 0 ? username : "BTime User"}
        </Link>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex flex-row justify-center items-center">
          {hydrated ? (
            <Image
              src={avatarURL}
              alt="/C_logo.png"
              width={120}
              height={120}
              className="rounded-[50%] shadow-lg"
            />
          ) : (
            <LoadingSpinner />
          )}
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
