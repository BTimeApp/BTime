import { Header, HeaderTitle } from "@/components/common/header";
import LoginButton from "@/components/common/login-button";
import PageWrapper from "@/components/common/page-wrapper";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

/** TODO
 * Format the page nicely
 */

function ProfilePage() {
  const router = useRouter();
  const { authStore } = router.options.context;

  const localUser = authStore((s) => s.user);
  const setUser = authStore((s) => s.setUser);
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
      toast.error(body.message);
      setUsernameFieldError(body.message);
      setUsernameFieldClass("border-error");
      return;
    } else {
      setUsernameFieldError("");
      setUsernameFieldClass("animate-flash-success");
      setTimeout(() => setUsernameFieldClass(""), 2000); // Clear after animation

      if (!body.updatedUser) {
        toast.warning(
          "Received invalid user from backend. Try refreshing the page."
        );
      } else {
        setUser(body.updatedUser);
      }
    }

    //reset fillable fields
    setUsername("");
  }, [setUser, username]);

  let body = <></>;
  if (localUser) {
    body = (
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2 p-4">
          <div className="flex flex-row justify-center">
            <Avatar className="h-40 w-40 rounded-[50%]">
              <AvatarImage
                src={localUser.userInfo.avatarURL ?? "/default_user.png"}
              />
              <AvatarFallback className="rounded-[50%]" />
            </Avatar>
          </div>
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
        <div className="flex flex-col h-full">
          {/* Add future stats, etc here */}
        </div>
      </div>
    );
  } else {
    body = (
      <div className="text-center">
        <div>You must be logged in to view your profile.</div>
        <LoginButton />
      </div>
    );
  }
  return (
    <PageWrapper>
      <Header>
        <HeaderTitle title="Profile" />
      </Header>
      {body}
    </PageWrapper>
  );
}
