"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useSession } from "@/context/session-context";
import { useEffect, useState } from "react";

export function NavUser() {
  const { user } = useSession();
  const [pathname, setPathName] = useState<string>("");

  useEffect(() => {
    setPathName(window.location.pathname);
  }, []);
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* <DropdownMenu> */}
        {/* <DropdownMenuTrigger asChild> */}
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          onClick={() => {
            if (user) {
              window.location.href = "/profile";
            } else {
              window.location.href = `/auth/wca?redirect=${pathname}`;
            }
          }}
        >
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={user ? user.avatarURL : "/images/C_logo.png"} />
            <AvatarFallback className="rounded-lg" />
          </Avatar>

          <div className="grid flex-1 text-left text-sm leading-tight">
            {user ? (
              <>
                <span className="truncate">{user.userName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </>
            ) : (
              <span className="truncate">Log in (WCA)</span>
            )}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
