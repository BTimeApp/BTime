"use client";
import Header from "@/components/common/header";
import LoginButton from "@/components/common/login-button";
import HomeHeaderContent from "@/components/index/home-header-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/context/session-context";
import Image from "next/image";
import { useCallback, useState } from "react";

/** TODO
 *    - find a good way to format this page
 *
 */

export default function Page() {
  const { user: localUser, refresh } = useSession();
  const [username, setUsername] = useState<string>("");
  const [usernameFieldClass, setUsernameFieldClass] = useState<string>("");
  const [usernameFieldError, setUsernameFieldError] = useState<string>("");

  const submitProfileChanges = useCallback(async () => {
    const reqBody = {
      userName: username,
    };

    //API call
    const res = await fetch("/api/v0/me", {
      method: "PUT",
      body: JSON.stringify(reqBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    //expect the backend to use json
    const body = await res.json();

    //set field flash colors based on message
    if (!res.ok) {
      console.log(body.message);
      setUsernameFieldError(body.message);
      setUsernameFieldClass("border-error");
      return;
    } else {
      setUsernameFieldError("");
      setUsernameFieldClass("animate-flash-success");
      setTimeout(() => setUsernameFieldClass(""), 2000); // Clear after animation
    }

    //reset fillable fields
    setUsername("");

    //pulls new user data
    refresh();
  }, [username, refresh]);

  let body = <></>;
  if (localUser) {
    body = (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Image
            src={
              localUser.userInfo.avatarURL
                ? localUser.userInfo.avatarURL
                : "/images/C_logo.png"
            }
            alt="/images/C_logo.png"
            width="200"
            height="200"
          />
        </div>
        <div className="p-3">
          <div className="flex flex-row items-center gap-2">
            <div>Username</div>
            <Input
              value={username}
              placeholder={localUser.userInfo.userName}
              onChange={(event) => {
                setUsername(event.target.value);
              }}
              className={`${usernameFieldClass}`}
            ></Input>
          </div>
          {usernameFieldError && (
            <div className="text-xs text-error">{usernameFieldError}</div>
          )}
          <div>Email: {localUser.userPrivateInfo.email}</div>
          <div>
            WCAID:{" "}
            {localUser.userPrivateInfo.wcaId
              ? localUser.userPrivateInfo.wcaId
              : "None"}
          </div>
          <Button
            variant="primary"
            size="sm"
            className="text-xl font-bold"
            onClick={() => {
              submitProfileChanges();
            }}
          >
            Submit Changes
          </Button>
        </div>
      </div>
    );
  } else {
    body = (
      <div className="text-center">
        <div>You must be logged in to view your profile.</div>
        <LoginButton></LoginButton>
      </div>
    );
  }
  return (
    <div>
      <Header>
        <HomeHeaderContent />
      </Header>
      {body}
    </div>
  );
}
