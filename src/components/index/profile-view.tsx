"use client";
import { useSession } from "@/context/session-context";
import { useEffect, useState } from "react";
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

/**
 * This component serves as a card-like summary of a user profile.
 */
export default function ProfileView() {
  const { user, loading } = useSession();
  const [username, setUsername] = useState<string>("Profile");
  const [avatarURL, setAvatarURL] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (user) {
      setUsername(user.userInfo.userName);
      setAvatarURL(user.userInfo.avatarURL);
    }
  }, [user, loading]);

  return (
    <Card className="flex flex-col rounded-lg p-2 bg-container-1 gap-1">
      <CardHeader className="flex flex-row justify-center items-center">
        <Link
          href="/profile"
          className="flex font-semibold text-xl hover:font-bold hover:underline"
        >
          {username}
        </Link>
      </CardHeader>
      <CardContent className="px-0">
        <div className="flex flex-row justify-center items-center">
            <Image
              src={avatarURL ? avatarURL : "/images/C_logo.png"}
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
