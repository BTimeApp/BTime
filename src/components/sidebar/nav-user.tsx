"use client";

import {
  IconCreditCard,
  IconDotsVertical,
  IconLogin,
  IconLogout,
  IconNotification,
  IconUserCircle,
} from "@tabler/icons-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { IUser } from "@/types/user";

const GUEST_ID: string = "guest-id";

const guestUserInfo: IUser = {
  id: GUEST_ID,
  userName: "Guest",
  name: "Guest User",
  email: "guest@btime.com",
  avatarURL: "/images/C_logo.png",
};

export function NavUser({ user }: { user: IUser | undefined }) {
  const { isMobile } = useSidebar();

  if (!user) {
    user = guestUserInfo;
  }

  function handleUserLogin() {
    if (!user || user.id === GUEST_ID) {
      // user not logged in. log in.
      window.location.href = `/auth/wca?redirect=${window.location.pathname}`;
    } else {
      // user logged in. log out
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatarURL} alt={user.name} />
                <AvatarFallback className="rounded-lg">.</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {user.email}
                </span>
              </div>
              <IconDotsVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatarURL} alt={user.name} />
                  <AvatarFallback className="rounded-lg">.</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <Link href="/profile">
                <DropdownMenuItem>
                  <IconUserCircle />
                  Account
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleUserLogin}
            >
              {user.id == GUEST_ID ? (
                <>
                  <IconLogin />
                  Log In
                </>
              ) : (
                <>
                  <IconLogout />
                  Log Out
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
