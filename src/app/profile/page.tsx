"use client";
import Header from "@/components/common/header";
import LoginButton from "@/components/common/login-button";
import LogoutButton from "@/components/common/logout-button";
import HomeHeaderContent from "@/components/index/home-header-content";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@/context/session-context";
import Image from "next/image";
import { useCallback, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";

/** TODO
 *    - find a good way to format this page (working on this -HC 8/25)
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
      <div className="flex flex-col md:flex-row justify-center items-center">
        <div className="flex-2 lg:pl-45 md:pl-0">
            <Card className="w-[300px] h-[350px] p-4">
              <h1 className="flex text-2xl font-semibold justify-center">{localUser.userName}</h1>
              {/* <CardHeader className="flex font-semibold text-2xl font-bold p-10 shadow-lg bg-blue">Avatar</CardHeader> */}
              <Image
                src={
                  localUser.avatarURL ? localUser.avatarURL : "/images/C_logo.png"
                }
                alt="/images/C_logo.png"
                width="350"
                height="350"
                className="p-10"
                />
            </Card>
        </div>
        <div className="flex-3 lg:p-40 md:p-20">
          <Card className=" flex w-[700px] h-[500px] p-8">
              <h1 className="flex font-semibold text-2xl whitespace-nowrap">Username</h1>
            <div className="flex">
                <Input
                  value={username}
                  placeholder={localUser.userName}
                  onChange={(event) => {
                    setUsername(event.target.value);
                  }}
                  className="flex w-full max-w-sm items-center"
                  // className={`${usernameFieldClass} border-2 w-100 h-12 my-2`}
                  >
                  </Input>
                    <Button
                  variant="primary"
                  size="sm"
                  className="text-xl font-bold p-5 mx-5"
                  onClick={() => {
                    submitProfileChanges();
                  }}
                  onSubmit={submitProfileChanges}
                >
                  Submit Changes
                </Button>
                                  

            </div>
            {usernameFieldError && <div className="text-xs text-error whitespace-nowrap">{usernameFieldError}</div>}
                <div className="flex">
                  <div className="mt-5">
                      <h1 className="flex font-semibold text-xl underline">Additional Information</h1>
                    <h1 className="flex font-semibold text-2xl mt-3 whitespace-nowrap">Email: {localUser.email}</h1>
                    <h1 className="flex font-semibold text-2xl mt-3 whitespace-nowrap">WCAID: {localUser.wcaId? localUser.wcaId : "No WCAID"}</h1>
                  </div>
            </div>
            <div className="mt-5 object-right-bottom relatve origin-bottom-right">
                  <LogoutButton className="text-xl text-red-500 font-bold bg-color-clear border-2 border-red-500 origin-bottom-right
                            hover:bg-color-clear hover:text-red-600  hover:scale-110 "/>
                  
                </div>
          </Card>
        </div>
      </div>
      
    )
      // <div className="grid grid-cols-2 gap-2">
      //   <div>
      //     <Card>
            
      //     </Card>
          
      //   </div>
        {/* <div className="p-3">
          <div className="flex flex-row items-center gap-2">
            <div>Username</div>
            <Input
              value={username}
              placeholder={localUser.userName}
              onChange={(event) => {
                setUsername(event.target.value);
              }}
              className={`${usernameFieldClass}`}
            ></Input>
          </div>
          {usernameFieldError && <div className="text-xs text-error">{usernameFieldError}</div>}
          <div>Email: {localUser.email}</div>
          <div>WCAID: {localUser.wcaId ? localUser.wcaId : "None"}</div>
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
          <LogoutButton></LogoutButton>
        </div> */}
      // </div>
    // );
  } else {
    body = (
      <div className="text-center text-3xl">
        <h1>You must be logged in to view your profile.</h1>
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
