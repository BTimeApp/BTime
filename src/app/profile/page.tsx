"use client";
import Header from "@/components/common/header";
import LoginButton from "@/components/common/login-button";
import HomeHeaderContent from "@/components/index/home-header-content";
import { useSession } from "@/context/sessionContext";
import Image from "next/image";

/** TODO
 *    - find a good way to format this page
 *    - allow users to change certain things - username, etc
 *  
 */

export default function Page() {
  const { user: localUser } = useSession();

  let body = <></>;
  if (localUser) {
    body = (
      <div className="grid grid-cols-2 gap-2">
        <div>
            <Image src={localUser.avatarURL ? localUser.avatarURL : "/images/C_logo.png"} alt="/images/C_logo.png" width="200" height="200"/>
        </div>
        <div>
            <div>
                Username: {localUser.userName}
            </div>
            <div>
                Email: {localUser.email}
            </div>
            <div>
                WCAID: {localUser.wcaId ? localUser.wcaId : "None"}
            </div>
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
