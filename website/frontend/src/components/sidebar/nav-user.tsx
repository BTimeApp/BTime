"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useNavigate, useRouter } from "@tanstack/react-router";

export function NavUser() {
  const router = useRouter();
  const { authStore } = router.options.context;
  const user = authStore((s) => s.user);
  const navigate = useNavigate();

  function handleUserLogin() {
    if (!user || user.userInfo.isGuest) {
      // user not logged in. log in.
      window.location.href = `/auth/wca?redirect=${window.location.pathname}`;
    } else {
      // user logged in. go to profile
      navigate({
        to: "/profile",
      });
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          onClick={handleUserLogin}
        >
          <Avatar className="h-8 w-8 rounded-lg">
            <AvatarImage src={user ? user.userInfo.avatarURL : "/C_logo.png"} />
            <AvatarFallback className="rounded-lg" />
          </Avatar>

          <div className="grid flex-1 text-left text-sm leading-tight">
            {user && !user.userInfo.isGuest ? (
              <>
                <span className="truncate">{user.userInfo.userName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.userPrivateInfo.email}
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
