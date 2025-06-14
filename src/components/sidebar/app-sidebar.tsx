"use client"

import * as React from "react"
import {
  IconFileDescription,
  IconHelp,
  IconHome,
  IconLibraryPlus,
  IconSettings,
} from "@tabler/icons-react"

import { NavMain } from "@/components/sidebar/nav-main"
import { NavUser } from "@/components/sidebar/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { useSession } from "@/hooks/useSession";

import ThemeToggle from "@/components/sidebar/theme-toggle"
const data = {
  navMain: [
    {
      title: "BTime",
      url: "/",
      icon: IconHome,
    },
    {
      title: "Create Room",
      url: "/create", //change this to /create
      icon: IconLibraryPlus,
    },
  ],
  
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: IconSettings,
    },
    {
      title: "About",
      url: "/about",
      icon: IconHelp,
    },
    {
      title: "Docs",
      url: "/docs",
      icon: IconFileDescription,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {

  // this will automatically try to log in and fetch a user.
  const { localUser, sessionLoading } = useSession();

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavMain items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
        <NavUser user={localUser} />
      </SidebarFooter>
    </Sidebar>
  )
}
