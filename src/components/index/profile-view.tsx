"use client";
import { useSession } from "@/context/sessionContext";
import { useEffect, useState } from "react";
import Image from "next/image";
import LoginButton from "@/components/common/login-button";
import LogoutButton from "../common/logout-button";
import Link from "next/link";

/**
 * This component serves as a card-like summary of a user profile.
 */
export default function ProfileView() {
  const { user, loading } = useSession();
  const [username, setUsername] = useState<string>("Profile");
  const [avatarURL, setAvatarURL] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (user) {
      setUsername(user.userName);
      setAvatarURL(user.avatarURL);
    }
  }, [user, loading]);

  return (
    <div className="flex flex-col rounded-lg shadow-lg p-2 bg-container-1 gap-1">
      <div className="flex flex-row justify-center items-center">
        <div>
        <Link
          href="/profile"
          className="flex font-semibold text-xl hover:font-bold hover:underline"
        >
          {username}
        </Link>
        </div>
      </div>
      <div className="flex flex-row justify-center items-center">
        <Image
          src={avatarURL ? avatarURL : "/images/C_logo.png"}
          alt="/images/C_logo.png"
          width="200"
          height="200"
          className="rounded-[50%] shadow-lg"
        />
      </div>
      {/* TODO - add more user info */}
      <div className="">
        {user ? (
          <LogoutButton className="px-1" size="sm" />
        ) : (
          <LoginButton className="px-1" size="sm" />
        )}
      </div>
    </div>
  );
}
